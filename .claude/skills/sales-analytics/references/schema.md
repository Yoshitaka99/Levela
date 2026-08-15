# sales-analytics データカタログ（本番DB実スキーマ）

自動取得元: GET /sales/api/data/schema（26テーブル）

> 列名はここを正とする。最新を厳密に確認したい時は GET /api/data/schema を叩き直す。

## analysis_results
- `id` : uuid (NOT NULL)
- `recording_id` : uuid (NULL可)
- `closing_result` : text (NULL可)
- `talk_ratio_sales` : integer (NULL可)
- `talk_ratio_customer` : integer (NULL可)
- `issues_heard` : ARRAY (NULL可)
- `proposal` : ARRAY (NULL可)
- `good_points` : ARRAY (NULL可)
- `improvement_points` : ARRAY (NULL可)
- `success_keywords` : ARRAY (NULL可)
- `summary` : text (NULL可)
- `detailed_feedback` : text (NULL可)
- `overall_rating` : text (NULL可)
- `created_at` : timestamp with time zone (NULL可)
- `summary_html` : text (NULL可)
- `root_cause` : text (NULL可)
- `hearing_depth_score` : integer (NULL可)
- `hearing_feedback` : text (NULL可)
- `hearing_details` : jsonb (NULL可)
- `reaction_quality` : text (NULL可)
- `pitch_quality` : text (NULL可)
- `talk_ratio_feedback` : text (NULL可)
- `closing_feedback` : text (NULL可)
- `payment_method` : text (NULL可)
- `payment_timing` : text (NULL可)
- `payment_confidence` : text (NULL可)
- `analysis_json` : jsonb (NULL可)

## calendar_lock_events
- `id` : uuid (NOT NULL)
- `user_id` : uuid (NOT NULL)
- `calendar_id` : text (NOT NULL)
- `event_id` : text (NOT NULL)
- `summary` : text (NULL可)
- `start_at` : timestamp with time zone (NOT NULL)
- `end_at` : timestamp with time zone (NOT NULL)
- `created_by` : uuid (NULL可)
- `created_at` : timestamp with time zone (NULL可)

## comments
- `id` : uuid (NOT NULL)
- `recording_id` : uuid (NULL可)
- `author_name` : text (NOT NULL)
- `timestamp_seconds` : double precision (NULL可)
- `comment_text` : text (NOT NULL)
- `created_at` : timestamp with time zone (NULL可)
- `user_id` : uuid (NULL可)
- `parent_id` : uuid (NULL可)
- `updated_at` : timestamp with time zone (NOT NULL)

## daily_required_slots
- `id` : uuid (NOT NULL)
- `date` : date (NOT NULL)
- `required_slots` : integer (NULL可)
- `updated_at` : timestamp with time zone (NULL可)

## daily_slots
- `id` : uuid (NOT NULL)
- `user_id` : uuid (NOT NULL)
- `date` : date (NOT NULL)
- `available_slots` : integer (NULL可)
- `slot_details` : jsonb (NULL可)
- `synced_at` : timestamp with time zone (NULL可)

## discord_connections
- `id` : uuid (NOT NULL)
- `user_id` : uuid (NULL可)
- `discord_user_id` : text (NULL可)
- `discord_username` : text (NULL可)
- `access_token` : text (NULL可)
- `refresh_token` : text (NULL可)
- `webhook_url` : text (NULL可)
- `notify_on_comment` : boolean (NULL可)
- `notify_on_analysis` : boolean (NULL可)
- `created_at` : timestamp with time zone (NULL可)

## google_calendar_connections
- `id` : uuid (NOT NULL)
- `user_id` : uuid (NOT NULL)
- `google_email` : text (NULL可)
- `access_token` : text (NULL可)
- `refresh_token` : text (NULL可)
- `token_expires_at` : timestamp with time zone (NULL可)
- `calendar_id` : text (NULL可)
- `is_active` : boolean (NULL可)
- `created_at` : timestamp with time zone (NULL可)
- `updated_at` : timestamp with time zone (NULL可)
- `scope` : text (NOT NULL)

## gw_articles
- `id` : uuid (NOT NULL)
- `user_id` : uuid (NOT NULL)
- `title` : text (NOT NULL)
- `html` : text (NULL可)
- `text_content` : text (NULL可)
- `memo` : text (NULL可)
- `conversation` : jsonb (NULL可)
- `context_id` : uuid (NULL可)
- `status` : text (NULL可)
- `created_at` : timestamp with time zone (NULL可)
- `updated_at` : timestamp with time zone (NULL可)

## gw_contexts
- `id` : uuid (NOT NULL)
- `user_id` : uuid (NOT NULL)
- `name` : text (NOT NULL)
- `reference_texts` : jsonb (NULL可)
- `style_guide` : jsonb (NULL可)
- `created_at` : timestamp with time zone (NULL可)
- `updated_at` : timestamp with time zone (NULL可)

## gw_sessions
- `token` : text (NOT NULL)
- `user_id` : uuid (NOT NULL)
- `expires_at` : timestamp with time zone (NOT NULL)
- `created_at` : timestamp with time zone (NULL可)

## gw_users
- `id` : uuid (NOT NULL)
- `email` : text (NOT NULL)
- `password_hash` : text (NOT NULL)
- `display_name` : text (NULL可)
- `created_at` : timestamp with time zone (NULL可)

## initiatives
- `id` : uuid (NOT NULL)
- `name` : text (NOT NULL)
- `start_date` : date (NOT NULL)
- `description` : text (NULL可)
- `created_by` : text (NULL可)
- `created_at` : timestamp with time zone (NULL可)
- `target_kpi` : text (NULL可)

