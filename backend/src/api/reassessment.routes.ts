import { Router } from 'express';
import { reassessmentService } from '../services/reassessment.service';

const router = Router();

router.get('/due', async (_req, res) => {
  try {
    const patients = await reassessmentService.getPatientsNeedingReassessment();
    res.json({ count: patients.length, patients });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch reassessment due patients' });
  }
});

router.post('/:patientId/reassess', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { new_dps_score, notes, findings, clinician } = req.body;

    if (!notes || !clinician) {
      return res.status(400).json({ error: 'notes and clinician are required' });
    }

    const patient = await reassessmentService.reassessPatient(
      patientId,
      new_dps_score ?? null,
      notes,
      findings,
      clinician,
    );

    return res.json({ message: 'Reassessment recorded', patient });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:patientId/dismiss', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { reason, clinician } = req.body;

    if (!reason || !clinician) {
      return res.status(400).json({ error: 'reason and clinician are required' });
    }

    await reassessmentService.dismissReassessment(patientId, reason, clinician);
    return res.json({ message: 'Reassessment dismissed' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
