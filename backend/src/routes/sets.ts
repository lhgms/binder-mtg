import { Router } from 'express';
import { fetchSets } from '../lib/scryfall.js';

const router = Router();

router.get('/api/sets', async (_req, res) => {
  try {
    const sets = await fetchSets();
    res.json(sets);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
