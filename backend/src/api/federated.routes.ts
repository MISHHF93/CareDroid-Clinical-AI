import { Router } from 'express';
import { federatedEMSService } from '../services';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    path: '/federated',
    version: 'v1',
    description: 'federated learning',
    status: 'active',
  });
});

router.get('/health', (_req, res) => {
  res.json({
    status: 'ready',
    service: 'federated-ems',
  });
});

router.post('/round', async (req, res) => {
  try {
    const hospitalId = req.body?.hospitalId || req.body?.hospital_id || 'integration-hospital';
    const localModel = req.body?.localModel || req.body?.local_model;

    if (localModel !== undefined && (typeof localModel !== 'object' || Array.isArray(localModel))) {
      return res.status(400).json({ error: 'localModel must be an object when provided' });
    }

    federatedEMSService.registerLocalModel({
      hospitalId,
      localModel: localModel || { urgency: 0.35, distress: 0.24, physiology: 0.31 },
      globalModelVersion: req.body?.globalModelVersion || 'fed-ems-edge-v1',
      lastSync: new Date(),
      dataQualityScore: Number(req.body?.dataQualityScore ?? 0.9),
    });
    await federatedEMSService.federatedTrainingRound();

    return res.json({
      success: true,
      round: {
        status: 'completed',
        contributor: hospitalId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
