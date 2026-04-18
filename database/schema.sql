-- =============================================================================
-- Binder — Database Schema
-- Version 1.0 | April 2025
--
-- Apply this file via the Supabase SQL Editor or CLI.
-- Run top to bottom, in order. Do not reorder blocks.
-- =============================================================================


-- =============================================================================
-- TABLE: binders
--
-- One row per binder created by the user.
-- Each binder is bound to exactly one Scryfall set and one Magic color.
-- user_id exists for forward compatibility with auth — NULL until auth lands.
-- =============================================================================

CREATE TABLE binders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL CHECK (char_length(name) <= 40),
  color       text        NOT NULL CHECK (color IN ('white','blue','black','red','green')),
  set_code    text        NOT NULL,
  set_name    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid        REFERENCES auth.users(id)
);

-- Home screen default sort: most recently created first
CREATE INDEX binders_created_at_idx ON binders (created_at DESC);

-- Future: fast lookup by user when RLS is enabled
CREATE INDEX binders_user_id_idx ON binders (user_id);


-- =============================================================================
-- TABLE: card_ownership
--
-- One row per card per binder.
-- All rows are created when a binder is first opened, with owned = false.
-- The user's only interaction is toggling owned true/false.
--
-- IDENTITY MODEL — important for future scaling:
--
-- Set identity lives in the parent binder (binders.set_code), not here.
-- This table does not need its own set_code column — the relationship is:
--   card_ownership → binder → set_code
-- To find the set of any card row, JOIN binders on binder_id.
--
-- card_id is the Scryfall UUID for a specific printing of a card.
-- Scryfall treats each printing as a distinct object — Lightning Bolt from
-- Alpha and Lightning Bolt from a modern set have different card_ids.
-- This means the model naturally supports multiple binders for the same
-- card name across different sets, with no collision.
--
-- The UNIQUE INDEX on (binder_id, card_id) enforces that a specific printing
-- appears exactly once per binder — which is the correct constraint.
--
-- Forward compatibility note:
-- If the product ever expands to cross-set search, collection analytics,
-- or "show me all sets where I own this card", the card_id as Scryfall UUID
-- is the correct join key across binders. No schema change needed.
--
-- collector_number is stored as TEXT because Scryfall uses values like
-- "123a", "123b" for variants. Sorting must cast to int or use natural sort.
-- Never sort this column lexicographically.
--
-- ON DELETE CASCADE ensures that deleting a binder removes all its card rows
-- automatically. No application-level cleanup required.
-- =============================================================================

CREATE TABLE card_ownership (
  id                uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  binder_id         uuid     NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
  card_id           text     NOT NULL,
  collector_number  text     NOT NULL,
  owned             boolean  NOT NULL DEFAULT false,
  user_id           uuid     REFERENCES auth.users(id)
);

-- Uniqueness: one row per card per binder — prevents duplicates even if the
-- client calls the Scryfall API twice for the same set
CREATE UNIQUE INDEX card_ownership_binder_card_uidx
  ON card_ownership (binder_id, card_id);

-- Fast full-list load for the binder page
CREATE INDEX card_ownership_binder_id_idx
  ON card_ownership (binder_id);

-- Fast load + canonical sort by collector number (used in binder page query)
CREATE INDEX card_ownership_collector_num_idx
  ON card_ownership (binder_id, collector_number ASC);


-- =============================================================================
-- PROGRESS QUERY (reference — not executed here)
--
-- This is the query used to calculate the progress counter shown on the
-- Home screen card and inside the binder header.
--
-- SELECT
--   COUNT(*)                          AS total,
--   COUNT(*) FILTER (WHERE owned)     AS owned_count,
--   COUNT(*) FILTER (WHERE NOT owned) AS missing_count
-- FROM card_ownership
-- WHERE binder_id = $1;
-- =============================================================================


-- =============================================================================
-- ROW LEVEL SECURITY — forward compatibility
--
-- RLS is NOT enabled in this phase. Auth does not exist yet.
-- These statements are written and ready. When auth lands:
--   1. Uncomment the ALTER TABLE lines
--   2. Uncomment the CREATE POLICY lines
--   3. No DDL changes to the tables themselves are needed
-- =============================================================================

-- ALTER TABLE binders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE card_ownership ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY binders_owner ON binders
--   USING (user_id = auth.uid());

-- CREATE POLICY card_ownership_owner ON card_ownership
--   USING (user_id = auth.uid());