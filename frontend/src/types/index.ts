export interface Binder {
  id: string;
  name: string;
  color: 'white' | 'blue' | 'black' | 'red' | 'green';
  set_code: string;
  set_name: string;
  created_at: string;
  total: number;
  owned_count: number;
  missing_count: number;
}

export interface CardOwnership {
  id: string;
  binder_id: string;
  card_id: string;
  collector_number: string;
  name: string;
  owned: boolean;
}

export interface MtgSet {
  code: string;
  name: string;
  released_at: string;
}
