import { Router } from 'express';
import { smartIntakeService } from '../services/smart-intake.service';

const router = Router();

const actorFromRequest = (req: any) => req.body?.staff || req.body?.clinician || req.headers['x-caredroid-user-id'] || 'unknown-staff';

router.post('/sessions', async (req, res) => {
  try {
    const session = await smartIntakeService.createSession(actorFromRequest(req));
    res.status(201).json({ sessionId: session._id, session });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/manual-entry', async (req, res) => {
  try {
    const output = await smartIntakeService.addManualEntry(req.params.id, req.body.manual || req.body, actorFromRequest(req));
    res.json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/documents', async (req, res) => {
  try {
    const output = await smartIntakeService.addDocument(req.params.id, req.body.document || req.body, actorFromRequest(req));
    res.status(201).json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/ocr-results', async (req, res) => {
  try {
    const output = await smartIntakeService.ingestOcrResult(req.params.id, req.body, actorFromRequest(req));
    res.json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/ems-evidence', async (req, res) => {
  try {
    const output = await smartIntakeService.addEMSEvidence(req.params.id, req.body.ems || req.body, actorFromRequest(req));
    res.json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/match', async (req, res) => {
  try {
    const output = await smartIntakeService.match(req.params.id, actorFromRequest(req));
    res.json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/verify-field', async (req, res) => {
  try {
    const { field, decision, edited_value } = req.body;
    if (!field || !decision) {
      return res.status(400).json({ error: 'field and decision are required' });
    }
    const output = await smartIntakeService.verifyField(req.params.id, field, decision, actorFromRequest(req), edited_value);
    return res.json(output);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/link-patient', async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });
    const output = await smartIntakeService.linkPatient(req.params.id, patientId, actorFromRequest(req));
    return res.json(output);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/create-patient', async (req, res) => {
  try {
    const output = await smartIntakeService.createPatient(req.params.id, actorFromRequest(req));
    res.status(201).json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/continue-unknown', async (req, res) => {
  try {
    const output = await smartIntakeService.continueUnknown(
      req.params.id,
      req.body.label || 'Unknown Patient',
      actorFromRequest(req),
    );
    res.status(201).json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reconcile-unknown', async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });
    const output = await smartIntakeService.reconcileUnknown(req.params.id, patientId, actorFromRequest(req));
    return res.json(output);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/biometric-consent', async (req, res) => {
  try {
    const output = await smartIntakeService.captureBiometricConsent(req.params.id, req.body, actorFromRequest(req));
    res.json(output);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/biometric-consent/withdraw', async (req, res) => {
  try {
    const output = await smartIntakeService.withdrawBiometricConsent(req.params.id, actorFromRequest(req));
    res.json(output);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/audit-log', async (req, res) => {
  try {
    const auditLog = await smartIntakeService.getAuditLog(req.params.id);
    res.json({ count: auditLog.length, auditLog });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
