import http from 'http';
import { AddressInfo } from 'net';
import { db } from '../src/lib/db';
import { syncFeedAlerts } from '../src/lib/feed-alerts';

// Uses a stand-in for the GitHub API and temporary blogs, so no real issues or feeds are touched
const RUN = Date.now().toString(36);
const SLUG_A = `test-alerts-a-${RUN}`;
const SLUG_B = `test-alerts-b-${RUN}`;

interface FakeIssue { number: number; title: string; body: string; labels: string[]; state: string; comments: string[] }
const issues: FakeIssue[] = [];
const requests: { method: string; path: string; auth?: string }[] = [];
let failRequests = false;

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    requests.push({ method: req.method!, path: req.url!, auth: req.headers.authorization });
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (failRequests) return send(500, { message: 'boom' });

    const url = new URL(req.url!, 'http://x');
    const match = url.pathname.match(/^\/repos\/owner\/repo\/issues(?:\/(\d+))?(\/comments)?$/);
    if (!match) return send(404, {});
    const body = raw ? JSON.parse(raw) : {};
    const issue = match[1] ? issues.find((i) => i.number === Number(match[1])) : undefined;

    if (req.method === 'GET' && !match[1]) {
      const label = url.searchParams.get('labels');
      return send(200, issues.filter((i) => i.state === 'open' && (!label || i.labels.includes(label))));
    }
    if (req.method === 'POST' && !match[1]) {
      const created = { number: issues.length + 1, title: body.title, body: body.body, labels: body.labels, state: 'open', comments: [] };
      issues.push(created);
      return send(201, created);
    }
    if (req.method === 'POST' && issue && match[2]) {
      issue.comments.push(body.body);
      return send(201, {});
    }
    if (req.method === 'PATCH' && issue) {
      issue.state = body.state;
      return send(200, issue);
    }
    send(404, {});
  });
});

let failures = 0;

function check(name: string, passed: boolean, detail?: unknown) {
  if (!passed) failures++;
  console.log(`${passed ? '✅' : '❌'} ${name}${passed ? '' : ` -> ${JSON.stringify(detail)}`}`);
}

async function main() {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const env = { GITHUB_API_URL: `http://127.0.0.1:${port}`, GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'test-token' };
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));

  const make = (slug: string, feedStatus: 'BROKEN' | 'ACTIVE') =>
    db.company.create({
      data: {
        name: `Alerts ${slug}`,
        slug,
        rssUrl: `https://test-alerts.invalid/${slug}`,
        websiteUrl: 'https://test-alerts.invalid',
        category: 'Test',
        feedStatus,
        consecutiveFailures: feedStatus === 'BROKEN' ? 5 : 0,
        lastError: feedStatus === 'BROKEN' ? 'HTTP 404 Not Found' : null,
      },
    });
  const a = await make(SLUG_A, 'BROKEN');
  const b = await make(SLUG_B, 'ACTIVE');
  const run = () => syncFeedAlerts({ slugs: [SLUG_A, SLUG_B] });

  try {
    for (const key of Object.keys(env)) delete process.env[key];
    check('without GitHub credentials, alerts are skipped', (await run()).skippedBecause === 'GITHUB_TOKEN or GITHUB_REPOSITORY is not set');

    Object.assign(process.env, env);
    // An unrelated issue with the same label but no marker must be left alone
    issues.push({ number: 99, title: 'Something else', body: 'no marker here', labels: ['broken-feed'], state: 'open', comments: [] });
    issues.splice(0, issues.length - 1);

    let result = await run();
    const opened = issues.find((i) => i.title === `Feed broken: Alerts ${SLUG_A}`);
    check('a broken feed opens one issue', result.opened.length === 1 && !!opened && opened.state === 'open', result);
    check('the issue has the broken-feed label, the error and a way to fix it', !!opened && opened.labels.includes('broken-feed') && opened.body.includes('HTTP 404 Not Found') && opened.body.includes('sources.yaml'));
    check('requests carry the token', requests.every((r) => r.auth === 'Bearer test-token'));
    check('an active feed opens nothing', !issues.some((i) => i.title.includes(SLUG_B)));

    result = await run();
    check('running again does not open a duplicate', result.opened.length === 0 && issues.filter((i) => i.title.includes(SLUG_A)).length === 1, result);

    await db.company.update({ where: { id: a.id }, data: { feedStatus: 'ACTIVE', consecutiveFailures: 0 } });
    result = await run();
    check('a recovered feed closes its issue with a comment', result.closed.length === 1 && opened?.state === 'closed' && !!opened?.comments[0]?.includes('working again'), { result, opened });
    check('an unrelated issue with the same label is left open', issues.find((i) => i.number === 99)?.state === 'open');

    await db.company.update({ where: { id: b.id }, data: { feedStatus: 'BROKEN', consecutiveFailures: 5 } });
    await run();
    await db.company.update({ where: { id: b.id }, data: { feedStatus: 'RETIRED' } });
    result = await run();
    const issueB = issues.find((i) => i.title.includes(SLUG_B));
    check('retiring a broken blog closes its issue', result.closed.length === 1 && issueB?.state === 'closed' && !!issueB?.comments[0]?.includes('retired'), { result, issueB });

    failRequests = true;
    let threw = false;
    await run().catch(() => (threw = true));
    check('a GitHub error is reported to the caller, which logs it without failing the sync', threw);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await db.company.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
    server.close();
  }

  console.log(failures === 0 ? '\n✅ All feed alert checks passed' : `\n❌ ${failures} feed alert checks failed`);
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e);
    failures++;
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(failures > 0 ? 1 : 0);
  });
