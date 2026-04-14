import assert from 'node:assert/strict';

import {
  assertTrustedAppSignal,
  resolveSafeRedirect,
  validateSafeHttpUrl,
} from './api/_shared/request-security';

function createResponse() {
  return {
    statusCode: 200,
    payload: null as null | Record<string, unknown>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: Record<string, unknown>) {
      this.payload = payload;
      return this;
    },
  };
}

async function run() {
  assert.equal(validateSafeHttpUrl('https://example.com/form').ok, true);
  assert.equal(validateSafeHttpUrl('http://127.0.0.1/private').ok, false);
  assert.equal(resolveSafeRedirect('https://example.com', '/next').ok, true);
  assert.equal(resolveSafeRedirect('https://example.com', 'http://localhost/internal').ok, false);

  const deniedReq = {
    headers: {
      origin: 'http://127.0.0.1:5174',
      'sec-fetch-site': 'same-origin',
    },
  };
  const deniedRes = createResponse();
  const denied = await assertTrustedAppSignal(deniedReq, deniedRes as never, 'Access denied.');
  assert.equal(denied, false);
  assert.equal(deniedRes.statusCode, 401);
  assert.deepEqual(deniedRes.payload, {
    error: 'AUTH_REQUIRED',
    message: 'Access denied.',
  });

  const devReq = {
    headers: {
      origin: 'http://127.0.0.1:5174',
      'x-formmate-dev-auth': '1',
    },
  };
  const devRes = createResponse();
  const allowed = await assertTrustedAppSignal(devReq, devRes as never, 'Access denied.');
  assert.equal(allowed, true);
  assert.equal(devRes.payload, null);

  console.log('request-security checks passed');
}

void run();
