import { Router } from 'express';
import { capacityService } from '../services';

const router = Router();

router.get('/dashboard', async (_req, res) => {
  try {
    const dashboard = await capacityService.getCapacityDashboard();
    return res.json(dashboard);
  } catch (error: any) {
    console.error('[EmergencyOS][CapacityDashboard] Failed to fetch capacity dashboard', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch capacity dashboard',
    });
  }
});

export default router;
