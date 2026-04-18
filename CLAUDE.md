# CLAUDE.md — Binder Project

## What is this project

Binder is a web application that mirrors a physical Magic: The Gathering card binder.
The user creates binders, each bound to a specific MTG set, and marks which cards they
already own. The entire purpose is clarity of progress and simplicity of interaction.

This document is the source of truth for the Claude Code session. Before implementing
anything, read this file fully. The product document is at `docs/product.pdf` and must
be consulted for any decision not covered here.

---

## The three business questions (everything must answer one of these)

1. Which binders do I have? → Home screen
2. What is in this binder? → Binder detail page
3. Do I own this card? → The owned/not-owned toggle

If a feature does not answer one of these three questions, do not build it.

---

## Stack

| Layer      | Decision                             |
|------------|--------------------------------------|
| Platform   | Web (browser)                        |
| Database   | Supabase (PostgreSQL 15)             |
| Auth       | None in this phase                   |
| Card data  | Scryfall API (public, no key needed) |

Environment variables are stored in `.env` (never commit this file).
Required vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

---

## Database — two tables only

### binders
- id (uuid, PK)
- name (text, NOT NULL, max 40 chars)
- color (text, NOT NULL, one of: white, blue, black, red, green)
- set_code (text, NOT NULL) — Scryfall set code e.g. "mkm"
- set_name (text, NOT NULL) — human-readable, cached at creation
- created_at (timestamptz, NOT NULL, DEFAULT now())
- user_id (uuid, FK to auth.users — NULL for now, auth-ready)

### card_ownership
- id (uuid, PK)
- binder_id (uuid, NOT NULL, FK → binders ON DELETE CASCADE)
- card_id (text, NOT NULL) — Scryfall UUID for a specific card printing
- collector_number (text, NOT NULL) — used for canonical sort
- owned (boolean, NOT NULL, DEFAULT false)
- user_id (uuid, FK to auth.users — NULL for now)

Full DDL is in `database/schema.sql`. Do not modify the schema without
reading that file first.

### Critical schema rules
- card_id is a Scryfall UUID per printing — not per card name. Lightning Bolt
  from Alpha and from a modern set have different card_ids. This is intentional.
- Set identity lives in the parent binder (binders.set_code), not in
  card_ownership. To find the set of any card row, JOIN binders on binder_id.
- collector_number is stored as TEXT (Scryfall uses values like "123a", "123b")
- Sorting must cast to int or use natural sort — never lexicographic
- ON DELETE CASCADE on card_ownership.binder_id — no manual cleanup needed
- UNIQUE INDEX on (binder_id, card_id) — one row per card per binder, always
- RLS is not enabled yet — policies are written and commented in schema.sql,
  ready to activate when auth lands. Zero DDL changes required at that point.

---

## Scryfall API

Base URL: https://api.scryfall.com
No auth required. Rate limit: 10 requests/second.

Fields consumed per card (discard everything else):
- id → card_id in database
- name → display name
- collector_number → sort order

Card query for loading a set:
GET /cards/search?q=set:{set_code}&order=set&dir=asc&unique=prints&page={n}
Paginate via has_more + next_page until has_more = false.

---

## What is explicitly out of scope (do not build, do not suggest)

- Price tracking or market values
- Social features, public profiles, following
- Marketplace (buy/sell/trade)
- Cross-device sync
- Shareable/public view links
- Card artwork display
- Foil flag or acquisition date
- Card copy quantity / multiplicity
- Offline mode
- Data backup

---

## Product rules that cannot be broken

- Marking a card as owned = single tap. No confirmation, no friction.
- Deleting a binder = requires explicit confirmation. Irreversible.
- Renaming a binder = no confirmation needed. Reversible.
- Home sort order = created_at DESC. No manual reordering.
- Card sort order = collector_number ASC (canonical). No user reordering.
- All cards start as owned = false when a binder is created.
- Progress counter updates in real time on every toggle.

---

## Backend

### Stack
| Layer         | Decision                                              |
|---------------|-------------------------------------------------------|
| Runtime       | Node.js + Express + TypeScript                        |
| Supabase      | @supabase/supabase-js com SERVICE_ROLE_KEY (server-side only) |
| Card data     | Scryfall API (fonte externa de sets e cards)          |

`SUPABASE_SERVICE_ROLE_KEY` nunca é exposta ao cliente. Todo acesso ao banco passa pelo backend.

### Estrutura de arquivos

backend/
├── src/
│   ├── config/
│   │   └── env.ts          ← lê e valida variáveis de ambiente
│   ├── lib/
│   │   ├── supabase.ts     ← client Supabase com SERVICE_ROLE_KEY
│   │   └── scryfall.ts     ← wrapper para a Scryfall API
│   ├── routes/
│   │   ├── binders.ts
│   │   ├── cards.ts
│   │   └── sets.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts            ← ponto de entrada, monta o app Express

### Rotas

| Método | Path                              | Descrição                        |
|--------|-----------------------------------|----------------------------------|
| GET    | /api/binders                      | Lista todos os binders           |
| POST   | /api/binders                      | Cria binder + insere cards eagerly |
| GET    | /api/binders/:id                  | Retorna binder por id            |
| PATCH  | /api/binders/:id                  | Atualiza nome ou cor             |
| DELETE | /api/binders/:id                  | Exclui binder (cascade)          |
| GET    | /api/binders/:id/cards            | Lista cards do binder            |
| PATCH  | /api/binders/:id/cards/:cardId    | Atualiza owned de um card        |
| GET    | /api/sets                         | Lista sets disponíveis (Scryfall)|

### Inserção eager de cards (POST /api/binders)

Ao criar um binder, o backend:
1. Busca todos os cards do set via Scryfall (paginado, `has_more + next_page`)
2. Aplica delay de 100ms entre páginas para respeitar o rate limit
3. Faz batch insert em `card_ownership` com `owned = false`
4. Retorna o binder criado — o frontend não precisa buscar cards separadamente

### Status da fase 2 — CONCLUÍDA

Todas as rotas foram implementadas e testadas:

| Rota                                   | Status   |
|----------------------------------------|----------|
| GET /api/sets                          | ✓ testada |
| GET /api/binders                       | ✓ testada |
| POST /api/binders                      | ✓ testada (inclui eager insert de cards) |
| GET /api/binders/:id                   | ✓ testada |
| PATCH /api/binders/:id                 | ✓ testada |
| DELETE /api/binders/:id                | ✓ testada (cascade confirmado) |
| GET /api/binders/:id/cards             | ✓ testada (ordenação por collector_number) |
| PATCH /api/binders/:id/cards/:cardId   | ✓ testada (toggle owned) |

---

## Project structure

binder/
├── CLAUDE.md              ← you are here
├── .env                   ← never commit
├── .gitignore
├── README.md
├── docs/
│   └── product.pdf        ← full product document, consult before any decision
├── database/
│   ├── schema.sql         ← full DDL, indexes, RLS stubs
│   └── seed.sql           ← manual test data (optional)
├── backend/               ← fase 2 — CONCLUÍDA
└── frontend/              ← fase 3 — próximo passo