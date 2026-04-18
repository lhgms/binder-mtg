import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import type { CardOwnership } from '../types/index.js';

const router = Router();

function naturalSort(a: CardOwnership, b: CardOwnership): number {
  return a.collector_number.localeCompare(b.collector_number, undefined, { numeric: true, sensitivity: 'base' });
}

router.get('/api/binders/:binderId/cards', async (req: Request, res: Response) => {
  const { binderId } = req.params;
  const filter = (req.query.filter as string) ?? 'all';

  const { data: binder } = await supabase.from('binders').select('id').eq('id', binderId).single();
  if (!binder) {
    res.status(404).json({ error: 'Binder not found' });
    return;
  }

  let query = supabase.from('card_ownership').select('*').eq('binder_id', binderId);

  if (filter === 'owned') {
    query = query.eq('owned', true);
  } else if (filter === 'missing') {
    query = query.eq('owned', false);
  }

  const { data: cards, error } = await query;

  if (error || !cards) {
    res.status(500).json({ error: 'Failed to fetch cards' });
    return;
  }

  cards.sort(naturalSort);
  res.json(cards);
});

router.patch('/api/binders/:binderId/cards/:cardId', async (req: Request, res: Response) => {
  const { binderId, cardId } = req.params;
  const { owned } = req.body as { owned?: unknown };

  if (typeof owned !== 'boolean') {
    res.status(400).json({ error: 'owned must be a boolean' });
    return;
  }

  const { data: card, error } = await supabase
    .from('card_ownership')
    .update({ owned })
    .eq('binder_id', binderId)
    .eq('card_id', cardId)
    .select()
    .single();

  if (error || !card) {
    res.status(404).json({ error: 'Card not found in this binder' });
    return;
  }

  res.json(card);
});

export default router;
