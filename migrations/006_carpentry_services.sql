CREATE TABLE app_carpentry_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL CHECK (btrim(title) <> ''),
  description text NOT NULL CHECK (btrim(description) <> ''),
  price varchar(120) CHECK (price IS NULL OR btrim(price) <> ''),
  sort integer NOT NULL DEFAULT 0 CHECK (sort BETWEEN -100000 AND 100000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_carpentry_services_published_sort_idx
  ON app_carpentry_services(status, sort);
