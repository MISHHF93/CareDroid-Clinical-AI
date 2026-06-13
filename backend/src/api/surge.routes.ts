import { Router } from 'express';
import { surgeCapacityService } from '../services';

const router = Router();

router.post('/activate', async (req, res) => {
  try {
    const surgeEvent = await surgeCapacityService.activateSurgeMode(req.body);
    res.status(201).json({ success: true, surgeEvent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch-ems-intake', async (req, res) => {
  try {
    const { patients, surgeEventId } = req.body;
    if (!Array.isArray(patients)) {
      return res.status(400).json({ error: 'patients must be an array' });
    }
    if (!surgeEventId) {
      return res.status(400).json({ error: 'surgeEventId is required' });
    }

    const result = await surgeCapacityService.batchEMSIntake(patients, surgeEventId);
    return res.status(201).json({ success: true, patients: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/bottlenecks', async (_req, res) => {
  try {
    const bottlenecks = await surgeCapacityService.assessResourceBottlenecks();
    res.json(bottlenecks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deactivate', async (req, res) => {
  try {
    const { surgeEventId, debriefNotes } = req.body;
    if (!surgeEventId) {
      return res.status(400).json({ error: 'surgeEventId is required' });
    }

    const result = await surgeCapacityService.deactivateSurgeMode(
      surgeEventId,
      debriefNotes || 'No debrief notes provided',
    );
    if (!result) {
      return res.status(404).json({ error: 'surge event not found' });
    }

    return res.json({ success: true, surgeEvent: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/status', async (_req, res) => {
  try {
    const status = await surgeCapacityService.getCurrentSurgeStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
