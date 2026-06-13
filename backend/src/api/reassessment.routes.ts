import { Router } from 'express';
import { reassessmentService } from '../services';

const router = Router();

const reassessmentErrorStatus = (error: any) => {
  const message = String(error?.message || '');
  if (/not found/i.test(message)) return 404;
  if (/invalid|required|reason|score|clinician|notes/i.test(message)) return 400;
  return 500;
};

router.get('/due', async (_req, res) => {
  try {
    const patients = await reassessmentService.getPatientsNeedingReassessment();
    return res.json({ count: patients.length, patients });
  } catch (error: any) {
    console.error('[EmergencyOS][ReassessmentDue] Failed to fetch reassessment patients', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch reassessment due patients',
    });
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
    return res
      .status(reassessmentErrorStatus(error))
      .json({ error: error.message || 'Reassessment failed' });
  }
});

router.post('/:patientId/dismiss', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { reason, clinician } = req.body;

    if (!reason || !clinician) {
      return res.status(400).json({ error: 'reason and clinician are required' });
    }

    const patient = await reassessmentService.dismissReassessment(patientId, reason, clinician);
    return res.json({ message: 'Reassessment dismissed', patient });
  } catch (error: any) {
    return res
      .status(reassessmentErrorStatus(error))
      .json({ error: error.message || 'Dismissal failed' });
  }
});

export default router;
