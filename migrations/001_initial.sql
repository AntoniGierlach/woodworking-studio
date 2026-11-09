CREATE TABLE app_admin_login_attempts (
  key_hash char(64) PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);

CREATE TABLE app_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  visibility text NOT NULL CHECK (visibility IN ('public', 'private')),
  alt text,
  date_created timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  short_description varchar(500),
  content text,
  image_id uuid REFERENCES app_media(id) ON DELETE SET NULL,
  sort integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  category varchar(255),
  short_description varchar(500),
  description text,
  cover_image_id uuid REFERENCES app_media(id) ON DELETE SET NULL,
  sort integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_project_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES app_projects(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES app_media(id) ON DELETE RESTRICT,
  alt varchar(255),
  sort integer NOT NULL DEFAULT 0,
  UNIQUE (project_id, media_id)
);

CREATE TABLE app_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  content text,
  meta_title varchar(255),
  meta_description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  excerpt varchar(500),
  content text NOT NULL DEFAULT '',
  cover_image_id uuid REFERENCES app_media(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name varchar(255),
  phone varchar(100),
  email varchar(320),
  address text,
  service_area varchar(255),
  facebook_url text,
  instagram_url text,
  footer_text text,
  seo_title varchar(255),
  seo_description text,
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  email varchar(320) NOT NULL,
  phone varchar(40),
  subject varchar(120),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'done')),
  email_notification_status text NOT NULL DEFAULT 'pending'
    CHECK (email_notification_status IN ('pending', 'sent', 'failed')),
  email_notification_error text,
  date_created timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES app_messages(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  original_filename varchar(255) NOT NULL,
  mime_type varchar(255) NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  date_created timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_services_published_sort_idx ON app_services(status, sort);
CREATE INDEX app_projects_published_sort_idx ON app_projects(status, sort);
CREATE INDEX app_posts_published_idx ON app_posts(status, published_at DESC);
CREATE INDEX app_messages_date_created_idx ON app_messages(date_created DESC);
CREATE INDEX app_message_attachments_message_idx ON app_message_attachments(message_id);
