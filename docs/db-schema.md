# Database Schema (Supabase)

Last updated: 2026-01-29

This document reflects the current public schema in Supabase for the MVP single-user mode.

## Core Vocabulary Tables

### words
- Purpose: Canonical word list.
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - text (text)
  - language (text, default 'en')
  - created_at (timestamptz, default now())
- Referenced by:
  - word_entries.word_id
  - word_memory_states.word_id
  - word_memory_session_items.word_id
  - word_memory_events.word_id
  - word_memory_cards.primary_word_id

### word_entries
- Purpose: Word instances imported or added (context, source, AI outputs).
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - word_id (uuid, FK -> words.id)
  - source_text (text, nullable)
  - context_line (text, nullable)
  - context (text)
  - brief (text)
  - detail (text)
  - max_chars (int, nullable)
  - provider (text, default 'lulu')
  - provider_payload (jsonb, nullable)
  - created_at (timestamptz, default now())
  - source_link (text, nullable)

### word_sync_jobs
- Purpose: Track sync/import runs from external word providers.
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - provider (text, default 'lulu')
  - status (text, default 'pending')
  - started_at (timestamptz, nullable)
  - finished_at (timestamptz, nullable)
  - error (text, nullable)
  - created_at (timestamptz, default now())

### ai_generations
- Purpose: Cache AI generation results by type and input hash.
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - type (text)
  - input_hash (text)
  - key (text)
  - content (text)
  - meta (jsonb, default '{}')
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())

## Memory / Recommendation System

### word_memory_states
- Purpose: Per-word memory state (single-user).
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - word_id (uuid, FK -> words.id)
  - memory_score (numeric, default 0)
  - exposure_count (int, default 0)
  - success_count (int, default 0)
  - fail_count (int, default 0)
  - last_exposed_at (timestamptz, nullable)
  - last_interaction_at (timestamptz, nullable)
  - stability (numeric, default 0)
  - daily_open_count (int, default 0)
  - daily_difficulty (numeric, default 0)
  - daily_window_at (timestamptz, nullable)
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())
- Notes:
  - updated_at maintained by trigger on update.

### word_memory_sessions
- Purpose: Ad-hoc memory session (feed-driven).
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - status (text, default 'active')
  - group_size (int, default 10)
  - opened_card_count (int, default 0)
  - started_at (timestamptz, default now())
  - completed_at (timestamptz, nullable)
  - params (jsonb, nullable)
  - created_at (timestamptz, default now())

### word_memory_session_items
- Purpose: Words within a memory session.
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - session_id (uuid, FK -> word_memory_sessions.id)
  - word_id (uuid, FK -> words.id)
  - rank (int, nullable)
  - priority (numeric, nullable)
  - opened_card (bool, default false)
  - completed (bool, default false)
  - completed_at (timestamptz, nullable)
  - created_at (timestamptz, default now())

### word_memory_events
- Purpose: Event log for memory actions.
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - word_id (uuid, FK -> words.id, nullable)
  - session_id (uuid, FK -> word_memory_sessions.id, nullable)
  - event_type (text)
  - delta_score (numeric, nullable)
  - payload (jsonb, nullable)
  - created_at (timestamptz, default now())

### word_memory_settings
- Purpose: Global memory algorithm parameters (single row).
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - daily_target (int, default 35)
  - weight_forget (numeric, default 1)
  - weight_novelty (numeric, default 1)
  - weight_backlog (numeric, default 1)
  - weight_score (numeric, default 1)
  - weight_difficulty (numeric, default 0.6)
  - half_life_base (numeric, default 3)
  - half_life_growth (numeric, default 0.3)
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())
- Notes:
  - updated_at maintained by trigger on update.

## Daily Task / AI Sentence Cards

### word_memory_daily_tasks
- Purpose: Daily task batch.
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - task_date (date)
  - status (text, default 'pending')
  - target_words (int, default 20)
  - card_count (int, default 0)
  - created_at (timestamptz, default now())
  - completed_at (timestamptz, nullable)

### word_memory_cards
- Purpose: AI-generated sentence cards for daily tasks.
- Columns:
  - id (uuid, PK, default gen_random_uuid())
  - task_id (uuid, FK -> word_memory_daily_tasks.id)
  - primary_word_id (uuid, FK -> words.id)
  - extra_word_ids (uuid[], default '{}')
  - sentence (text)
  - word_count (int)
  - char_count (int)
  - created_at (timestamptz, default now())

## Functions

### get_memory_settings()
- Returns the latest row from word_memory_settings, with defaults if empty.

### get_memory_feed(p_limit int)
- Returns scored memory feed for recommendation:
  - word_id, word_text, memory_score, exposure_count, success_count, fail_count,
    last_exposed_at, stability, priority

### apply_memory_event(p_word_id, p_session_id, p_event_type, p_delta_score, p_payload, p_tz)
- Appends to word_memory_events and updates word_memory_states.
- Note (2026-01-31): For score-impacting events (open_card/mark_known/mark_unknown), memory_score updates are idempotent per word + event_type per day (day boundary uses p_tz, default UTC). The event log is still written, but state changes only apply once per day for the same word/event_type.
- Note (2026-01-31): If open_card occurs for a word on a given day, subsequent mark_known updates for the same word/day are ignored for scoring (event log still records).

## Triggers

### set_updated_at()
- Updates updated_at on:
  - word_memory_states
  - word_memory_settings
