'use strict';

/**
 * Unit tests for src/services/email.js — sendPhotoEmail
 *
 * @sendgrid/mail is mocked to avoid any real network calls.
 * Tests cover: graceful skip when key absent, send call shape, subject content.
 */

// ── Must run before any require of project modules ────────────────────────────
delete process.env.SENDGRID_API_KEY;
delete process.env.SENDGRID_FROM_EMAIL;
process.env.NODE_ENV = 'test';

// ── Mock @sendgrid/mail before the service module is imported ─────────────────
const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }, {}]);
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: mockSend,
}));

const sgMail = require('@sendgrid/mail');

describe('sendPhotoEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('returns { skipped: true } when SENDGRID_API_KEY is not set', async () => {
    delete process.env.SENDGRID_API_KEY;

    // Re-require so the module re-evaluates the env check at the top level
    jest.isolateModules(() => {
      // nothing — we test via dynamic require below
    });
    const { sendPhotoEmail } = require('../src/services/email');

    const result = await sendPhotoEmail('guest@example.com', 'https://r2.example.com/photo.jpg', 'Test Gala');
    expect(result).toEqual({ skipped: true });
  });

  test('does not throw when SENDGRID_API_KEY is not set', async () => {
    delete process.env.SENDGRID_API_KEY;
    const { sendPhotoEmail } = require('../src/services/email');
    await expect(sendPhotoEmail('guest@example.com', 'https://r2.example.com/photo.jpg', 'Test Gala'))
      .resolves.not.toThrow();
  });

  test('calls sgMail.send when SENDGRID_API_KEY is set', async () => {
    process.env.SENDGRID_API_KEY = 'SG.test-key-for-unit-tests';

    // Use jest.isolateModules so the module re-runs with the env var set
    await new Promise((resolve) => {
      jest.isolateModules(async () => {
        const { sendPhotoEmail } = require('../src/services/email');
        await sendPhotoEmail('guest@example.com', 'https://r2.example.com/photo.jpg', 'Summer Bash');
        expect(mockSend).toHaveBeenCalledTimes(1);
        resolve();
      });
    });
  });

  test('sgMail.send is called with subject containing the event name', async () => {
    process.env.SENDGRID_API_KEY = 'SG.test-key-for-unit-tests';
    const EVENT_NAME = 'Annual Gala 2026';

    await new Promise((resolve) => {
      jest.isolateModules(async () => {
        const { sendPhotoEmail } = require('../src/services/email');
        await sendPhotoEmail('guest@example.com', 'https://r2.example.com/photo.jpg', EVENT_NAME);

        expect(mockSend).toHaveBeenCalledTimes(1);
        const callArg = mockSend.mock.calls[0][0];
        expect(callArg.subject).toContain(EVENT_NAME);
        resolve();
      });
    });
  });

  test('sends to the correct recipient address', async () => {
    process.env.SENDGRID_API_KEY = 'SG.test-key-for-unit-tests';
    const TO = 'vip@example.com';

    await new Promise((resolve) => {
      jest.isolateModules(async () => {
        const { sendPhotoEmail } = require('../src/services/email');
        await sendPhotoEmail(TO, 'https://r2.example.com/photo.jpg', 'Event');

        const callArg = mockSend.mock.calls[0][0];
        expect(callArg.to).toBe(TO);
        resolve();
      });
    });
  });

  test('returns { sent: true } when key is set and send succeeds', async () => {
    process.env.SENDGRID_API_KEY = 'SG.test-key-for-unit-tests';

    let result;
    await new Promise((resolve) => {
      jest.isolateModules(async () => {
        const { sendPhotoEmail } = require('../src/services/email');
        result = await sendPhotoEmail('guest@example.com', 'https://r2.example.com/photo.jpg', 'Party');
        resolve();
      });
    });
    expect(result).toEqual({ sent: true });
  });

  afterEach(() => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;
  });
});
