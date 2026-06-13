import { Router } from 'express';
import { deteriorationPredictionV3Service } from '../services';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    path: '/deterioration',
    version: 'v1',
    description: 'deterioration prediction',
    status: 'active',
    modelVersion: 'deterioration-v3-deterministic',
  });
});

router.get('/health', (_req, res) => {
  res.json(deteriorationPredictionV3Service.checkHealth());
});

router.post('/predict', (req, res) => {
  const input = req.body || {};
  const hasContext = Boolean(input.triageCode || input.triage_code || input.vitals || input.riskFlags);
  if (!hasContext) {
    return res.status(400).json({
      error: 'triageCode, vitals, or riskFlags are required',
    });
  }

  const prediction = deteriorationPredictionV3Service.predict({
    age: input.age,
    triageCode: input.triageCode || input.triage_code,
    vitals: input.vitals,
    riskFlags: input.riskFlags || input.risk_flags,
  });

  return res.json({ prediction });
});

export default router;
