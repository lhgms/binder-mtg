import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';
import { fetchSets, fetchCardsBySet } from '../lib/scryfall.js';
import type { BinderColor } from '../types/index.js';

const VALID_COLORS = new Set<string>(['white', 'blue', 'black', 'red', 'green']);

const router = Router();

router.post('/api/binders', async (req: Request, res: Response) => {
  const { name, color, set_code } = req.body as { name?: string; color?: string; set_code?: string };

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (name.length > 40) {
    res.status(400).json({ error: 'name must be 40 characters or fewer' });
    return;
  }
  if (!color || !VALID_COLORS.has(color)) {
    res.status(400).json({ error: 'color must be one of: white, blue, black, red, green' });
    return;
  }
  if (!set_code || typeof set_code !== 'string' || set_code.trim().length === 0) {
    res.status(400).json({ error: 'set_code is required' });
    return;
  }

  const sets = await fetchSets();
  const matchedSet = sets.find((s) => s.code === set_code.trim().toLowerCase());
  if (!matchedSet) {
    res.status(404).json({ error: 'Set not found' });
    return;
  }

  const { data: binder, error: binderError } = await supabase
    .from('binders')
    .insert({
      name: name.trim(),
      color: color as BinderColor,
      set_code: matchedSet.code,
      set_name: matchedSet.name,
      user_id: null,
    })
    .select()
    .single();

  if (binderError || !binder) {
    res.status(500).json({ error: 'Failed to create binder' });
    return;
  }

  const cards = await fetchCardsBySet(matchedSet.code);

  const rows = cards.map((card) => ({
    binder_id: binder.id,
    card_id: card.id,
    collector_number: card.collector_number,
    owned: false,
    user_id: null,
  }));

  const { error: cardsError } = await supabase.from('card_ownership').insert(rows);

  if (cardsError) {
    await supabase.from('binders').delete().eq('id', binder.id);
    res.status(500).json({ error: 'Failed to insert cards; binder rolled back' });
    return;
  }

  res.status(201).json({ binder, total_cards: rows.length });
});

router.get('/api/binders', async (_req: Request, res: Response) => {
  const { data: binders, error } = await supabase
    .from('binders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !binders) {
    res.status(500).json({ error: 'Failed to fetch binders' });
    return;
  }

  const result = await Promise.all(
    binders.map(async (binder) => {
      const progress = await getBinderProgress(binder.id);
      return { ...binder, progress };
    })
  );

  res.json(result);
});

async function getBinderProgress(binderId: string) {
  const { count: total } = await supabase
    .from('card_ownership')
    .select('*', { count: 'exact', head: true })
    .eq('binder_id', binderId);

  const { count: owned_count } = await supabase
    .from('card_ownership')
    .select('*', { count: 'exact', head: true })
    .eq('binder_id', binderId)
    .eq('owned', true);

  const t = total ?? 0;
  const o = owned_count ?? 0;
  return { total: t, owned_count: o, missing_count: t - o };
}

router.get('/api/binders/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: binder, error } = await supabase
    .from('binders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !binder) {
    res.status(404).json({ error: 'Binder not found' });
    return;
  }

  const progress = await getBinderProgress(id);
  res.json({ ...binder, progress });
});

router.patch('/api/binders/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, color } = req.body as { name?: string; color?: string };

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'name must be a non-empty string' });
      return;
    }
    if (name.length > 40) {
      res.status(400).json({ error: 'name must be 40 characters or fewer' });
      return;
    }
  }

  if (color !== undefined && !VALID_COLORS.has(color)) {
    res.status(400).json({ error: 'color must be one of: white, blue, black, red, green' });
    return;
  }

  const updates: Record<string, string> = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  const { data: binder, error } = await supabase
    .from('binders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !binder) {
    res.status(404).json({ error: 'Binder not found' });
    return;
  }

  const progress = await getBinderProgress(id);
  res.json({ ...binder, progress });
});

router.delete('/api/binders/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data: existing } = await supabase
    .from('binders')
    .select('id')
    .eq('id', id)
    .single();

  if (!existing) {
    res.status(404).json({ error: 'Binder not found' });
    return;
  }

  await supabase.from('binders').delete().eq('id', id);
  res.status(204).send();
});

export default router;
