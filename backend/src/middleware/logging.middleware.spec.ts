import { Logger } from '@nestjs/common';
import { LoggingMiddleware } from './logging.middleware';

jest.mock('@sentry/node', () => ({
  setUser: jest.fn(),
  setTag: jest.fn(),
  captureMessage: jest.fn(),
}));
jest.mock('../common/observability/platform-telemetry-sink', () => ({
  recordBackendHttpTelemetry: jest.fn(),
}));

import * as Sentry from '@sentry/node';

function requestFor(originalUrl: string) {
  return {
    method: 'GET',
    originalUrl,
    ip: '127.0.0.1',
    headers: {},
    header: () => '',
  } as any;
}

function responseWith(statusCode: number) {
  const res: any = {
    statusCode,
    setHeader: jest.fn(),
    get: jest.fn(() => '12'),
    send: jest.fn(function send() {
      return this;
    }),
  };
  return res;
}

/**
 * A 503 from the health endpoint is readiness reporting, not a server
 * failure. Until 2026-09-04 the middleware logged every boot's health probes
 * as "Server Error" with a full request dump and sent each to Sentry, which
 * buried real 5xx lines in the development log.
 */
describe('LoggingMiddleware status-code logging', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['/health', '/api/health', '/health?deep=1', '/api/health/'])(
    'logs a %s 503 as a warning and does not report it to Sentry',
    (url) => {
      const res = responseWith(503);
      new LoggingMiddleware().use(requestFor(url), res, () => undefined);
      res.send('not ready');

      expect(errorSpy).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Health probe answered 503'),
        expect.objectContaining({ url, statusCode: 503 }),
      );
    },
  );

  it('still logs a real 500 as Server Error and reports it to Sentry', () => {
    const res = responseWith(500);
    new LoggingMiddleware().use(requestFor('/api/patients'), res, () => undefined);
    res.send('boom');

    expect(errorSpy).toHaveBeenCalledWith(
      'Server Error',
      expect.objectContaining({ statusCode: 500 }),
    );
    expect(Sentry.captureMessage).toHaveBeenCalledWith('HTTP 500 - GET /api/patients', 'error');
  });

  it('does not treat a path that merely contains "health" as a probe', () => {
    const res = responseWith(500);
    new LoggingMiddleware().use(
      requestFor('/api/patients/healthcheck-notes'),
      res,
      () => undefined,
    );
    res.send('boom');

    expect(errorSpy).toHaveBeenCalledWith('Server Error', expect.anything());
  });
});
