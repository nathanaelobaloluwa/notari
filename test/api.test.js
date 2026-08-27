/**
 * NOTARI API Smoke & Functional Test Suite
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

function request(method, requestPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(requestPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function requestMultipart(method, requestPath, fields = {}, files = {}, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(requestPath, BASE_URL);
    const boundary = '----FormBoundary' + Date.now();
    const chunks = [];

    for (const [key, value] of Object.entries(fields)) {
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
    }

    for (const [fieldName, filePath] of Object.entries(files)) {
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: image/png\r\n\r\n`));
      chunks.push(fileBuffer);
      chunks.push(Buffer.from('\r\n'));
    }

    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    const bodyBuffer = Buffer.concat(chunks);

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting NOTARI Automated Test Suite ---');
  let adminToken = null;
  let createdEventId = null;
  let testPassCount = 0;
  let testTotal = 0;

  const uniqueSuffix = Date.now().toString(36);
  const testUsername1 = `test_club_exec_${uniqueSuffix}`;
  const testUsername2 = `test_club_exec_2_${uniqueSuffix}`;
  const testUsername3 = `test_club_exec_noref_${uniqueSuffix}`;

  function assert(condition, message) {
    testTotal++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      testPassCount++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  try {
    // Create dummy files for upload tests
    const flyerPath = path.join(__dirname, 'test-flyer.png');
    const identificationPath = path.join(__dirname, 'test-identification.png');
    fs.writeFileSync(flyerPath, Buffer.from('fake-png-content'));
    fs.writeFileSync(identificationPath, Buffer.from('fake-id-png-content'));

    // 1. Health Check
    console.log('\n[1] Testing Health Endpoint...');
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health returned 200 OK');

    // 2. Admin Login
    console.log('\n[2] Testing Admin Login...');
    const loginRes = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'notari2026'
    });
    assert(loginRes.status === 200 && Boolean(loginRes.data.token), 'POST /api/auth/login returns JWT token');
    adminToken = loginRes.data.token;

    // 3. Admin Auth Verification
    console.log('\n[3] Testing Admin Auth Check...');
    const meRes = await request('GET', '/api/auth/me', null, adminToken);
     assert(meRes.status === 200 && meRes.data.admin.username === 'admin', 'GET /api/auth/me verifies valid token');
     assert(meRes.data.admin.status === 'approved' && meRes.data.admin.role === 'superadmin', 'Seeded admin has status=approved, role=superadmin');

    // 4. List My Events
    console.log('\n[4] Testing GET /api/events/mine...');
    const myEventsRes = await request('GET', '/api/events/mine', null, adminToken);
    assert(myEventsRes.status === 200 && Array.isArray(myEventsRes.data.events), 'GET /api/events/mine returned events array');

    // 5. Create Event with flyer (Admin)
    console.log('\n[5] Testing POST /api/events (Create Event with flyer)...');
    const createRes = await requestMultipart('POST', '/api/events', {
      eventName: "Cybersecurity Capture the Flag & Red Team Drill",
      organizer: "InfoSec Student Society",
      faculty: "Engineering",
      date: new Date(Date.now() + 86400000 * 2).toISOString(),
      venue: "Cyber Range Lab, Turing Hall 204",
      description: "Hands-on jeopardy-style CTF challenge covering web exploitation, cryptography, and reverse engineering.",
      contact: "infosec@campus.edu",
      capacity: "2"
    }, { flyer: flyerPath }, adminToken);
    assert(createRes.status === 201 && createRes.data.event && createRes.data.event.eventName === "Cybersecurity Capture the Flag & Red Team Drill", 'POST /api/events created event successfully');
    assert(typeof createRes.data.event.flyerUrl === 'string' && createRes.data.event.flyerUrl.startsWith('/api/uploads/flyer/'), 'Created event flyerUrl is a database upload API URL');
    const flyerGetRes = await request('GET', createRes.data.event.flyerUrl);
    assert(flyerGetRes.status === 200, 'Flyer image is retrievable via /api/uploads/flyer/:id');
    createdEventId = createRes.data.event._id;

    // 6. Get Single Event
    console.log('\n[6] Testing GET /api/events/:id...');
    const singleRes = await request('GET', `/api/events/${createdEventId}`);
    assert(singleRes.status === 200 && singleRes.data.event._id === createdEventId, 'GET /api/events/:id retrieved correct event');

    // 7. Update Event
    console.log('\n[7] Testing PUT /api/events/:id (Update Event)...');
    const updateRes = await request('PUT', `/api/events/${createdEventId}`, {
      venue: "Main Cyber Auditorium, Turing Hall"
    }, adminToken);
    assert(updateRes.status === 200 && updateRes.data.event.venue === "Main Cyber Auditorium, Turing Hall", 'PUT /api/events/:id updated venue');

    // 7b. Edit event without re-uploading flyer preserves flyerUrl
    console.log('\n[7b] Testing PUT /api/events/:id preserves flyerUrl without re-upload...');
    const updateNoFlyerRes = await request('PUT', `/api/events/${createdEventId}`, {
      eventName: "Updated CTF Name"
    }, adminToken);
    assert(updateNoFlyerRes.status === 200 && Boolean(updateNoFlyerRes.data.event.flyerUrl), 'PUT /api/events/:id preserves existing flyerUrl when no new flyer uploaded');

    // 8. Register Seat #1 (Attendee 1)
    console.log('\n[8] Testing POST /api/events/:id/register (First Seat)...');
    const reg1Res = await request('POST', `/api/events/${createdEventId}/register`, {
      name: "Sam Altman",
      email: "saltman@campus.edu"
    });
    assert(reg1Res.status === 200 && reg1Res.data.status === 'confirmed' && reg1Res.data.ticket.ticketCode.startsWith('NTR-'), 'Seat #1 booked, ticketCode returned');

    // 9. Register Seat #2 (Attendee 2 - Reaches Capacity 2/2)
    console.log('\n[9] Testing POST /api/events/:id/register (Second Seat - Fills Capacity)...');
    const reg2Res = await request('POST', `/api/events/${createdEventId}/register`, {
      name: "Ada Lovelace",
      email: "alovelace@campus.edu"
    });
    assert(reg2Res.status === 200 && reg2Res.data.status === 'confirmed' && reg2Res.data.seatsLeft === 0, 'Seat #2 booked, capacity reached (0 seats left)');

    // 10. Capacity Overflow Test (Attendee 3 - Should fail with "Event full — join the waitlist")
    console.log('\n[10] Testing Event Full Rejection...');
    const reg3Res = await request('POST', `/api/events/${createdEventId}/register`, {
      name: "Alan Turing",
      email: "aturing@campus.edu"
    });
    assert(reg3Res.status === 400 && reg3Res.data.status === 'full', 'Registration rejected when full with proper fallback message');

    // 11. Join Waitlist
    console.log('\n[11] Testing Joining Waitlist for Full Event...');
    const waitlistRes = await request('POST', `/api/events/${createdEventId}/register`, {
      name: "Alan Turing",
      email: "aturing@campus.edu",
      joinWaitlist: true
    });
    assert(waitlistRes.status === 200 && waitlistRes.data.status === 'waitlisted', 'Student successfully joined event waitlist');

    // 12. View Attendees Roster
    console.log('\n[12] Testing GET /api/events/:id/attendees (Roster view)...');
    const rosterRes = await request('GET', `/api/events/${createdEventId}/attendees`, null, adminToken);
    assert(rosterRes.status === 200 && rosterRes.data.attendees.length === 2 && rosterRes.data.waitlist.length === 1, 'Roster returned 2 confirmed attendees and 1 waitlisted');

    // 13. Delete Event
    console.log('\n[13] Testing DELETE /api/events/:id...');
    const deleteRes = await request('DELETE', `/api/events/${createdEventId}`, null, adminToken);
    assert(deleteRes.status === 200, 'DELETE /api/events/:id unpinned event');

    // 14. Admin Signup with identification (creates a pending request)
    console.log('\n[14] Testing POST /api/auth/signup with identification...');
    const signupRes = await requestMultipart('POST', '/api/auth/signup', {
      username: testUsername1,
      password: 'testpass123',
      email: `testexec_${uniqueSuffix}@campus.edu`,
      clubName: 'Test Club'
    }, { identification: identificationPath });
    assert(signupRes.status === 201 && signupRes.data.admin.status === 'pending' && signupRes.data.admin.role === 'admin', 'POST /api/auth/signup created pending admin with identification');

    // 15. Admin Signup without identification fails
    console.log('\n[15] Testing POST /api/auth/signup without identification...');
    const signupNoIdRes = await request('POST', '/api/auth/signup', {
      username: testUsername3,
      password: 'testpass123',
      email: `testexecnoref_${uniqueSuffix}@campus.edu`,
      clubName: 'Test Club No Id'
    });
    assert(signupNoIdRes.status === 400 && signupNoIdRes.data.error === 'An identification image is required to request admin access.', 'POST /api/auth/signup fails without identification');

    // 16. Pending admin cannot login (should get 403 with pending approval message)
    console.log('\n[16] Testing Login Rejection for Pending admin...');
    const pendingLoginRes = await request('POST', '/api/auth/login', {
      username: testUsername1,
      password: 'testpass123'
    });
    assert(pendingLoginRes.status === 403 && pendingLoginRes.data.error === 'pending approval', 'Login rejected for pending admin with clear message');

    // 17. Superadmin lists pending requests
    console.log('\n[17] Testing GET /api/admin/pending-requests (Superadmin)...');
    const pendingRes = await request('GET', '/api/admin/pending-requests', null, adminToken);
    assert(pendingRes.status === 200 && Array.isArray(pendingRes.data.requests), 'Superadmin can list pending requests');

    let testAdminId = null;
    if (pendingRes.data.requests.length > 0) {
      const found = pendingRes.data.requests.find(r => r.username === testUsername1);
      testAdminId = found ? found._id : null;
    }
    assert(testAdminId !== null, `Pending request for ${testUsername1} found in list`);

    // 17b. Superadmin gets pending-request count (must match the list)
    console.log('\n[17b] Testing GET /api/admin-requests/count (Superadmin)...');
    const countRes = await request('GET', '/api/admin-requests/count', null, adminToken);
    assert(countRes.status === 200 && typeof countRes.data.pending === 'number' && countRes.data.pending === pendingRes.data.requests.length, 'Superadmin gets pending count matching the requests list');

    // 18. Superadmin approves the pending admin
    console.log('\n[18] Testing PATCH /api/admin/requests/:id/approve...');
    const approveRes = await request('PATCH', `/api/admin/requests/${testAdminId}/approve`, null, adminToken);
    assert(approveRes.status === 200 && approveRes.data.message.includes('approved'), 'Superadmin approved pending admin request');

    // 19. Approved admin can now login
    console.log('\n[19] Testing Login for Approved admin...');
    const approvedLoginRes = await request('POST', '/api/auth/login', {
      username: testUsername1,
      password: 'testpass123'
    });
    assert(approvedLoginRes.status === 200 && Boolean(approvedLoginRes.data.token), 'Previously pending admin can now log in after approval');

    // 20. Admin only sees their own events via /api/events/mine
    console.log('\n[20] Testing GET /api/events/mine scoping...');
    const myEventsAfterRes = await request('GET', '/api/events/mine', null, approvedLoginRes.data.token);
    assert(myEventsAfterRes.status === 200 && Array.isArray(myEventsAfterRes.data.events), 'Regular admin can load their own events via /api/events/mine');

    // 21. Admin creates their own event
    console.log('\n[21] Testing regular admin creates event...');
    const adminCreateRes = await requestMultipart('POST', '/api/events', {
      eventName: "Regular Admin Event",
      organizer: "Test Club",
      faculty: "General",
      date: new Date(Date.now() + 86400000 * 3).toISOString(),
      venue: "Test Venue",
      description: "Test event",
      contact: "test@test.com",
      capacity: "10"
    }, { flyer: flyerPath }, approvedLoginRes.data.token);
    assert(adminCreateRes.status === 201 && adminCreateRes.data.event.createdBy !== undefined, 'Regular admin created event with createdBy');

    // 22. Admin cannot edit another admin's event (403)
    console.log('\n[22] Testing admin edit/delete authorization...');
    const superadminEventRes = await requestMultipart('POST', '/api/events', {
      eventName: "Superadmin Event",
      organizer: "Superadmin Club",
      faculty: "General",
      date: new Date(Date.now() + 86400000 * 4).toISOString(),
      venue: "Super Venue",
      description: "Super event",
      contact: "super@test.com",
      capacity: "5"
    }, { flyer: flyerPath }, adminToken);
    const superadminEventId = superadminEventRes.data.event._id;

    const unauthorizedUpdate = await request('PUT', `/api/events/${superadminEventId}`, {
      venue: "Hacked Venue"
    }, approvedLoginRes.data.token);
    assert(unauthorizedUpdate.status === 403, 'Regular admin gets 403 editing superadmin event');

    const unauthorizedDelete = await request('DELETE', `/api/events/${superadminEventId}`, null, approvedLoginRes.data.token);
    assert(unauthorizedDelete.status === 403, 'Regular admin gets 403 deleting superadmin event');

    // 23. Superadmin can edit/delete any event
    console.log('\n[23] Testing superadmin override...');
    const superUpdate = await request('PUT', `/api/events/${superadminEventId}`, {
      venue: "Superadmin Updated Venue"
    }, adminToken);
    assert(superUpdate.status === 200, 'Superadmin can edit any event');

    const superDelete = await request('DELETE', `/api/events/${superadminEventId}`, null, adminToken);
    assert(superDelete.status === 200, 'Superadmin can delete any event');

    // 23b. Superadmin can delete an event created by a DIFFERENT (regular) admin
    console.log('\n[23b] Testing superadmin deletes another admin\'s event...');
    const otherAdminEventRes = await requestMultipart('POST', '/api/events', {
      eventName: "Other Admin's Event",
      organizer: "Test Club",
      faculty: "General",
      date: new Date(Date.now() + 86400000 * 6).toISOString(),
      venue: "Other Venue",
      description: "Event owned by a regular admin",
      contact: "other@test.com",
      capacity: "5"
    }, { flyer: flyerPath }, approvedLoginRes.data.token);
    assert(otherAdminEventRes.status === 201 && otherAdminEventRes.data.event, 'Regular admin created an owned event for cross-admin delete test');

    const otherAdminEventId = otherAdminEventRes.data.event._id;
    const superDeleteOther = await request('DELETE', `/api/events/${otherAdminEventId}`, null, adminToken);
    assert(superDeleteOther.status === 200, 'Superadmin can delete an event created by a different admin');

    // 24. Signup a second admin to test rejection
    console.log('\n[24] Testing POST /api/auth/signup + reject workflow...');
    const signupRes2 = await requestMultipart('POST', '/api/auth/signup', {
      username: testUsername2,
      password: 'testpass456',
      email: `testexec2_${uniqueSuffix}@campus.edu`,
      clubName: 'Another Test Club'
    }, { identification: identificationPath });
    assert(signupRes2.status === 201, 'Second signup request created');

    const pendingRes2 = await request('GET', '/api/admin/pending-requests', null, adminToken);
    const found2 = pendingRes2.data.requests.find(r => r.username === testUsername2);
    const testAdminId2 = found2 ? found2._id : null;
    assert(testAdminId2 !== null, 'Second pending request found');

    // 25. Superadmin rejects the second pending admin
    console.log('\n[25] Testing PATCH /api/admin/requests/:id/reject...');
    const rejectRes = await request('PATCH', `/api/admin/requests/${testAdminId2}/reject`, null, adminToken);
    assert(rejectRes.status === 200 && rejectRes.data.admin.status === 'rejected', 'Superadmin rejected pending admin request (status set to rejected)');

    // 25b. REGRESSION: reject must succeed for a pending admin WITHOUT identificationUrl
    // (previously threw 500 because identificationUrl was `required` in the schema).
    try {
      const mongoose = require('mongoose');
      require('dotenv').config();
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
      }
      const Admin = require('../server/models/Admin');
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('testpass123', salt);
      const legacyAdmin = await Admin.create({
        username: `legacy_no_id_${uniqueSuffix}`,
        passwordHash: hash,
        email: `legacy_${uniqueSuffix}@campus.edu`,
        status: 'pending'
        // intentionally omit identificationUrl to reproduce the legacy-doc case
      });

      const legacyReject = await request('PATCH', `/api/admin/requests/${legacyAdmin._id}/reject`, null, adminToken);
      assert(legacyReject.status === 200 && legacyReject.data.admin.status === 'rejected', 'Superadmin can reject a pending admin without identificationUrl (no 500)');

      await Admin.deleteOne({ _id: legacyAdmin._id });
      await mongoose.disconnect();
    } catch (e) {
      console.error('[25b] Regression test error:', e.message);
      assert(false, 'Reject-without-identificationUrl regression test executed without throwing');
    }

    // 26. Rejected admin cannot login
    console.log('\n[26] Testing Login Rejection for Rejected admin...');
    const rejectedLoginRes = await request('POST', '/api/auth/login', {
      username: testUsername2,
      password: 'testpass456'
    });
    assert(rejectedLoginRes.status === 403 && rejectedLoginRes.data.error === 'Account rejected', 'Login rejected for rejected admin');

    // 27. Non-superadmin cannot access pending-requests
    console.log('\n[27] Testing Non-superadmin Access Denied...');
    const restrictedRes = await request('GET', '/api/admin/pending-requests', null, approvedLoginRes.data.token);
    assert(restrictedRes.status === 403, 'Non-superadmin (role=admin) cannot access /api/admin/pending-requests');

    // 27b. Non-superadmin cannot access the pending-request count endpoint
    const countRestrictedRes = await request('GET', '/api/admin-requests/count', null, approvedLoginRes.data.token);
    assert(countRestrictedRes.status === 403, 'Non-superadmin (role=admin) cannot access /api/admin-requests/count');

    // 28. POST /api/events fails without flyer
    console.log('\n[28] Testing POST /api/events fails without flyer...');
    const noFlyerRes = await request('POST', '/api/events', {
      eventName: "No Flyer Event",
      organizer: "No Flyer Club",
      faculty: "General",
      date: new Date(Date.now() + 86400000 * 2).toISOString(),
      venue: "No Venue",
      description: "No flyer",
      contact: "no@flyer.com",
      capacity: "5"
    }, adminToken);
    assert(noFlyerRes.status === 400 && noFlyerRes.data.error === 'A flyer image is required to post an event.', 'POST /api/events fails with 400 when no flyer provided');

    // 29. Identification image & superadmin notification tests
    console.log('\n[29] Testing identification image & superadmin notification...');

    const signupIdRes = await requestMultipart('POST', '/api/auth/signup', {
      username: `id_test_${uniqueSuffix}`,
      password: 'idpass123',
      email: `idtest_${uniqueSuffix}@campus.edu`,
      clubName: 'ID Test Club'
    }, { identification: identificationPath });
    assert(signupIdRes.status === 201, 'Identification test signup succeeded');

    // 29a. identificationUrl is stored correctly in superadmin response
    const pendingWithIdRes = await request('GET', '/api/admin/pending-requests', null, adminToken);
    const pendingWithId = pendingWithIdRes.data.requests.find(r => r.username === `id_test_${uniqueSuffix}`);
    assert(pendingWithId && Boolean(pendingWithId.identificationUrl), 'identificationUrl is stored and returned in superadmin pending-requests');
    assert(typeof pendingWithId.identificationUrl === 'string' && pendingWithId.identificationUrl.startsWith('/api/uploads/identification/'), 'identificationUrl points to database upload API URL');

    // 29a-2. identification image is served (200, not 404) at the stored URL
    const idImgRes = await request('GET', pendingWithId.identificationUrl);
    assert(idImgRes.status === 200, `Identification image served at stored URL returns 200 (got ${idImgRes.status})`);

    // 29b. identificationUrl is NOT present in public signup response
    assert(!signupIdRes.data.admin.identificationUrl, 'identificationUrl is not leaked in public signup response');

    // 29c. identificationUrl is NOT present in non-superadmin responses
    const nonSuperadminRes = await request('GET', '/api/admin/pending-requests', null, approvedLoginRes.data.token);
    assert(nonSuperadminRes.status === 403, 'Non-superadmin is blocked from pending-requests');
    assert(!nonSuperadminRes.data.identificationUrl, 'identificationUrl is not present in non-superadmin 403 response');

    // 29d. Email notification is triggered (stub check)
    console.log('\n[29d] Testing email notification trigger (stubbed)...');
    const mailer = require('../server/utils/mailer');
    assert(typeof mailer.sendAdminAccessRequestNotification === 'function', 'sendAdminAccessRequestNotification is exported from mailer');
    assert(signupIdRes.status === 201, 'Signup completed without blocking on notification');

    // 29. Past-event filtering & duplicate registration prevention
    console.log('\n[29] Testing past-event filtering & duplicate registration...');

    // 29a. Create a past event
    const pastEventRes = await requestMultipart('POST', '/api/events', {
      eventName: "Past Symposium",
      organizer: "History Society",
      faculty: "Arts & Humanities",
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      venue: "Old Hall",
      description: "An event that already happened.",
      contact: "history@campus.edu",
      capacity: "10"
    }, { flyer: flyerPath }, adminToken);
    const pastEventId = pastEventRes.data.event._id;
    assert(pastEventRes.status === 201, 'Created past event for testing');

    // 29b. GET /api/events excludes past events by default
    const defaultEventsRes = await request('GET', '/api/events');
    assert(defaultEventsRes.status === 200 && !defaultEventsRes.data.events.some(e => e._id === pastEventId), 'GET /api/events excludes past events by default');

    // 29c. GET /api/events with includePast=true includes past events
    const pastEventsRes = await request('GET', '/api/events?includePast=true');
    assert(pastEventsRes.status === 200 && pastEventsRes.data.events.some(e => e._id === pastEventId), 'GET /api/events?includePast=true includes past events');

    // 29d. Registration for past event is rejected
    const pastRegRes = await request('POST', `/api/events/${pastEventId}/register`, {
      name: "Time Traveler",
      email: "timetraveler@campus.edu"
    });
    assert(pastRegRes.status === 400 && pastRegRes.data.error === 'This event has already taken place.', 'Registration for past event rejected with 400');

    // 29e. Duplicate email registration rejected
    const futureEventRes = await requestMultipart('POST', '/api/events', {
      eventName: "Future Workshop",
      organizer: "Tech Club",
      faculty: "Engineering",
      date: new Date(Date.now() + 86400000 * 5).toISOString(),
      venue: "Lab 1",
      description: "Upcoming workshop.",
      contact: "tech@campus.edu",
      capacity: "5"
    }, { flyer: flyerPath }, adminToken);
    const futureEventId = futureEventRes.data.event._id;
    const dupReg1 = await request('POST', `/api/events/${futureEventId}/register`, {
      name: "Alex Student",
      email: "alex@campus.edu"
    });
    assert(dupReg1.status === 200 && dupReg1.data.status === 'confirmed', 'First registration succeeded');

    const dupReg2 = await request('POST', `/api/events/${futureEventId}/register`, {
      name: "Alex Student",
      email: "alex@campus.edu"
    });
    assert(dupReg2.status === 400 && dupReg2.data.error === "You're already registered for this event.", 'Duplicate email registration rejected');

    // 29f. Duplicate waitlist join rejected
    const fullEventRes = await requestMultipart('POST', '/api/events', {
      eventName: "Full Event",
      organizer: "Small Club",
      faculty: "General",
      date: new Date(Date.now() + 86400000 * 3).toISOString(),
      venue: "Room A",
      description: "Tiny event.",
      contact: "small@campus.edu",
      capacity: "1"
    }, { flyer: flyerPath }, adminToken);
    const fullEventId = fullEventRes.data.event._id;

    const fillReg = await request('POST', `/api/events/${fullEventId}/register`, {
      name: "First Attendee",
      email: "first@campus.edu"
    });
    assert(fillReg.status === 200 && fillReg.data.status === 'confirmed', 'Filled event capacity');

    const wlReg1 = await request('POST', `/api/events/${fullEventId}/register`, {
      name: "Waitlist User",
      email: "wluser@campus.edu",
      joinWaitlist: true
    });
    assert(wlReg1.status === 200 && wlReg1.data.status === 'waitlisted', 'First waitlist join succeeded');

    const wlReg2 = await request('POST', `/api/events/${fullEventId}/register`, {
      name: "Waitlist User",
      email: "wluser@campus.edu",
      joinWaitlist: true
    });
    assert(wlReg2.status === 400 && wlReg2.data.error === "You're already registered for this event.", 'Duplicate waitlist join rejected');

    // Cleanup dummy files
    if (fs.existsSync(flyerPath)) {
      fs.unlinkSync(flyerPath);
    }
    if (fs.existsSync(identificationPath)) {
      fs.unlinkSync(identificationPath);
    }

    console.log(`\n========================================`);
    console.log(`  Tests Completed: ${testPassCount} / ${testTotal} Passed`);
    console.log(`========================================\n`);

    if (testPassCount === testTotal) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

// Give server 1 second to bind if called immediately
setTimeout(runTests, 1200);
