import { extractTechTags } from '../src/lib/rss-parser';

const CASES: { name: string; title: string; body: string; has?: string[]; lacks?: string[] }[] = [
  {
    name: 'keywords inside other words do not match',
    title: 'How we maintain good detail in our algorithm',
    body: 'Maintain the rest of the good detail. Maintain it again. The algorithm is good. Therapist domain random.',
    lacks: ['AI & ML', 'Backend', 'Frontend'],
  },
  {
    name: 'ambiguous English words need their proper casing',
    title: 'What we rest on',
    body: 'We go there and go back. Take the rest and the rest of it. People react and react again. The swift, swift change.',
    lacks: ['Backend', 'Frontend', 'Mobile'],
  },
  {
    name: 'a keyword in the title is enough',
    title: 'Scaling Postgres at the edge',
    body: 'Nothing else relevant here.',
    has: ['Databases'],
  },
  {
    name: 'one passing body mention is not enough',
    title: 'Our new office',
    body: 'We also use Kubernetes somewhere.',
    has: ['Engineering'],
    lacks: ['Infrastructure'],
  },
  {
    name: 'two body mentions are enough, across keywords of the same tag',
    title: 'Our new office',
    body: 'We run Kubernetes and Terraform.',
    has: ['Infrastructure'],
  },
  {
    name: 'plurals and punctuated keywords match',
    title: 'Notes',
    body: 'Two databases and two databases and an API. More APIs, written in C++ and C++. Our CI/CD runs on CI/CD. Built on Node.js and node.js.',
    has: ['Databases', 'Backend', 'DevOps'],
  },
  {
    name: 'javascript does not count as java',
    title: 'Notes',
    body: 'JavaScript and more JavaScript.',
    has: ['Frontend'],
    lacks: ['Backend'],
  },
  {
    name: 'properly cased ambiguous words match',
    title: 'Rewriting a service in Go',
    body: 'We shipped AI features using AI models.',
    has: ['Backend', 'AI & ML'],
  },
];

let failures = 0;

for (const { name, title, body, has = [], lacks = [] } of CASES) {
  const tags = extractTechTags(title, body);
  const passed = has.every((tag) => tags.includes(tag)) && lacks.every((tag) => !tags.includes(tag));
  if (!passed) failures++;
  console.log(`${passed ? '✅' : '❌'} ${name}${passed ? '' : ` -> [${tags.join(', ')}]`}`);
}

console.log(`\n${CASES.length - failures}/${CASES.length} passed`);
process.exit(failures > 0 ? 1 : 0);
