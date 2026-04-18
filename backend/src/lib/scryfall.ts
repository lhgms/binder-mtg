import type { ScryfallCard } from '../types/index.js';

const BASE_URL = 'https://api.scryfall.com';
const ALLOWED_SET_TYPES = new Set(['core', 'expansion', 'draft_innovation']);

interface ScryfallSet {
  code: string;
  name: string;
  released_at: string;
  set_type: string;
}

interface ScryfallSetsResponse {
  object: string;
  data: ScryfallSet[];
}

interface ScryfallSearchResponse {
  object: string;
  has_more: boolean;
  next_page?: string;
  data: Array<{ id: string; name: string; collector_number: string }>;
}

export async function fetchSets(): Promise<{ code: string; name: string; released_at: string }[]> {
  const res = await fetch(`${BASE_URL}/sets`);
  if (!res.ok) {
    throw new Error(`Scryfall /sets failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as ScryfallSetsResponse;
  return body.data
    .filter((s) => ALLOWED_SET_TYPES.has(s.set_type))
    .map(({ code, name, released_at }) => ({ code, name, released_at }))
    .sort((a, b) => b.released_at.localeCompare(a.released_at));
}

export async function fetchCardsBySet(setCode: string): Promise<ScryfallCard[]> {
  const params = new URLSearchParams({
    q: `set:${setCode}`,
    order: 'set',
    dir: 'asc',
    unique: 'prints',
  });

  let url: string = `${BASE_URL}/cards/search?${params}`;
  const cards: ScryfallCard[] = [];

  while (true) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Scryfall /cards/search failed for set "${setCode}": ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as ScryfallSearchResponse;
    for (const card of body.data) {
      cards.push({ id: card.id, name: card.name, collector_number: card.collector_number });
    }
    if (!body.has_more || !body.next_page) break;
    url = body.next_page;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return cards;
}
