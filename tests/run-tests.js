/**
 * Comprehensive Automated Academic Test Runner
 * Validates all 13 Functional Modules and Critical Business Rules
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';

const http = require('http');
const { startServer } = require('../app');
const { disconnectDB } = require('../config/db');

let serverInstance = null;
const BASE_URL = 'http://localhost:4001/api';

// Helper to make HTTP JSON requests
const apiRequest = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTestSuite = async () => {
  console.log('\n================================================================');
  console.log('🧪 RUNNING AUTOMATED ACADEMIC INTEGRATION & BUSINESS RULES TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}\n`);
      failed++;
    }
  };

  const assert = (condition, message) => {
    if (!condition) throw new Error(message || 'Assertion failed');
  };

  try {
    const booted = await startServer(4001);
    serverInstance = booted.server;

    let adminToken = '';
    let agentToken = '';
    let buyerToken = '';
    let createdPropertyId = '';
    let testEnquiryId = '';

    // ==========================================
    // MODULE 1: AUTHENTICATION & REGISTRATION
    // ==========================================
    console.log('--- [Module 1] User Registration & Authentication ---');

    await test('1. Login with valid Admin credentials returns JWT', async () => {
      const res = await apiRequest('POST', '/auth/login', {
        email: 'admin@realestate.com',
        password: 'Admin@123'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'Response success should be true');
      assert(res.body.data.token, 'Token must be present in response');
      assert(res.body.data.user.role === 'ADMIN', 'Role must be ADMIN');
      adminToken = res.body.data.token;
    });

    await test('2. Login with valid Agent credentials returns JWT', async () => {
      const res = await apiRequest('POST', '/auth/login', {
        email: 'agent.ravi@realestate.com',
        password: 'Agent@123'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      agentToken = res.body.data.token;
    });

    await test('3. Login with valid Buyer credentials returns JWT', async () => {
      const res = await apiRequest('POST', '/auth/login', {
        email: 'buyer.priya@gmail.com',
        password: 'Buyer@123'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      buyerToken = res.body.data.token;
    });

    await test('4. Register new buyer successfully', async () => {
      const randomEmail = `test.buyer.${Date.now()}@example.com`;
      const res = await apiRequest('POST', '/auth/register', {
        name: 'New Test Buyer',
        email: randomEmail,
        password: 'Password@123',
        role: 'BUYER'
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.body.data.user.email === randomEmail.toLowerCase(), 'Email matches');
    });

    await test('5. Registration blocks self-assignment of ADMIN role (Security Check)', async () => {
      const res = await apiRequest('POST', '/auth/register', {
        name: 'Hacker Admin',
        email: `hacker.${Date.now()}@example.com`,
        password: 'Password@123',
        role: 'ADMIN'
      });
      assert(res.status === 400 || res.status === 403, `Expected 400 or 403, got ${res.status}`);
      assert(res.body.success === false, 'Should fail');
    });

    await test('6. Accessing protected /auth/me without token returns 401', async () => {
      const res = await apiRequest('GET', '/auth/me');
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(res.body.errorCode === 'AUTH_REQUIRED', 'Error code must be AUTH_REQUIRED');
    });

    // ==========================================
    // MODULE 2 & 3: PROPERTY LISTING & VERIFICATION
    // ==========================================
    console.log('\n--- [Module 2 & 3] Property Management & Verification ---');

    await test('7. Buyer attempting to create property returns 403 (Role Authorization)', async () => {
      const res = await apiRequest(
        'POST',
        '/properties',
        {
          title: 'Illegal Buyer Listing',
          description: 'Desc',
          type: 'Apartment',
          listingType: 'SALE',
          price: 1000000,
          city: 'Bengaluru',
          locality: 'MG Road',
          area: 1200
        },
        buyerToken
      );
      assert(res.status === 403, `Expected 403, got ${res.status}`);
    });

    await test('8. Agent creating property starts as UNVERIFIED/PENDING by default', async () => {
      const res = await apiRequest(
        'POST',
        '/properties',
        {
          title: 'Automated Test Luxury Penthouse',
          description: 'Modern testing apartment with automated test validation runner.',
          type: 'Apartment',
          listingType: 'SALE',
          price: 15000000,
          city: 'Bengaluru',
          locality: 'Hebbal',
          bedrooms: 3,
          bathrooms: 3,
          area: 2100
        },
        agentToken
      );
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.body.data.property.isVerified === false, 'Must be unverified initially');
      assert(res.body.data.property.status === 'AVAILABLE', 'Status must be AVAILABLE');
      createdPropertyId = res.body.data.property._id;
    });

    await test('9. Unverified property does NOT appear in public search', async () => {
      const res = await apiRequest('GET', `/properties/search?city=Bengaluru&locality=Hebbal`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const found = res.body.data.properties.find((p) => p._id === createdPropertyId);
      assert(!found, 'Unverified property must NOT appear in public search');
    });

    await test('10. Admin verifies property (PENDING -> VERIFIED)', async () => {
      const res = await apiRequest(
        'PUT',
        `/properties/${createdPropertyId}/verify`,
        { status: 'VERIFIED' },
        adminToken
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.property.isVerified === true, 'Property should now be verified');
    });

    await test('11. Verifying already verified property returns 409 Conflict', async () => {
      const res = await apiRequest(
        'PUT',
        `/properties/${createdPropertyId}/verify`,
        { status: 'VERIFIED' },
        adminToken
      );
      assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
      assert(res.body.errorCode === 'INVALID_TRANSITION', 'Error code must be INVALID_TRANSITION');
    });

    await test('12. Verified property now appears in public search', async () => {
      const res = await apiRequest('GET', `/properties/search?city=Bengaluru&locality=Hebbal`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const found = res.body.data.properties.find((p) => p._id === createdPropertyId);
      assert(found, 'Verified property must appear in public search');
    });

    // ==========================================
    // MODULE 4: SEARCH & FILTERING
    // ==========================================
    console.log('\n--- [Module 4] Advanced Search & Filtering ---');

    await test('13. Filter properties by city, maxPrice, bedrooms', async () => {
      const res = await apiRequest(
        'GET',
        `/properties/search?city=Bengaluru&maxPrice=50000000&bedrooms=2`
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.properties), 'Properties must be an array');
      assert(res.body.data.properties.length > 0, 'Should find at least 1 matching property');
    });

    // ==========================================
    // MODULE 5: FAVOURITES
    // ==========================================
    console.log('\n--- [Module 5] Favourites / Saved Properties ---');

    await test('14. Buyer saves property to favourites', async () => {
      const res = await apiRequest('POST', `/favourites/${createdPropertyId}`, {}, buyerToken);
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.body.success === true, 'Success must be true');
    });

    await test('15. Saving duplicate favourite returns 409 Conflict', async () => {
      const res = await apiRequest('POST', `/favourites/${createdPropertyId}`, {}, buyerToken);
      assert(res.status === 409, `Expected 409, got ${res.status}`);
      assert(res.body.errorCode === 'DUPLICATE_FAVOURITE', 'Error code must be DUPLICATE_FAVOURITE');
    });

    // ==========================================
    // MODULE 6 & 7: ENQUIRIES & LEAD MANAGEMENT
    // ==========================================
    console.log('\n--- [Module 6 & 7] Enquiries & Lead State Machine ---');

    await test('16. Buyer submits enquiry for verified property', async () => {
      const res = await apiRequest(
        'POST',
        '/enquiries',
        {
          propertyId: createdPropertyId,
          message: 'Hello, I would like to schedule a virtual tour of this Hebbal penthouse.'
        },
        buyerToken
      );
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      assert(res.body.data.enquiry.status === 'NEW', 'Status must be NEW');
      testEnquiryId = res.body.data.enquiry._id;
    });

    await test('17. Agent views received enquiries (Leads)', async () => {
      const res = await apiRequest('GET', '/enquiries/agent', null, agentToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const found = res.body.data.enquiries.find((e) => e._id === testEnquiryId);
      assert(found, 'Created enquiry should appear in agent leads');
    });

    await test('18. Valid enquiry status transition: NEW -> CONTACTED', async () => {
      const res = await apiRequest(
        'PUT',
        `/enquiries/${testEnquiryId}/status`,
        { status: 'CONTACTED', remarks: 'Called buyer, scheduled walkthrough' },
        agentToken
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.enquiry.status === 'CONTACTED', 'Status must be CONTACTED');
    });

    await test('19. Invalid enquiry transition: CONTACTED -> CLOSED returns 409 Conflict', async () => {
      const res = await apiRequest(
        'PUT',
        `/enquiries/${testEnquiryId}/status`,
        { status: 'CLOSED' },
        agentToken
      );
      assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
      assert(res.body.errorCode === 'INVALID_STATUS_TRANSITION', 'Expected INVALID_STATUS_TRANSITION');
    });

    await test('20. Valid transition sequence: CONTACTED -> APPROVED -> CLOSED', async () => {
      const step1 = await apiRequest(
        'PUT',
        `/enquiries/${testEnquiryId}/status`,
        { status: 'APPROVED' },
        agentToken
      );
      assert(step1.status === 200, 'CONTACTED -> APPROVED must succeed');

      const step2 = await apiRequest(
        'PUT',
        `/enquiries/${testEnquiryId}/status`,
        { status: 'CLOSED' },
        agentToken
      );
      assert(step2.status === 200, 'APPROVED -> CLOSED must succeed');
    });

    // ==========================================
    // MODULE 8: PROPERTY STATUS TRACKING
    // ==========================================
    console.log('\n--- [Module 8] Property Status State Machine ---');

    await test('21. Valid transition: AVAILABLE -> UNDER_NEGOTIATION -> SOLD', async () => {
      const res1 = await apiRequest(
        'PUT',
        `/properties/${createdPropertyId}/status`,
        { status: 'UNDER_NEGOTIATION' },
        agentToken
      );
      assert(res1.status === 200, `Expected 200, got ${res1.status}`);

      const res2 = await apiRequest(
        'PUT',
        `/properties/${createdPropertyId}/status`,
        { status: 'SOLD' },
        agentToken
      );
      assert(res2.status === 200, `Expected 200, got ${res2.status}`);
    });

    await test('22. Agent attempting SOLD -> AVAILABLE returns 409 Conflict', async () => {
      const res = await apiRequest(
        'PUT',
        `/properties/${createdPropertyId}/status`,
        { status: 'AVAILABLE' },
        agentToken
      );
      assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
      assert(res.body.errorCode === 'INVALID_STATUS_TRANSITION', 'Expected INVALID_STATUS_TRANSITION');
    });

    // ==========================================
    // MODULE 9 - 12: AGENTS, CITIES, ADMIN REPORTS
    // ==========================================
    console.log('\n--- [Module 9-12] Ratings, Cities & Analytics ---');

    await test('23. Location groupings GET /properties/cities returns counts', async () => {
      const res = await apiRequest('GET', '/properties/cities');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.cities), 'Cities array expected');
      assert(res.body.data.cities.length > 0, 'At least 1 city grouped');
    });

    await test('24. Admin Summary Report GET /admin/reports/summary', async () => {
      const res = await apiRequest('GET', '/admin/reports/summary', null, adminToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.data.users.total > 0, 'Users count > 0');
      assert(res.body.data.properties.total > 0, 'Properties count > 0');
      assert(res.body.data.enquiries.total > 0, 'Enquiries count > 0');
    });

    await test('25. Non-admin attempting to access Admin reports returns 403', async () => {
      const res = await apiRequest('GET', '/admin/reports/summary', null, buyerToken);
      assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
    });

    await test('26. Invalid ObjectId parameter returns 404 CastError', async () => {
      const res = await apiRequest('GET', '/properties/not-a-valid-mongo-id');
      assert(res.status === 400 || res.status === 404, `Expected 400/404, got ${res.status}`);
    });

    console.log('\n================================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
    console.log('================================================================\n');

    if (serverInstance) {
      serverInstance.close();
    }
    await disconnectDB();

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test runner error:', err);
    if (serverInstance) serverInstance.close();
    await disconnectDB();
    process.exit(1);
  }
};

runTestSuite();
