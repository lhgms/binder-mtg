export type BinderColor = 'white' | 'blue' | 'black' | 'red' | 'green';

export interface Binder {
  id: string;
  name: string;
  color: BinderColor;
  set_code: string;
  set_name: string;
  created_at: string;
  user_id: string | null;
}

export interface CardOwnership {
  id: string;
  binder_id: string;
  card_id: string;
  collector_number: string;
  owned: boolean;
  user_id: string | null;
}

export interface ScryfallCard {
  id: string;
  name: string;
  collector_number: string;
}
