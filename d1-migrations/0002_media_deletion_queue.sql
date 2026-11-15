CREATE TABLE app_media_deletion_queue (
  storage_key TEXT PRIMARY KEY NOT NULL,
  queued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
