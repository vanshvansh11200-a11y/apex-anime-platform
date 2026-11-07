// APEX API Automated Test Suite
const assert = require('assert');
const http = require('http');
const { app, startServer } = require('../server/index');
const db = require('../server/database/db');

async function runTests() {
  console.log('⚡ Starting APEX API Test Suite...\n');
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await test('GET /api/health returns status online', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'online');
    assert.strictEqual(data.platform, 'APEX Anime Streaming Platform');
  });

  // 2. Public Anime Catalog
  await test('GET /api/anime returns catalog items and pagination', async () => {
    const res = await fetch(`${baseUrl}/api/anime?limit=5`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(Array.isArray(data.items));
    assert(data.items.length > 0);
  });

  // 3. User Login
  let adminToken = '';
  await test('POST /api/auth/login authenticates default admin', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@apex.stream',
        password: 'Admin123!'
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.token);
    assert.strictEqual(data.user.role, 'admin');
    adminToken = data.token;
  });

  // 4. Admin Stats (Protected Route)
  await test('GET /api/admin/stats returns statistics when authenticated as admin', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert(data.stats.totalAnime > 0);
    assert(data.stats.totalUsers > 0);
  });

  // 5. Protected Route Guard (Rejection when unauthenticated)
  await test('GET /api/admin/stats rejects unauthenticated request with 401/403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`);
    assert(res.status === 401 || res.status === 403);
  });

  // 6. User Watchlist Flow
  await test('POST /api/watchlist and GET /api/watchlist works for authenticated user', async () => {
    // Login demo user
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'user@apex.stream',
        password: 'User123!'
      })
    });
    const { token } = await loginRes.json();
    const firstAnime = db.data.anime[0];

    // Add to watchlist
    const addRes = await fetch(`${baseUrl}/api/watchlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        anime_id: firstAnime.id,
        status: 'watching'
      })
    });
    assert.strictEqual(addRes.status, 200);

    // Get watchlist
    const getRes = await fetch(`${baseUrl}/api/watchlist`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(getRes.status, 200);
    const getJson = await getRes.json();
    assert(getJson.items.some(i => i.anime_id === firstAnime.id));
  });

  // 7. Sitemap & Robots
  await test('GET /sitemap.xml and /robots.txt return valid SEO headers', async () => {
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    assert.strictEqual(sitemapRes.status, 200);
    assert(sitemapRes.headers.get('content-type').includes('xml'));

    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    assert.strictEqual(robotsRes.status, 200);
  });

  server.close();
  console.log(`\n========================================`);
  console.log(`Tests Completed: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
