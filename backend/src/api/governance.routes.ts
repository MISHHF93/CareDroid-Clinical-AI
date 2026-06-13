import { Router } from 'express';
import { aiGovernanceService } from '../services/ai-governance.service';

const router = Router();

router.get('/compliance', async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (Number.isFinite(days) ? days : 30));

    const report = await aiGovernanceService.generateComplianceReport(startDate, endDate);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to generate AI compliance report' });
  }
});

router.get('/violations', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const violations = await aiGovernanceService.getSafetyViolations(Number.isFinite(limit) ? limit : 50);
    res.json({ violations });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load AI safety violations' });
  }
});

router.get('/validate-prompts', (_req, res) => {
  const results = aiGovernanceService.validateAllPromptTemplates();
  res.json(results);
});

export default router;
