import { Router } from 'express';
import { boardingService, dischargePredictionService } from '../services';

const router = Router();

router.post('/track-decision', async (req, res) => {
  try {
    const { patientId, clinicianId } = req.body;
    if (!patientId || !clinicianId) {
      return res.status(400).json({ error: 'patientId and clinicianId are required' });
    }

    const decision = await boardingService.trackDecisionToAdmit(patientId, clinicianId);
    return res.json({
      success: true,
      message: 'Decision to admit tracked',
      ...decision,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/metrics', async (_req, res) => {
  try {
    const metrics = await boardingService.calculateBoardMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/report', async (_req, res) => {
  try {
    const report = await boardingService.generateBoardReport();
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/boarded', async (_req, res) => {
  try {
    const patients = await boardingService.getBoardedPatients();
    res.json(patients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/discharge-readiness/:patientId', async (req, res) => {
  try {
    const readiness = await dischargePredictionService.calculateDischargeReadiness(
      req.params.patientId,
    );
    res.json(readiness);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/same-day-discharges', async (_req, res) => {
  try {
    const discharges = await dischargePredictionService.identifySameDayDischarges();
    res.json({ count: discharges.length, patients: discharges });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
