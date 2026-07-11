import { Router } from 'express';
import { emsService } from '../services';

const router = Router();
type EMSLifecycleStatus = 'dispatched' | 'on_scene' | 'en_route' | 'arrived';

const EMS_STATUS_ALIASES: Record<string, EMSLifecycleStatus> = {
  dispatched: 'dispatched',
  on_scene: 'on_scene',
  en_route: 'en_route',
  arrived: 'arrived',
  Inbound: 'en_route',
  Arrived: 'arrived',
  Handoff: 'arrived',
  Complete: 'arrived',
};

function normalizeEMSStatus(status: unknown): EMSLifecycleStatus | null {
  if (typeof status !== 'string') return null;
  return EMS_STATUS_ALIASES[status] || EMS_STATUS_ALIASES[status.toLowerCase()] || null;
}

async function dualWriteSentinelInbound(req: {
  app: { get: (key: string) => unknown };
  body: Record<string, unknown>;
}) {
  // Best-effort dual-write signal when Sentinel is enabled.
  // Never fails the legacy EMS path — EDOS compatibility first.
  try {
    const { getSentinelRuntimeConfig } = await import('../modules/sentinel/sentinel.config');
    if (!getSentinelRuntimeConfig().enabled) return;
    const io = req.app.get('io') as
      | { to?: (room: string) => { emit?: (event: string, payload: unknown) => void } }
      | undefined;
    io?.to?.('whiteboard')?.emit?.('sentinel_ems_dual_write', {
      unitId: req.body.ems_unit_id || req.body.unitId,
      at: new Date().toISOString(),
      source: 'legacy-ems-alert',
    });
  } catch {
    // swallow — dual-write is optional
  }
}

router.post('/alert', async (req, res) => {
  try {
    if (!req.body?.ems_unit_id && !req.body?.unitId) {
      return res.status(400).json({ error: 'ems_unit_id is required' });
    }
    if (req.body?.eta_minutes !== undefined && !Number.isFinite(Number(req.body.eta_minutes))) {
      return res.status(400).json({ error: 'eta_minutes must be numeric' });
    }
    if (!req.body?.triage_code && !req.body?.priority) {
      return res.status(400).json({ error: 'triage_code is required' });
    }
    const patient = await emsService.createPrehospitalAlert(req.body);
    const io = req.app.get('io');
    io?.to?.('whiteboard')?.emit?.('ems_alert_received', patient);
    await dualWriteSentinelInbound(req);
    res.status(201).json({ message: 'EMS alert received', patient });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/status/:emsUnitId', async (req, res) => {
  try {
    const { emsUnitId } = req.params;
    const { status, eta_minutes } = req.body;
    const normalizedStatus = normalizeEMSStatus(status);

    if (!normalizedStatus) {
      return res.status(400).json({ error: 'status is invalid' });
    }
    if (eta_minutes !== undefined && !Number.isFinite(Number(eta_minutes))) {
      return res.status(400).json({ error: 'eta_minutes must be numeric' });
    }

    const patient = await emsService.updateEMSStatus(emsUnitId, normalizedStatus, eta_minutes);
    if (!patient) {
      return res.status(404).json({ error: 'EMS unit not found' });
    }

    const io = req.app.get('io');
    io?.to?.('whiteboard')?.emit?.('ems_status_updated', patient);
    return res.json({ message: 'EMS status updated', patient });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/arrive/:emsUnitId', async (req, res) => {
  try {
    const { emsUnitId } = req.params;
    const { real_name, real_age } = req.body;

    const patient = await emsService.confirmArrival(emsUnitId, real_name, real_age);
    if (!patient) {
      return res.status(404).json({ error: 'EMS unit not found' });
    }

    const io = req.app.get('io');
    io?.to?.('whiteboard')?.emit?.('ems_arrival_confirmed', patient);
    return res.json({ message: 'EMS arrival confirmed', patient });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/incoming', async (_req, res) => {
  try {
    const incoming = await emsService.getIncomingEMS();
    res.json({ count: incoming.length, patients: incoming });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
