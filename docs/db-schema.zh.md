# 数据库 Schema 设计说明（中文）

更新时间：2026-01-29

本文档基于 Supabase `public` schema 的实际结构，面向单用户 MVP。重点说明每张表以及字段用途，便于 review。

## 核心单词数据

### words（单词主表）
- 作用：单词的唯一主表，所有单词都在这里归档。
- 字段：
  - id (uuid, PK)：单词主键 ID。
  - text (text)：单词文本。
  - language (text, default 'en')：语言标识。
  - created_at (timestamptz)：创建时间。
- 被引用：
  - word_entries.word_id
  - word_memory_states.word_id
  - word_memory_session_items.word_id
  - word_memory_events.word_id
  - word_memory_cards.primary_word_id

### word_entries（单词实例/上下文记录）
- 作用：记录单词的上下文、来源、AI 产出等信息，支持按日期聚合。
- 字段：
  - id (uuid, PK)：记录 ID。
  - word_id (uuid, FK -> words.id)：关联单词。
  - source_text (text, nullable)：原文/来源文本。
  - context_line (text, nullable)：上下文语句（清洗后）。
  - context (text)：上下文内容（用于 AI）。
  - brief (text)：简要解释。
  - detail (text)：详细解释。
  - max_chars (int, nullable)：上下文长度限制。
  - provider (text, default 'lulu')：来源渠道。
  - provider_payload (jsonb, nullable)：来源附加数据。
  - created_at (timestamptz)：创建时间。
  - source_link (text, nullable)：来源链接。

### word_sync_jobs（同步任务记录）
- 作用：记录外部词源同步任务状态。
- 字段：
  - id (uuid, PK)
  - provider (text, default 'lulu')：同步来源。
  - status (text, default 'pending')：任务状态。
  - started_at (timestamptz, nullable)：开始时间。
  - finished_at (timestamptz, nullable)：结束时间。
  - error (text, nullable)：错误信息。
  - created_at (timestamptz)：创建时间。

### ai_generations（AI 缓存）
- 作用：缓存所有 AI 生成内容，避免重复调用。
- 字段：
  - id (uuid, PK)
  - type (text)：生成类型（解释/卡片/分组/句子等）。
  - input_hash (text)：输入哈希。
  - key (text)：逻辑唯一键。
  - content (text)：生成内容。
  - meta (jsonb, default '{}')：元信息。
  - created_at (timestamptz)
  - updated_at (timestamptz)

## 记忆与推荐系统

### word_memory_states（单词记忆状态）
- 作用：单词级记忆状态（单用户）。
- 字段：
  - id (uuid, PK)
  - word_id (uuid, FK -> words.id)：关联单词。
  - memory_score (numeric, default 0)：记忆分数，越高越熟。
  - exposure_count (int, default 0)：曝光次数。
  - success_count (int, default 0)：正向反馈次数。
  - fail_count (int, default 0)：负向反馈次数。
  - last_exposed_at (timestamptz, nullable)：最近曝光时间。
  - last_interaction_at (timestamptz, nullable)：最近交互时间。
  - stability (numeric, default 0)：稳定度（衰减用）。
  - daily_open_count (int, default 0)：当日打开次数。
  - daily_difficulty (numeric, default 0)：当日困难度。
  - daily_window_at (timestamptz, nullable)：当日窗口起点。
  - created_at (timestamptz)
  - updated_at (timestamptz)
- 说明：updated_at 由触发器自动更新。

### word_memory_sessions（即时记忆 Session）
- 作用：记录一次记忆 session（feed 生成的一组词）。
- 字段：
  - id (uuid, PK)
  - status (text, default 'active')：状态（active/completed/abandoned）。
  - group_size (int, default 10)：本次 session 单词数。
  - opened_card_count (int, default 0)：本次 session 打开卡片的数量。
  - started_at (timestamptz)
  - completed_at (timestamptz, nullable)
  - params (jsonb, nullable)：生成时参数。
  - created_at (timestamptz)

