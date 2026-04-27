import assert from 'node:assert/strict';
import { assertTrustedAppSignal } from '../api/_shared/request-security.ts';

function createResponse() {
  return {
    statusCode: 200,
    payload: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
}

function createRequest(headers: Record<string, string> = {}, remoteAddress = '203.0.113.10') {
  return {
    headers,
    socket: { remoteAddress },
  };
}

async function run() {
  const originalEnv = {
    FORMMATE_ENABLE_DEV_AUTH: process.env.FORMMATE_ENABLE_DEV_AUTH,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  try {
    process.env.FORMMATE_ENABLE_DEV_AUTH = '0';
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const sameOriginRes = createResponse();
    const sameOriginAllowed = await assertTrustedAppSignal(
      createRequest({
        origin: 'http://127.0.0.1:5173',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
      }),
      sameOriginRes,
      'Access denied.',
    );

    assert.equal(sameOriginAllowed, false, 'same-origin browser headers must not grant API access');
    assert.equal(sameOriginRes.statusCode, 401);
    assert.deepEqual(sameOriginRes.payload, {
      error: 'AUTH_REQUIRED',
      message: 'Access denied.',
    });

    process.env.FORMMATE_ENABLE_DEV_AUTH = '1';
    process.env.NODE_ENV = 'development';
    const devAuthRes = createResponse();
    const devAuthAllowed = await assertTrustedAppSignal(
      createRequest({
        origin: 'http://127.0.0.1:5173',
        'x-formmate-dev-auth': '1',
      }, '127.0.0.1'),
      devAuthRes,
      'Access denied.',
    );

    assert.equal(devAuthAllowed, true, 'local dev auth header should still work for loopback development');
    assert.equal(devAuthRes.payload, null);
  } finally {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
}

run()
  .then(() => {
    console.log('Request security tests passed.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
