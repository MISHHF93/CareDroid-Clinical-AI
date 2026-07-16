import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AnalyticsPayloadDto, CrashReportDto } from './analytics-ingestion.dto';

describe('analytics ingestion DTOs', () => {
  it('rejects oversized analytics batches', async () => {
    const payload = plainToInstance(AnalyticsPayloadDto, {
      events: Array.from({ length: 101 }, () => ({ eventName: 'page_view' })),
    });

    await expect(validate(payload)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'events',
        }),
      ]),
    );
  });

  it('accepts numeric event timestamps after transformation', async () => {
    const payload = plainToInstance(AnalyticsPayloadDto, {
      events: [{ eventName: 'navigation', timestamp: Date.now() }],
    });

    const errors = await validate(payload);

    expect(errors).toHaveLength(0);
    expect(payload.events[0].timestamp).toEqual(expect.any(String));
  });

  it('rejects unbounded crash report fields', async () => {
    const report = plainToInstance(CrashReportDto, {
      id: 'crash-1',
      error: {
        name: 'Error',
        message: 'x'.repeat(2001),
        stack: [],
      },
      breadcrumbs: [],
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      environment: 'production',
    });

    const errors = await validate(report);

    expect(errors[0].children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'message',
        }),
      ]),
    );
  });
});
