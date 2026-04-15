import assert from 'node:assert/strict';

import {
  assertTrustedAppSignal,
  resolveSafeRedirect,
  validateSafeHttpUrl,
} from './api/_shared/request-security';
import {
  resolveGoogleFormRedirect,
  validateGoogleFormUrl,
} from './api/proxy/google-form';

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
    socket: {
      remoteAddress: '127.0.0.1',
    },
  };
  const devRes = createResponse();
  const originalFlag = process.env.FORMMATE_ENABLE_DEV_AUTH;
  process.env.FORMMATE_ENABLE_DEV_AUTH = '1';
  const allowed = await assertTrustedAppSignal(devReq, devRes as never, 'Access denied.');
  assert.equal(allowed, true);
  assert.equal(devRes.payload, null);
  process.env.FORMMATE_ENABLE_DEV_AUTH = '0';

  const blockedDevReq = {
    headers: {
      origin: 'https://example.com',
      'x-formmate-dev-auth': '1',
    },
    socket: {
      remoteAddress: '127.0.0.1',
    },
  };
  const blockedDevRes = createResponse();
  const blocked = await assertTrustedAppSignal(blockedDevReq, blockedDevRes as never, 'Access denied.');
  assert.equal(blocked, false);
  assert.equal(blockedDevRes.statusCode, 401);

  if (originalFlag === undefined) {
    delete process.env.FORMMATE_ENABLE_DEV_AUTH;
  } else {
    process.env.FORMMATE_ENABLE_DEV_AUTH = originalFlag;
  }

  assert.equal(validateGoogleFormUrl('https://docs.google.com/forms/d/e/example/viewform').ok, true);
  assert.equal(validateGoogleFormUrl('https://forms.gle/abc123').ok, true);
  assert.equal(validateGoogleFormUrl('https://example.com/forms/d/e/example/viewform').ok, false);
  assert.equal(resolveGoogleFormRedirect('https://docs.google.com/forms/d/e/example/viewform', 'http://localhost/private').ok, false);

  console.log('request-security checks passed');
}

void run();
