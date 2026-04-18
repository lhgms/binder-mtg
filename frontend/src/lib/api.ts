import type { Binder, CardOwnership, MtgSet } from '../types';

const BASE = import.meta.env.VITE_API_URL;

// Sets
export const getSets = (): Promise<MtgSet[]> =>
  fetch(`${BASE}/api/sets`).then(r => r.json());

// Binders
export const getBinders = (): Promise<Binder[]> =>
  fetch(`${BASE}/api/binders`).then(r => r.json());

export const createBinder = (body: {
  name: string;
  color: string;
  set_code: string;
}): Promise<Binder> =>
  fetch(`${BASE}/api/binders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

export const patchBinder = (
  id: string,
  body: Partial<{ name: string; color: string }>
): Promise<Binder> =>
  fetch(`${BASE}/api/binders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

export const deleteBinder = (id: string): Promise<void> =>
  fetch(`${BASE}/api/binders/${id}`, { method: 'DELETE' }).then(() => undefined);

// Cards
export const getCards = (
  binderId: string,
  filter: 'all' | 'owned' | 'missing' = 'all'
): Promise<CardOwnership[]> =>
  fetch(`${BASE}/api/binders/${binderId}/cards?filter=${filter}`).then(r => r.json());

export const toggleCard = (
  binderId: string,
  cardId: string,
  owned: boolean
): Promise<CardOwnership> =>
  fetch(`${BASE}/api/binders/${binderId}/cards/${cardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owned }),
  }).then(r => r.json());
