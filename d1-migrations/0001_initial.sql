CREATE TABLE app_admin_login_attempts (
  key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL, locked_until INTEGER
);
CREATE TABLE app_contact_rate_limits (
  key_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL CHECK (attempts > 0),
  reset_at INTEGER NOT NULL
);
CREATE INDEX app_contact_rate_limits_reset_at_idx ON app_contact_rate_limits(reset_at);

CREATE TABLE app_media (
  id TEXT PRIMARY KEY NOT NULL, storage_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL, mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  alt TEXT, date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE app_services (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  short_description TEXT, content TEXT, price TEXT,
  image_id TEXT REFERENCES app_media(id) ON DELETE SET NULL,
  sort INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE app_projects (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  category TEXT, short_description TEXT, description TEXT,
  cover_image_id TEXT REFERENCES app_media(id) ON DELETE SET NULL,
  sort INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE app_project_images (
  id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES app_media(id) ON DELETE RESTRICT,
  alt TEXT, sort INTEGER NOT NULL DEFAULT 0, UNIQUE (project_id, media_id)
);
CREATE TABLE app_wood_types (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, tone TEXT NOT NULL,
  grain TEXT NOT NULL, character TEXT NOT NULL,
  image_id TEXT REFERENCES app_media(id) ON DELETE SET NULL,
  sort INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE app_carpentry_services (
  id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL CHECK (trim(title) <> ''),
  description TEXT NOT NULL CHECK (trim(description) <> ''),
  price TEXT CHECK (price IS NULL OR trim(price) <> ''),
  sort INTEGER NOT NULL DEFAULT 0 CHECK (sort BETWEEN -100000 AND 100000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE app_site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), company_name TEXT, phone TEXT,
  email TEXT, address TEXT, tax_id TEXT, opening_hours TEXT, service_area TEXT,
  facebook_url TEXT, instagram_url TEXT, footer_text TEXT, seo_title TEXT,
  seo_description TEXT, date_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE app_messages (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
  phone TEXT, subject TEXT, message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done')),
  email_notification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_notification_status IN ('pending', 'sent', 'failed')),
  email_notification_error TEXT, is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE app_message_attachments (
  id TEXT PRIMARY KEY NOT NULL, message_id TEXT NOT NULL REFERENCES app_messages(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE, original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  date_created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX app_services_published_sort_idx ON app_services(status, sort);
CREATE INDEX app_projects_published_sort_idx ON app_projects(status, sort);
CREATE INDEX app_carpentry_services_published_sort_idx ON app_carpentry_services(status, sort);
CREATE INDEX app_messages_date_created_idx ON app_messages(date_created DESC);
CREATE INDEX app_message_attachments_message_idx ON app_message_attachments(message_id);
