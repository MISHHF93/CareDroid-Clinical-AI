import { Router } from 'express';
import { capacityService } from '../services/capacity.service';

const router = Router();

router.get('/dashboard', async (_req, res) => {
  try {
    const dashboard = await capacityService.getCapacityDashboard();
    res.json(dashboard);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch capacity dashboard' });
  }
});

export default router;
