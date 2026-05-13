import { describe, expect, it } from 'vitest';
import { ApiResponseError, parseApiResponse } from './apiClient';

const makeResponse = (body, contentType = 'application/json', init = {}) =>
  new Response(body, {
    status: init.status || 200,
    statusText: init.statusText || 'OK',
    headers: { 'content-type': contentType },
  });

describe('parseApiResponse', () => {
  it('parses valid JSON responses', async () => {
    const data = await parseApiResponse(makeResponse('{"response":"ok"}'));
    expect(data).toEqual({ response: 'ok' });
  });

  it('reports HTML fallback pages as API response errors', async () => {
    await expect(parseApiResponse(makeResponse('<!DOCTYPE html><html></html>', 'text/html'))).rejects.toBeInstanceOf(
      ApiResponseError,
    );
  });
});