## invite_links
- `id` : uuid (NOT NULL)
- `code` : text (NOT NULL)
- `link_type` : text (NOT NULL)
- `created_at` : timestamp with time zone (NULL可)
- `is_active` : boolean (NULL可)

## meeting_minutes
- `id` : uuid (NOT NULL)
- `recording_id` : uuid (NULL可)
- `client_name` : text (NULL可)
- `content` : jsonb (NOT NULL)
- `share_token` : text (NOT NULL)
- `created_at` : timestamp with time zone (NULL可)
- `updated_at` : timestamp with time zone (NULL可)
- `html_content` : text (NULL可)
- `minutes_type` : text (NOT NULL)

## notifications
- `id` : uuid (NOT NULL)
- `user_id` : uuid (NOT NULL)
- `type` : text (NOT NULL)
- `title` : text (NOT NULL)
- `body` : text (NULL可)
- `link` : text (NULL可)
- `is_read` : boolean (NULL可)
- `created_at` : timestamp with time zone (NULL可)

## recording_notes
- `id` : uuid (NOT NULL)
- `recording_id` : uuid (NULL可)
- `content` : text (NULL可)
- `updated_at` : timestamp with time zone (NULL可)

## recordings_cache
- `id` : uuid (NOT NULL)
- `meeting_id` : text (NOT NULL)
- `assignee` : text (NOT NULL)
- `topic` : text (NULL可)
- `start_time` : timestamp with time zone (NULL可)
- `duration` : integer (NULL可)
- `customer_name` : text (NULL可)
- `mp4_url` : text (NULL可)
- `transcript_url` : text (NULL可)
- `share_url` : text (NULL可)
- `s3_key` : text (NULL可)
- `transcript_text` : text (NULL可)
- `transcript_doc_url` : text (NULL可)
- `video_drive_url` : text (NULL可)
- `status` : text (NULL可)
- `created_at` : timestamp with time zone (NULL可)
- `updated_at` : timestamp with time zone (NULL可)
- `cancel_status` : text (NULL可)
- `result_status` : text (NULL可)
- `source` : text (NULL可)
- `vtt_raw` : text (NULL可)
- `user_id` : uuid (NULL可)
- `customer_matched` : boolean (NULL可)
- `retention_expired_at` : timestamp with time zone (NULL可)

## sales_active_log
- `id` : uuid (NOT NULL)
- `user_id` : uuid (NULL可)
- `display_name` : text (NULL可)
- `old_value` : boolean (NULL可)
- `new_value` : boolean (NULL可)
- `source` : text (NOT NULL)
- `actor` : text (NULL可)
- `reason` : text (NULL可)
- `created_at` : timestamp with time zone (NOT NULL)

## sales_active_sync_run
- `id` : uuid (NOT NULL)
- `run_at` : timestamp with time zone (NOT NULL)
- `trigger` : text (NULL可)
- `dry_run` : boolean (NOT NULL)
- `aborted` : boolean (NOT NULL)
- `abort_reason` : text (NULL可)
- `sheet_rows` : integer (NULL可)
- `matched` : integer (NULL可)
- `changed` : integer (NULL可)
- `unmatched_sheet` : integer (NULL可)
- `unmatched_tool` : integer (NULL可)
- `duplicates` : integer (NULL可)
- `details` : jsonb (NULL可)

## seminar_targets
- `id` : uuid (NOT NULL)
- `year_month` : text (NOT NULL)
- `avg_unit_price` : integer (NULL可)
- `target_revenue` : bigint (NULL可)
- `target_line_add` : integer (NULL可)
- `target_seminar_apply` : integer (NULL可)
- `target_seminar_seated` : integer (NULL可)
- `target_meeting_apply` : integer (NULL可)
- `target_meeting_seated` : integer (NULL可)
- `target_closing` : integer (NULL可)
- `created_at` : timestamp with time zone (NULL可)
- `updated_at` : timestamp with time zone (NULL可)

## seminars
- `id` : uuid (NOT NULL)
- `name` : text (NOT NULL)
- `date` : date (NOT NULL)
- `target_bookings` : integer (NULL可)
- `created_at` : timestamp with time zone (NULL可)

## sessions
- `token` : text (NOT NULL)
- `user_id` : uuid (NOT NULL)
- `expires_at` : timestamp with time zone (NOT NULL)
- `created_at` : timestamp with time zone (NULL可)

## talk_scripts
- `id` : integer (NOT NULL)
- `content` : text (NOT NULL)
- `updated_by` : text (NULL可)
- `updated_at` : timestamp with time zone (NULL可)

## users
- `id` : uuid (NOT NULL)
- `email` : text (NOT NULL)
- `password_hash` : text (NOT NULL)
- `display_name` : text (NOT NULL)
- `role` : text (NULL可)
- `created_at` : timestamp with time zone (NULL可)
- `avatar_emoji` : text (NULL可)
- `avatar_url` : text (NULL可)
- `is_active_sales` : boolean (NOT NULL)

## zoom_account_health
- `assignee` : text (NOT NULL)
- `user_id` : uuid (NULL可)
- `reauth_required` : boolean (NOT NULL)
- `last_error` : text (NULL可)
- `last_error_at` : timestamp with time zone (NULL可)
- `last_success_at` : timestamp with time zone (NULL可)
- `consecutive_failures` : integer (NOT NULL)
- `updated_at` : timestamp with time zone (NOT NULL)

## zoom_connections
- `id` : uuid (NOT NULL)
- `user_id` : uuid (NULL可)
- `zoom_account_id` : text (NULL可)
- `zoom_email` : text (NULL可)
- `access_token` : text (NULL可)
- `refresh_token` : text (NULL可)
- `token_expires_at` : timestamp with time zone (NULL可)
- `created_at` : timestamp with time zone (NULL可)
- `updated_at` : timestamp with time zone (NULL可)

