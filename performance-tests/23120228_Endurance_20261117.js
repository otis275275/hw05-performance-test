import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';

// ====================================================================
// METRIC DEFINITIONS & THRESHOLDS (ENDURANCE / SOAK TEST PROFILE)
// ====================================================================
const loginDuration = new Trend('login_duration', true);
const profileReadDuration = new Trend('profile_read_duration', true);
const profileUpdateDuration = new Trend('profile_update_duration', true);
const lockoutDuration = new Trend('lockout_duration', true);
const e2eSuccessRate = new Rate('e2e_success_rate');
const lockoutBlockedCounter = new Counter('lockout_blocked_count');

export const options = {
  stages: [
    { duration: '30s', target: 25 },  // Ramp-up to sustained operating load
    { duration: '10m', target: 25 },  // 10 minutes sustained load to find hardware endurance threshold
    { duration: '30s', target: 0 },   // Graceful cool-down
  ],
  thresholds: {
    // Focus on stability, memory leak absence, and non-degrading p95 latency
    http_req_duration: ['p(95)<1000'],       // 95% of total requests under 1.0s
    http_req_failed: ['rate<0.02'],          // Error rate strictly below 2% over long run
    login_duration: ['p(95)<600'],           // Auth API under 600ms
    profile_read_duration: ['p(95)<400'],    // Read API under 400ms
    profile_update_duration: ['p(95)<800'],  // Transactional write under 800ms
    e2e_success_rate: ['rate>0.95'],         // E2E success rate maintained above 95%
  },
};

// ====================================================================
// DATA-DRIVEN LOADING (SharedArray: Zero-copy memory optimization)
// ====================================================================
function parseCsv(rawText) {
  const lines = rawText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    return row;
  });
}

const users = new SharedArray('users', function () {
  return parseCsv(open('./data/users.csv'));
});

const profiles = new SharedArray('profiles', function () {
  return parseCsv(open('./data/profiles.csv'));
});

const lockoutAccounts = new SharedArray('lockout_accounts', function () {
  return parseCsv(open('./data/lockout_accounts.csv'));
});

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// ====================================================================
// TEST SCENARIO WORKFLOW
// ====================================================================
export default function () {
  let e2eSuccess = true;

  // Globally unique monotonically increasing counter across all VUs
  const globalIter = exec.scenario.iterationInTest;

  // Round-robin selection: Sticky user per VU, rotating profiles & lockout data
  const user = users[(__VU - 1) % users.length];
  const profile = profiles[globalIter % profiles.length];
  const lockoutAcc = lockoutAccounts[globalIter % lockoutAccounts.length];

  let authToken = '';

  // ------------------------------------------------------------------
  // 1. AUTH-HEAVY: POST /api/login (Valid credentials)
  // ------------------------------------------------------------------
  group('01_Auth_Login', function () {
    const loginPayload = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login' },
    };

    const res = http.post(`${BASE_URL}/api/login`, loginPayload, params);
    loginDuration.add(res.timings.duration);

    const isLoginOk = check(res, {
      'login status is 200': (r) => r.status === 200,
      'login returns JWT token': (r) => {
        try {
          const body = r.json();
          return body.token && body.token.length > 0;
        } catch (e) {
          return false;
        }
      },
    });

    if (isLoginOk) {
      authToken = res.json().token;
    } else {
      e2eSuccess = false;
    }
  });

  sleep(1); // Realistic think-time

  // If login failed, abort downstream steps
  if (!authToken) {
    e2eSuccessRate.add(false);
    return;
  }

  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  };

  // ------------------------------------------------------------------
  // 2. READ-HEAVY: GET /api/users/me (Read personal profile)
  // ------------------------------------------------------------------
  group('02_Read_Profile', function () {
    const params = Object.assign({}, authHeaders, {
      tags: { endpoint: 'get_me' },
    });

    const res = http.get(`${BASE_URL}/api/users/me`, params);
    profileReadDuration.add(res.timings.duration);

    const isReadOk = check(res, {
      'read profile status is 200': (r) => r.status === 200,
      'read profile contains email': (r) => {
        try {
          return r.json().email === user.email;
        } catch (e) {
          return false;
        }
      },
    });

    if (!isReadOk) e2eSuccess = false;
  });

  sleep(1); // Realistic think-time

  // ------------------------------------------------------------------
  // 3. TRANSACTIONAL: PUT /api/users/me (Sustained write to SQLite)
  // ------------------------------------------------------------------
  group('03_Transactional_UpdateProfile', function () {
    const updatePayload = JSON.stringify({
      name: profile.name,
      shipping_address: profile.shipping_address,
      phone: profile.phone,
    });

    const params = Object.assign({}, authHeaders, {
      tags: { endpoint: 'put_me' },
    });

    const res = http.put(`${BASE_URL}/api/users/me`, updatePayload, params);
    profileUpdateDuration.add(res.timings.duration);

    const isUpdateOk = check(res, {
      'update profile status is 200': (r) => r.status === 200,
      'update profile message is Profile updated': (r) => {
        try {
          return r.json().message === 'Profile updated';
        } catch (e) {
          return false;
        }
      },
    });

    if (!isUpdateOk) e2eSuccess = false;
  });

  sleep(1); // Realistic think-time

  // ------------------------------------------------------------------
  // 4. AUTH-HEAVY BRANCH: Account Lockout Testing
  // Sampled every 5 global iterations to test lockout resilience over 10m
  // ------------------------------------------------------------------
  if (globalIter % 5 === 0) {
    group('04_Auth_LockoutBehavior', function () {
      const badPayload = JSON.stringify({
        email: lockoutAcc.email,
        password: lockoutAcc.wrong_password,
      });

      const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'lockout_test' },
        responseCallback: http.expectedStatuses(401, 403),
      };

      const res = http.post(`${BASE_URL}/api/login`, badPayload, params);
      lockoutDuration.add(res.timings.duration);

      const isLockoutExpected = check(res, {
        'invalid credentials returns 401 or 403': (r) => r.status === 401 || r.status === 403,
      });

      if (res.status === 403) {
        lockoutBlockedCounter.add(1);
      }

      if (!isLockoutExpected) e2eSuccess = false;
    });
  }

  e2eSuccessRate.add(e2eSuccess);
  sleep(1);
}
