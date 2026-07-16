import { Router } from 'express';
import { patientSafetyContextFromRecord } from '../../../lib/ai/clinicalSafetyRules';
import { aiGovernanceService } from '../services/ai-governance.service';

const router = Router();

router.get('/registry', (_req, res) => {
  res.json(aiGovernanceService.getRegistrySnapshot());
});

router.get('/safety-rules', (_req, res) => {
  res.json(aiGovernanceService.getRegistrySnapshot().safetyRules);
});

router.get('/compliance', async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (Number.isFinite(days) ? days : 30));

    const report = await aiGovernanceService.generateComplianceReport(startDate, endDate);
    res.json(report);
  } catch (error: any) {
    // Architect Mode Stage C: structured error envelope (no bare string-only failures)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL',
        message: error?.message || 'Failed to generate AI compliance report',
        statusCode: 500,
      },
    });
  }
});

router.get('/violations', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const violations = await aiGovernanceService.getSafetyViolations(
      Number.isFinite(limit) ? limit : 50,
    );
    res.json({ violations });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL',
        message: error?.message || 'Failed to load AI safety violations',
        statusCode: 500,
      },
    });
  }
});

router.get('/validate-prompts', (_req, res) => {
  const results = aiGovernanceService.validateAllPromptTemplates();
  res.json(results);
});

router.post('/evaluate-priority-change', (req, res) => {
  const requestedDps = Number(req.body?.requestedDps);
  if (!Number.isFinite(requestedDps) || requestedDps < 1 || requestedDps > 5) {
    return res.status(400).json({
      allowed: false,
      requiresHumanReview: true,
      blockReasons: ['invalid_requested_dps'],
      floorReasons: [],
      message: 'requestedDps must be an integer between 1 and 5.',
    });
  }

  const evaluation = aiGovernanceService.evaluatePriorityChange(
    patientSafetyContextFromRecord(req.body?.patient || {}),
    requestedDps,
  );
  return res.json(evaluation);
});

export default router;
