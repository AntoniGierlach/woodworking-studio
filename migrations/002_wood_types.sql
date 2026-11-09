CREATE TABLE app_wood_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255) NOT NULL,
  tone varchar(255) NOT NULL,
  grain varchar(255) NOT NULL,
  character varchar(255) NOT NULL,
  image_id uuid REFERENCES app_media(id) ON DELETE SET NULL,
  sort integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  date_created timestamptz NOT NULL DEFAULT now(),
  date_updated timestamptz NOT NULL DEFAULT now()
);
