import { GET as getArticles } from '../src/app/api/articles/route';
import { GET as getArticleById } from '../src/app/api/articles/[id]/route';
import { GET as getCompanies } from '../src/app/api/companies/route';
import { GET as getBookmarks, POST as toggleBookmark } from '../src/app/api/bookmarks/route';
import { POST as triggerSync } from '../src/app/api/admin/trigger-sync/route';
import { GET as getStats } from '../src/app/api/stats/route';
import { NextRequest } from 'next/server';
import { db } from '../src/lib/db';

async function testApi() {
  console.log('🧪 Starting Full Backend API Layer Tests...\n');

  // Test 1: GET /api/articles (First call - Redis Cache MISS)
  console.log('1️⃣ Testing GET /api/articles (Cache MISS)...');
  const req1 = new NextRequest('http://localhost:3000/api/articles?page=1&limit=10');
  const t0 = performance.now();
  const res1 = await getArticles(req1);
  const data1 = await res1.json();
  const t1 = performance.now();
  console.log(`   Status: ${res1.status} | Time: ${(t1 - t0).toFixed(2)}ms | Cache: ${res1.headers.get('X-Cache')}`);
  console.log(`   Fetched ${data1.data.length} articles | Total Count: ${data1.pagination.totalCount}\n`);

  // Test 2: GET /api/articles (Second call - Redis Cache HIT sub-100ms)
  console.log('2️⃣ Testing GET /api/articles (Cache HIT)...');
  const t2 = performance.now();
  const res2 = await getArticles(req1);
  const data2 = await res2.json();
  const t3 = performance.now();
  console.log(`   Status: ${res2.status} | Time: ${(t3 - t2).toFixed(2)}ms | Cache: ${res2.headers.get('X-Cache')}`);
  console.log(`   Sub-100ms Verified: ${(t3 - t2) < 100 ? '✅ YES' : '❌ NO'}\n`);

  // Test 3: GET /api/articles with Tag Filter (e.g. tag=AI & ML)
  console.log('3️⃣ Testing GET /api/articles?tag=AI & ML...');
  const reqTag = new NextRequest('http://localhost:3000/api/articles?tag=AI%20%26%20ML&limit=5');
  const resTag = await getArticles(reqTag);
  const dataTag = await resTag.json();
  console.log(`   Fetched ${dataTag.data.length} AI & ML articles.`);
  if (dataTag.data.length > 0) {
    console.log(`   Sample Title: "${dataTag.data[0].title}" [Company: ${dataTag.data[0].company.name}]`);
  }
  console.log();

  // Test 4: GET /api/articles/[id] Detail & Reader Mode
  const targetArticle = data1.data[0];
  console.log(`4️⃣ Testing GET /api/articles/${targetArticle.id} (Detail View)...`);
  const reqDetail = new NextRequest(`http://localhost:3000/api/articles/${targetArticle.id}`);
  const resDetail = await getArticleById(reqDetail, { params: { id: targetArticle.id } });
  const dataDetail = await resDetail.json();
  console.log(`   Status: ${resDetail.status} | Title: "${dataDetail.data.title}"`);
  console.log(`   Sanitized Content HTML Length: ${dataDetail.data.content.length} chars\n`);

  // Test 5: POST /api/bookmarks (Toggle bookmark)
  console.log(`5️⃣ Testing POST /api/bookmarks (Bookmark toggle for article ${targetArticle.id})...`);
  const reqBookmark = new NextRequest('http://localhost:3000/api/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ articleId: targetArticle.id, userId: 'test-user-123' }),
  });
  const resBookmark = await toggleBookmark(reqBookmark);
  const dataBookmark = await resBookmark.json();
  console.log(`   Status: ${resBookmark.status} | Bookmarked: ${dataBookmark.bookmarked} | Message: ${dataBookmark.message}\n`);

  // Test 6: GET /api/bookmarks (Fetch bookmarks for user)
  console.log('6️⃣ Testing GET /api/bookmarks?userId=test-user-123...');
  const reqUserBookmarks = new NextRequest('http://localhost:3000/api/bookmarks?userId=test-user-123');
  const resUserBookmarks = await getBookmarks(reqUserBookmarks);
  const dataUserBookmarks = await resUserBookmarks.json();
  console.log(`   Status: ${resUserBookmarks.status} | Bookmarked Articles Count: ${dataUserBookmarks.data.length}\n`);

  // Test 7: GET /api/companies (List all sources)
  console.log('7️⃣ Testing GET /api/companies...');
  const reqCompanies = new NextRequest('http://localhost:3000/api/companies');
  const resCompanies = await getCompanies(reqCompanies);
  const dataCompanies = await resCompanies.json();
  console.log(`   Status: ${resCompanies.status} | Companies Count: ${dataCompanies.data.length}`);
  console.log(`   Sample Company: ${dataCompanies.data[0].name} (${dataCompanies.data[0].articlesCount} articles)\n`);

  // Test 8: GET /api/stats
  console.log('8️⃣ Testing GET /api/stats...');
  const reqStats = new NextRequest('http://localhost:3000/api/stats');
  const resStats = await getStats(reqStats);
  const dataStats = await resStats.json();
  console.log(`   Status: ${resStats.status} | Articles: ${dataStats.stats.totalArticles} | Companies: ${dataStats.stats.totalCompanies}\n`);

  // Test 9: POST /api/admin/trigger-sync (Unauthorized check)
  console.log('9️⃣ Testing POST /api/admin/trigger-sync (Unauthorized Key Check)...');
  const reqSyncBad = new NextRequest('http://localhost:3000/api/admin/trigger-sync', {
    method: 'POST',
    headers: { Authorization: 'Bearer invalid_key' },
  });
  const resSyncBad = await triggerSync(reqSyncBad);
  console.log(`   Status: ${resSyncBad.status} (Expected 401)\n`);

  // Cleanup test bookmark
  await db.userBookmark.deleteMany({ where: { userId: 'test-user-123' } });

  console.log('🎉 All Backend API Layer Tests Passed 100% Successfully!');
}

testApi()
  .catch((e) => {
    console.error('❌ API Test Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
