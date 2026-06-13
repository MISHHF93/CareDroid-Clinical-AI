import { Router } from 'express';
import { clinicalProtocolService } from '../services';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    path: '/protocol',
    version: 'v1',
    description: 'clinical protocol triggers',
    status: 'active',
    protocols: clinicalProtocolService.listProtocols(),
  });
});

router.get('/health', (_req, res) => {
  res.json(clinicalProtocolService.checkHealth());
});

router.get('/evaluate', (req, res) => {
  const chiefComplaint = String(req.query.chiefComplaint || req.query.chief_complaint || '');
  const flags = String(req.query.flags || '')
    .split(',')
    .map((flag) => flag.trim())
    .filter(Boolean);

  if (!chiefComplaint && flags.length === 0) {
    return res.status(400).json({ error: 'chiefComplaint or flags are required' });
  }

  const vitals = {
    hr: req.query.hr === undefined ? undefined : Number(req.query.hr),
    sbp: req.query.sbp === undefined ? undefined : Number(req.query.sbp),
    temp: req.query.temp === undefined ? undefined : Number(req.query.temp),
    spo2: req.query.spo2 === undefined ? undefined : Number(req.query.spo2),
  };
  const matches = clinicalProtocolService.matchProtocols({
    chiefComplaint,
    flags,
    vitals,
  });

  return res.json({
    matchedCount: matches.length,
    protocols: matches,
    humanReviewRequired: matches.some((protocol) => protocol.humanReviewRequired),
  });
});

export default router;
