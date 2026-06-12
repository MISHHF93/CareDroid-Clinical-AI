import { Router } from 'express';
import { emsService } from '../services/ems.service';

const router = Router();

router.post('/alert', async (req, res) => {
  try {
    const patient = await emsService.createPrehospitalAlert(req.body);
    const io = req.app.get('io');
    io?.to?.('whiteboard')?.emit?.('ems_alert_received', patient);
    res.status(201).json({ message: 'EMS alert received', patient });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/status/:emsUnitId', async (req, res) => {
  try {
    const { emsUnitId } = req.params;
    const { status, eta_minutes } = req.body;

    const patient = await emsService.updateEMSStatus(emsUnitId, status, eta_minutes);
    if (!patient) {
      return res.status(404).json({ error: 'EMS unit not found' });
    }

    const io = req.app.get('io');
    io?.to?.('whiteboard')?.emit?.('ems_status_updated', patient);
    return res.json({ message: 'EMS status updated', patient });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/arrive/:emsUnitId', async (req, res) => {
  try {
    const { emsUnitId } = req.params;
    const { real_name, real_age } = req.body;

    const patient = await emsService.confirmArrival(emsUnitId, real_name, real_age);
    if (!patient) {
      return res.status(404).json({ error: 'EMS unit not found' });
    }

    const io = req.app.get('io');
    io?.to?.('whiteboard')?.emit?.('ems_arrival_confirmed', patient);
    return res.json({ message: 'EMS arrival confirmed', patient });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/incoming', async (_req, res) => {
  try {
    const incoming = await emsService.getIncomingEMS();
    res.json({ count: incoming.length, patients: incoming });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