### word_memory_session_items（Session 内单词）
- 作用：记录某个 session 内的具体单词状态。
- 字段：
  - id (uuid, PK)
  - session_id (uuid, FK -> word_memory_sessions.id)
  - word_id (uuid, FK -> words.id)
  - rank (int, nullable)：推荐序位。
  - priority (numeric, nullable)：当时的推荐分数。
  - opened_card (bool, default false)：是否打开卡片。
  - completed (bool, default false)：是否完成。
  - completed_at (timestamptz, nullable)
  - created_at (timestamptz)

### word_memory_events（行为事件）
- 作用：记录用户行为，用于记忆分数更新和学习迭代。
- 字段：
  - id (uuid, PK)
  - word_id (uuid, FK -> words.id, nullable)：关联单词。
  - session_id (uuid, FK -> word_memory_sessions.id, nullable)：关联 session。
  - event_type (text)：事件类型（exposure/open_card/mark_known/mark_unknown 等）。
  - delta_score (numeric, nullable)：额外分数调整。
  - payload (jsonb, nullable)：事件细节。
  - created_at (timestamptz)

### word_memory_settings（推荐算法参数）
- 作用：全局推荐参数（单行）。
- 字段：
  - id (uuid, PK)
  - daily_target (int, default 35)：每日目标词数。
  - weight_forget (numeric, default 1)：遗忘风险权重。
  - weight_novelty (numeric, default 1)：新词权重。
  - weight_backlog (numeric, default 1)：曝光不足惩罚权重。
  - weight_score (numeric, default 1)：记忆分数权重。
  - weight_difficulty (numeric, default 0.6)：当日困难度权重。
  - half_life_base (numeric, default 3)：基础半衰期（天）。
  - half_life_growth (numeric, default 0.3)：随稳定度增长的半衰期系数。
  - created_at (timestamptz)
  - updated_at (timestamptz)
- 说明：updated_at 由触发器自动更新。

## 每日任务与 AI 句子卡片

### word_memory_daily_tasks（每日任务）
- 作用：按天生成的学习任务批次。
- 字段：
  - id (uuid, PK)
  - task_date (date)：任务日期。
  - status (text, default 'pending')：状态（pending/running/completed）。
  - target_words (int, default 20)：本日目标词数。
  - card_count (int, default 0)：生成的卡片数量。
  - created_at (timestamptz)
  - completed_at (timestamptz, nullable)

### word_memory_cards（每日 AI 卡片）
- 作用：AI 生成的高信息密度句子卡片。
- 字段：
  - id (uuid, PK)
  - task_id (uuid, FK -> word_memory_daily_tasks.id)
  - primary_word_id (uuid, FK -> words.id)：主词 A。
  - extra_word_ids (uuid[], default '{}')：附带词 B/C/D。
  - sentence (text)：AI 生成句子（1-2 句）。
  - word_count (int)：该卡片包含的单词数。
  - char_count (int)：句子字符数。
  - created_at (timestamptz)

## 函数与触发器

### get_memory_settings()
- 作用：读取最新的推荐参数配置（若空则返回默认值）。

### get_memory_feed(p_limit int)
- 作用：按推荐分数计算并返回 feed。

### apply_memory_event(p_word_id, p_session_id, p_event_type, p_delta_score, p_payload, p_tz)
- 作用：写入事件 + 更新记忆状态。
- 备注（2026-01-31）：对会影响分数的事件（open_card/mark_known/mark_unknown），同一 word + event_type 在同一天只会对 memory_score 生效一次（“同一天”使用 p_tz 的日界线，默认 UTC）。事件日志仍会写入，但状态更新仅当日首次生效。
- 备注（2026-01-31）：若同一单词当天发生 open_card，则当天的 mark_known 记分将被忽略（事件仍会记录）。

### set_updated_at() 触发器
- 自动更新 updated_at：
  - word_memory_states
  - word_memory_settings
