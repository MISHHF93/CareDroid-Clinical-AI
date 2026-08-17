import { SentinelController } from './sentinel.controller';

describe('SentinelController', () => {
  let controller: SentinelController;
  let tracking: {
    health: jest.Mock;
    listUnits: jest.Mock;
    listPositions: jest.Mock;
    latestEta: jest.Mock;
    listGeofences: jest.Mock;
    listEpisodes: jest.Mock;
    ingestCadEvents: jest.Mock;
    pollAdapters: jest.Mock;
    getWebhookAdapter: jest.Mock;
  };
  let alarms: {
    listOpen: jest.Mock;
    raise: jest.Mock;
    transition: jest.Mock;
    listEvents: jest.Mock;
    performanceSnapshot: jest.Mock;
  };
  let inbound: {
    listInbound: jest.Mock;
    upsertFromCadOrNemsis: jest.Mock;
    producePrepRecommendation: jest.Mock;
    reviewRecommendation: jest.Mock;
    listRecommendations: jest.Mock;
    analyticsSnapshot: jest.Mock;
  };
  let outbox: { getHealth: jest.Mock };
  let webhookAdapter: { enqueue: jest.Mock };

  beforeEach(() => {
    webhookAdapter = { enqueue: jest.fn() };
    tracking = {
      health: jest.fn(async () => ({ enabled: false })),
      listUnits: jest.fn(async () => []),
      listPositions: jest.fn(async () => []),
      latestEta: jest.fn(async () => null),
      listGeofences: jest.fn(async () => []),
      listEpisodes: jest.fn(async () => []),
      ingestCadEvents: jest.fn(async () => ({ ingested: 0 })),
      pollAdapters: jest.fn(async () => undefined),
      getWebhookAdapter: jest.fn(() => webhookAdapter),
    };
    alarms = {
      listOpen: jest.fn(async () => []),
      raise: jest.fn(async () => ({ suppressed: false })),
      transition: jest.fn(async () => ({ id: 'alarm-1', status: 'acknowledged' })),
      listEvents: jest.fn(async () => []),
      performanceSnapshot: jest.fn(async () => ({})),
    };
    inbound = {
      listInbound: jest.fn(async () => []),
      upsertFromCadOrNemsis: jest.fn(async () => ({
        inbound: { id: 'inbound-1' },
        missingFields: [],
        validation: { valid: true },
        fhirBundle: {},
      })),
      producePrepRecommendation: jest.fn(async () => ({ id: 'rec-1' })),
      reviewRecommendation: jest.fn(async () => ({ id: 'rec-1', status: 'accepted' })),
      listRecommendations: jest.fn(async () => []),
      analyticsSnapshot: jest.fn(async () => ({
        missingDataRate: 0,
        inboundCount: 0,
        aiAcceptanceRate: 0,
        pendingReviews: 0,
      })),
    };
    outbox = { getHealth: jest.fn(async () => ({ pending: 0 })) };

    controller = new SentinelController(
      tracking as any,
      alarms as any,
      inbound as any,
      outbox as any,
    );
  });

  describe('health', () => {
    it('merges tracking/outbox/alarm/analytics health into one envelope and reports enabled', async () => {
      tracking.health.mockResolvedValue({ enabled: true, adapters: 2 });
      outbox.getHealth.mockResolvedValue({ pending: 3 });
      alarms.performanceSnapshot.mockResolvedValue({ open: 1 });
      inbound.analyticsSnapshot.mockResolvedValue({ inboundCount: 5 });

      const result = await controller.health();

      expect(result.message).toBe('Sentinel is enabled');
      expect(result.data).toEqual({
        enabled: true,
        adapters: 2,
        outbox: { pending: 3 },
        alarms: { open: 1 },
        analytics: { inboundCount: 5 },
      });
    });

    it('reports the disabled message with activation hint when tracking health is disabled', async () => {
      tracking.health.mockResolvedValue({ enabled: false });

      const result = await controller.health();

      expect(result.message).toBe(
        'Sentinel is disabled (set SENTINEL_ENABLED=true to activate ingest)',
      );
    });
  });

  describe('commandSnapshot', () => {
    it('attaches an ETA to each unit and formats coordinates only when both lat/lng exist', async () => {
      tracking.listUnits.mockResolvedValue([
        {
          id: 'u1',
          externalId: 'Medic-1',
          label: 'Medic 1',
          status: 'transporting',
          freshness: 'fresh',
          latitude: 40.7,
          longitude: -73.9,
          heading: 90,
          speedKmh: 60,
          lastSeenAt: '2026-07-25T10:00:00.000Z',
        },
        {
          id: 'u2',
          externalId: 'Medic-2',
          label: 'Medic 2',
          status: 'offline',
          freshness: 'stale',
          latitude: null,
          longitude: null,
          heading: null,
          speedKmh: null,
          lastSeenAt: null,
        },
      ]);
      tracking.latestEta.mockImplementation(async (unitId: string) =>
        unitId === 'u1'
          ? {
              etaPointMin: 8,
              etaLowMin: 6,
              etaHighMin: 10,
              confidence: 0.8,
              stale: false,
              method: 'model',
            }
          : null,
      );

      const result = await controller.commandSnapshot();

      expect(result.data.units[0].coordinates).toEqual({ latitude: 40.7, longitude: -73.9 });
      expect(result.data.units[0].eta).toEqual({
        etaPointMin: 8,
        etaLowMin: 6,
        etaHighMin: 10,
        confidence: 0.8,
        stale: false,
        method: 'model',
      });
      expect(result.data.units[1].coordinates).toBeNull();
      expect(result.data.units[1].eta).toBeNull();
    });

    it('maps geofences to a reduced shape and filters AI recommendations to pending only', async () => {
      tracking.listGeofences.mockResolvedValue([
        { id: 'g1', name: 'ED Bay', kind: 'circle', ring: [], extraInternalField: 'drop-me' },
      ]);
      inbound.listRecommendations.mockResolvedValue([
        { id: 'r1', humanReviewStatus: 'pending' },
        { id: 'r2', humanReviewStatus: 'accepted' },
      ]);

      const result = await controller.commandSnapshot();

      expect(result.data.geofences).toEqual([
        { id: 'g1', name: 'ED Bay', kind: 'circle', ring: [] },
      ]);
      expect(result.data.aiRecommendations).toEqual([{ id: 'r1', humanReviewStatus: 'pending' }]);
    });
  });

  describe('listUnits / listGeofences / listInbound / listAlarms / alarmEvents / listAi', () => {
    it('listUnits delegates and envelopes the result', async () => {
      tracking.listUnits.mockResolvedValue([{ id: 'u1' }]);
      const result = await controller.listUnits();
      expect(result).toEqual(
        expect.objectContaining({ data: [{ id: 'u1' }], message: 'Sentinel units' }),
      );
    });

    it('listGeofences delegates and envelopes the result', async () => {
      tracking.listGeofences.mockResolvedValue([{ id: 'g1' }]);
      const result = await controller.listGeofences();
      expect(result).toEqual(
        expect.objectContaining({ data: [{ id: 'g1' }], message: 'Active geofences' }),
      );
    });

    it('listInbound delegates and envelopes the result', async () => {
      inbound.listInbound.mockResolvedValue([{ id: 'p1' }]);
      const result = await controller.listInbound();
      expect(result).toEqual(
        expect.objectContaining({ data: [{ id: 'p1' }], message: 'Inbound pre-arrival patients' }),
      );
    });

    it('listAlarms delegates and envelopes the result', async () => {
      alarms.listOpen.mockResolvedValue([{ id: 'a1' }]);
      const result = await controller.listAlarms();
      expect(result).toEqual(
        expect.objectContaining({ data: [{ id: 'a1' }], message: 'Open Sentinel alarms' }),
      );
    });

    it('alarmEvents delegates with the alarm id and envelopes the result', async () => {
      alarms.listEvents.mockResolvedValue([{ id: 'e1' }]);
      const result = await controller.alarmEvents('alarm-9');
      expect(alarms.listEvents).toHaveBeenCalledWith('alarm-9');
      expect(result).toEqual(
        expect.objectContaining({ data: [{ id: 'e1' }], message: 'Alarm audit trail' }),
      );
    });

    it('listAi delegates and envelopes the result', async () => {
      inbound.listRecommendations.mockResolvedValue([{ id: 'r1' }]);
      const result = await controller.listAi();
      expect(result).toEqual(
        expect.objectContaining({ data: [{ id: 'r1' }], message: 'AI recommendations' }),
      );
    });
  });

  // Regression coverage (HEAL-308): these routes previously called every read method with
  // zero organizationId, so any authenticated user with the right permission level could see
  // every hospital organization's live ambulance units/inbound patients/alarms/AI
  // recommendations sharing this deployment. Proves the caller's own @TenantContext() is
  // actually threaded through to each underlying service call, not just accepted and dropped.
  describe('tenant scoping (HEAL-308)', () => {
    const tenantContext = { organizationId: 'org-a' } as any;

    it('listUnits passes organizationId through to tracking.listUnits', async () => {
      await controller.listUnits(tenantContext);
      expect(tracking.listUnits).toHaveBeenCalledWith('org-a');
    });

    it('listInbound passes organizationId through to inbound.listInbound', async () => {
      await controller.listInbound(tenantContext);
      expect(inbound.listInbound).toHaveBeenCalledWith('org-a');
    });

    it('listAlarms passes organizationId through to alarms.listOpen', async () => {
      await controller.listAlarms(tenantContext);
      expect(alarms.listOpen).toHaveBeenCalledWith('org-a');
    });

    it('listAi passes organizationId through to inbound.listRecommendations', async () => {
      await controller.listAi(tenantContext);
      expect(inbound.listRecommendations).toHaveBeenCalledWith('org-a');
    });

    it('commandSnapshot passes organizationId through to every underlying read call', async () => {
      await controller.commandSnapshot(tenantContext);
      expect(tracking.listUnits).toHaveBeenCalledWith('org-a');
      expect(tracking.listEpisodes).toHaveBeenCalledWith('org-a');
      expect(inbound.listInbound).toHaveBeenCalledWith('org-a');
      expect(alarms.listOpen).toHaveBeenCalledWith('org-a');
      expect(inbound.listRecommendations).toHaveBeenCalledWith('org-a');
    });

    it('analytics passes organizationId through to tracking.listEpisodes', async () => {
      await controller.analytics(tenantContext);
      expect(tracking.listEpisodes).toHaveBeenCalledWith('org-a');
    });

    it('ingestCad derives organizationId from tenant context and threads it into both the CAD events and any clinical upsert', async () => {
      await controller.ingestCad(
        { unitId: 'M1', lat: 1, lng: 2, chiefComplaint: 'Chest pain' },
        tenantContext,
      );
      expect(tracking.ingestCadEvents).toHaveBeenCalledWith(expect.any(Array), 'org-a');
      expect(inbound.upsertFromCadOrNemsis).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-a' }),
      );
    });

    it('upsertInbound derives organizationId from tenant context, not the request body', async () => {
      await controller.upsertInbound(
        { unitId: 'M1', organizationId: 'attacker-supplied-org' } as any,
        tenantContext,
      );
      expect(inbound.upsertFromCadOrNemsis).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'org-a' }),
      );
    });

    it('every listed route falls back to no filter (undefined) when there is no tenant context', async () => {
      await controller.listUnits();
      await controller.listInbound();
      await controller.listAlarms();
      await controller.listAi();
      expect(tracking.listUnits).toHaveBeenCalledWith(undefined);
      expect(inbound.listInbound).toHaveBeenCalledWith(undefined);
      expect(alarms.listOpen).toHaveBeenCalledWith(undefined);
      expect(inbound.listRecommendations).toHaveBeenCalledWith(undefined);
    });
  });

  describe('unitPositions', () => {
    it.each([
      [undefined, 50],
      ['10', 10],
      ['500', 200],
      ['0', 50],
      ['-5', 1],
      ['abc', 50],
      ['1', 1],
    ])('clamps limit=%p to %p', async (input, expected) => {
      await controller.unitPositions('unit-1', input as string | undefined);
      expect(tracking.listPositions).toHaveBeenCalledWith('unit-1', undefined, expected);
    });

    it('threads the caller organizationId through to listPositions', async () => {
      await controller.unitPositions('unit-1', '10', { organizationId: 'org-a' } as any);
      expect(tracking.listPositions).toHaveBeenCalledWith('unit-1', 'org-a', 10);
    });
  });

  describe('ingestCad', () => {
    it('does not touch inbound when the payload has no clinical fields and no patient block', async () => {
      const result = await controller.ingestCad({ units: [{ unitId: 'M1', lat: 1, lng: 2 }] });

      expect(inbound.upsertFromCadOrNemsis).not.toHaveBeenCalled();
      expect(result.data.inbound).toBeNull();
      expect(webhookAdapter.enqueue).toHaveBeenCalled();
    });

    it('upserts inbound when a clinical field is present, using the raw body as payload', async () => {
      await controller.ingestCad({
        unitId: 'M1',
        lat: 1,
        lng: 2,
        chiefComplaint: 'Chest pain',
      });

      expect(inbound.upsertFromCadOrNemsis).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ chiefComplaint: 'Chest pain' }),
          unitId: 'M1',
        }),
      );
    });

    it('merges body.patient over the top-level body when both are present', async () => {
      await controller.ingestCad({
        unitId: 'M1',
        chiefComplaint: 'top-level',
        patient: { chiefComplaint: 'from-patient-block', mrn: 'MRN-1' },
      });

      const call = inbound.upsertFromCadOrNemsis.mock.calls[0][0];
      expect(call.payload.chiefComplaint).toBe('from-patient-block');
      expect(call.payload.mrn).toBe('MRN-1');
    });

    it('falls back through unitExternalId/unitId/ems_unit_id in priority order', async () => {
      await controller.ingestCad({ ems_unit_id: 'EMS-9', patient: { chiefComplaint: 'x' } });

      expect(inbound.upsertFromCadOrNemsis).toHaveBeenCalledWith(
        expect.objectContaining({ unitId: 'EMS-9' }),
      );
    });

    it('reports eventCount from the normalized event list', async () => {
      const result = await controller.ingestCad({
        events: [
          { unitExternalId: 'M1', latitude: 1, longitude: 2 },
          { unitExternalId: 'M2', latitude: 3, longitude: 4 },
        ],
      });

      expect(result.data.eventCount).toBe(2);
    });
  });

  describe('forcePoll', () => {
    it('polls adapters then returns the refreshed unit list', async () => {
      tracking.listUnits.mockResolvedValue([{ id: 'u1' }]);

      const result = await controller.forcePoll();

      expect(tracking.pollAdapters).toHaveBeenCalled();
      expect(result.data).toEqual([{ id: 'u1' }]);
      expect(result.message).toBe('Adapters polled');
    });
  });

  describe('upsertInbound', () => {
    it('coerces provided numeric/string fields and passes null for organizationId when absent', async () => {
      // Simulates a raw pre-ValidationPipe body (this unit test calls the
      // controller directly, bypassing Nest's real transform pipeline) to
      // prove the controller's own Number() coercion is defense-in-depth,
      // independent of whatever the pipe already normalized upstream.
      await controller.upsertInbound({
        unitId: 'M1',
        etaPointMin: '8',
        etaLowMin: '6',
        etaHighMin: '10',
      } as any);

      expect(inbound.upsertFromCadOrNemsis).toHaveBeenCalledWith({
        payload: expect.any(Object),
        unitId: 'M1',
        organizationId: null,
        etaPointMin: 8,
        etaLowMin: 6,
        etaHighMin: 10,
      });
    });

    it('passes undefined for unitId and null for eta fields when none are supplied', async () => {
      await controller.upsertInbound({});

      expect(inbound.upsertFromCadOrNemsis).toHaveBeenCalledWith({
        payload: expect.any(Object),
        unitId: undefined,
        organizationId: null,
        etaPointMin: null,
        etaLowMin: null,
        etaHighMin: null,
      });
    });

    it('returns the FHIR bundle and validation details in the envelope', async () => {
      const result = await controller.upsertInbound({ unitId: 'M1' });

      expect(result.data).toEqual({
        inbound: { id: 'inbound-1' },
        validation: { valid: true },
        missingFields: [],
        fhirBundle: {},
      });
    });
  });

  describe('prepRecommendation', () => {
    it('defaults preferAi to true when the body omits it', async () => {
      await controller.prepRecommendation('inbound-1', {});
      expect(inbound.producePrepRecommendation).toHaveBeenCalledWith('inbound-1', {
        preferAi: true,
      });
    });

    it('respects an explicit preferAi: false', async () => {
      await controller.prepRecommendation('inbound-1', { preferAi: false });
      expect(inbound.producePrepRecommendation).toHaveBeenCalledWith('inbound-1', {
        preferAi: false,
      });
    });

    it('treats an explicit preferAi: true the same as the default', async () => {
      await controller.prepRecommendation('inbound-1', { preferAi: true });
      expect(inbound.producePrepRecommendation).toHaveBeenCalledWith('inbound-1', {
        preferAi: true,
      });
    });
  });

  describe('raiseAlarm', () => {
    it('forwards every alarm field and reports "Alarm raised" when not suppressed', async () => {
      alarms.raise.mockResolvedValue({ id: 'a1', suppressed: false });
      const body = {
        source: 'sentinel-rule',
        category: 'vitals',
        ruleId: 'rule-1',
        subjectId: 'patient-1',
        severity: 'critical' as const,
        urgency: 'immediate' as const,
        title: 'Hypoxia',
        message: 'SpO2 below threshold',
      };

      const result = await controller.raiseAlarm(body);

      expect(alarms.raise).toHaveBeenCalledWith({
        ...body,
        organizationId: null,
        metadata: undefined,
        actorId: undefined,
      });
      expect(result.message).toBe('Alarm raised');
    });

    it('derives organizationId from the caller tenant context, not from the request body', async () => {
      alarms.raise.mockResolvedValue({ id: 'a1', suppressed: false });

      await controller.raiseAlarm(
        {
          source: 's',
          category: 'c',
          ruleId: 'r',
          subjectId: 'p',
          severity: 'critical' as const,
          urgency: 'immediate' as const,
          title: 't',
          message: 'm',
          // A malicious/misconfigured caller supplying their own organizationId in the
          // body must NOT be trusted -- the real HEAL-308 fix.
          organizationId: 'attacker-supplied-org',
        } as any,
        { organizationId: 'real-tenant-org' } as any,
      );

      expect(alarms.raise).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: 'real-tenant-org' }),
      );
    });

    it('reports the suppressed message when the service dedupes/fatigues the alarm', async () => {
      alarms.raise.mockResolvedValue({ id: 'a1', suppressed: true });

      const result = await controller.raiseAlarm({
        source: 's',
        category: 'c',
        ruleId: 'r',
        subjectId: 'p',
        severity: 'info',
        urgency: 'routine',
        title: 't',
        message: 'm',
      });

      expect(result.message).toBe('Alarm suppressed (dedupe/fatigue)');
    });
  });

  describe('alarmAction', () => {
    const req = { user: { id: 'user-1', role: 'physician' } };

    it.each([
      ['ack', 'acknowledged'],
      ['acknowledge', 'acknowledged'],
      ['acknowledged', 'acknowledged'],
      ['escalate', 'escalated'],
      ['escalated', 'escalated'],
      ['resolve', 'resolved'],
      ['resolved', 'resolved'],
      ['dismiss', 'dismissed'],
      ['dismissed', 'dismissed'],
      ['suppress', 'suppressed'],
      ['suppressed', 'suppressed'],
      ['expire', 'expired'],
      ['expired', 'expired'],
    ])('maps short verb "%s" to canonical status "%s"', async (verb, canonical) => {
      await controller.alarmAction('alarm-1', verb, req as any, {});
      expect(alarms.transition).toHaveBeenCalledWith('alarm-1', canonical, expect.any(Object));
    });

    it('rejects an unknown action without calling transition', async () => {
      const result = await controller.alarmAction('alarm-1', 'nonsense', req as any, {});

      expect(alarms.transition).not.toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: 'Unknown action nonsense' });
    });

    it('extracts the actor id from req.user.id first, falling back to userId then "unknown"', async () => {
      await controller.alarmAction('alarm-1', 'ack', { user: { userId: 'legacy-id' } } as any, {});
      expect(alarms.transition).toHaveBeenCalledWith(
        'alarm-1',
        'acknowledged',
        expect.objectContaining({ actorId: 'legacy-id' }),
      );

      await controller.alarmAction('alarm-1', 'ack', {} as any, {});
      expect(alarms.transition).toHaveBeenCalledWith(
        'alarm-1',
        'acknowledged',
        expect.objectContaining({ actorId: 'unknown' }),
      );
    });

    it('passes the reason through, defaulting to null when absent', async () => {
      await controller.alarmAction('alarm-1', 'ack', req as any, { reason: 'false alarm' });
      expect(alarms.transition).toHaveBeenCalledWith(
        'alarm-1',
        'acknowledged',
        expect.objectContaining({ reason: 'false alarm', actorRole: 'physician' }),
      );

      await controller.alarmAction('alarm-1', 'ack', req as any, {});
      expect(alarms.transition).toHaveBeenCalledWith(
        'alarm-1',
        'acknowledged',
        expect.objectContaining({ reason: null }),
      );
    });
  });

  describe('reviewAi', () => {
    it('extracts reviewerId from req.user.id and forwards the review status', async () => {
      await controller.reviewAi('rec-1', { status: 'accepted' }, { user: { id: 'user-1' } } as any);
      expect(inbound.reviewRecommendation).toHaveBeenCalledWith('rec-1', 'accepted', 'user-1');
    });

    it('falls back to userId then "unknown" when id is absent', async () => {
      await controller.reviewAi('rec-1', { status: 'rejected' }, {
        user: { userId: 'legacy-id' },
      } as any);
      expect(inbound.reviewRecommendation).toHaveBeenCalledWith('rec-1', 'rejected', 'legacy-id');

      await controller.reviewAi('rec-1', { status: 'modified' }, {} as any);
      expect(inbound.reviewRecommendation).toHaveBeenCalledWith('rec-1', 'modified', 'unknown');
    });

    it('reports the applied status in the envelope message', async () => {
      const result = await controller.reviewAi('rec-1', { status: 'accepted' }, {
        user: { id: 'user-1' },
      } as any);
      expect(result.message).toBe('Recommendation accepted');
    });
  });

  describe('analytics', () => {
    it('computes average dispatch-to-arrival and ETA error only from complete/valid episodes', async () => {
      tracking.listEpisodes.mockResolvedValue([
        {
          arrivedAt: '2026-07-25T10:30:00.000Z',
          dispatchedAt: '2026-07-25T10:00:00.000Z',
          actualTravelMin: 30,
          predictedEtaMin: 25,
        },
        {
          arrivedAt: '2026-07-25T11:20:00.000Z',
          dispatchedAt: '2026-07-25T11:00:00.000Z',
          actualTravelMin: 20,
          predictedEtaMin: 22,
        },
        {
          // Incomplete episode: no arrivedAt yet, must be excluded from both averages.
          arrivedAt: null,
          dispatchedAt: '2026-07-25T12:00:00.000Z',
          actualTravelMin: null,
          predictedEtaMin: null,
        },
      ]);

      const result = await controller.analytics();

      expect(result.data.dispatchToArrivalAvgMin).toBe(25);
      expect(result.data.etaAccuracyMaeMin).toBe(3.5);
      expect(result.data.episodeCount).toBe(3);
    });

    it('returns null averages rather than NaN/0 when no episode qualifies', async () => {
      tracking.listEpisodes.mockResolvedValue([
        { arrivedAt: null, dispatchedAt: null, actualTravelMin: null, predictedEtaMin: null },
      ]);

      const result = await controller.analytics();

      expect(result.data.dispatchToArrivalAvgMin).toBeNull();
      expect(result.data.etaAccuracyMaeMin).toBeNull();
    });

    it('surfaces alarm performance, data-quality, and AI acceptance signals from their own snapshots', async () => {
      alarms.performanceSnapshot.mockResolvedValue({ open: 4, avgAckMin: 2 });
      inbound.analyticsSnapshot.mockResolvedValue({
        missingDataRate: 0.1,
        inboundCount: 12,
        aiAcceptanceRate: 0.75,
        pendingReviews: 3,
      });
      outbox.getHealth.mockResolvedValue({ pending: 7 });

      const result = await controller.analytics();

      expect(result.data.alarms).toEqual({ open: 4, avgAckMin: 2 });
      expect(result.data.dataQuality).toEqual({ missingDataRate: 0.1, inboundCount: 12 });
      expect(result.data.ai).toEqual({ acceptanceRate: 0.75, pendingReviews: 3 });
      expect(result.data.outbox).toEqual({ pending: 7 });
    });
  });
});
