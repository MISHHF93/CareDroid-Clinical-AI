import { Router } from 'express';
import { copilotService } from '../services/copilot.service';

const router = Router();

router.post('/query', async (req, res) => {
  try {
    const { query, user_role } = req.body;
    if (!query || !user_role) {
      return res.status(400).json({ error: 'query and user_role are required' });
    }

    const response = await copilotService.processQuery({ query, user_role });
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
