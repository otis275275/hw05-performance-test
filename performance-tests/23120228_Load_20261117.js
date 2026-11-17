import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';

// ====================================================================
// METRIC DEFINITIONS & THRESHOLDS
// ====================================================================
const loginDuration = new Trend('login_duration', true);
const profileReadDuration = new Trend('profile_read_duration', true);
const profileUpdateDuration = new Trend('profile_update_duration', true);
const lockoutDuration = new Trend('lockout_duration', true);
const e2eSuccessRate = new Rate('e2e_success_rate');
const lockoutBlockedCounter = new Counter('lockout_blocked_count');

export const options = {
  stages: [
    { duration: '20s', target: 15 }, // Ramp-up to 15 VUs
    { duration: '60s', target: 15 }, // Steady load at 15 VUs
    { duration: '15s', target: 0 },  // Ramp-down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],       // 95% of total requests under 800ms
    http_req_failed: ['rate<0.01'],         // Error rate below 1%
    login_duration: ['p(95)<500'],          // Auth API p95 under 500ms
    profile_read_duration: ['p(95)<300'],   // Read API p95 under 300ms
    profile_update_duration: ['p(95)<600'], // Transactional API p95 under 600ms
    e2e_success_rate: ['rate>0.98'],        // E2E workflow success rate > 98%
  },
};

// ====================================================================
// DATA-DRIVEN LOADING (SharedArray: Zero-copy memory across all VUs)
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

  // Globally unique iteration counter across all VUs
  const globalIter = exec.scenario.iterationInTest;

  // Round-robin selection:
  // User is sticky per VU, while profile and lockout rotate across global iterations
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

  // If login failed, skip dependent steps
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
  // 3. TRANSACTIONAL: PUT /api/users/me (Update profile)
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
  // Sampled every 5 global iterations to test lockout behavior
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
  sleep(1); // Pause before next iteration
}
