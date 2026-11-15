CREATE TABLE app_contact_rate_limits (
  key_hash char(64) PRIMARY KEY,
  attempts integer NOT NULL CHECK (attempts > 0),
  reset_at timestamptz NOT NULL
);

CREATE INDEX app_contact_rate_limits_reset_at_idx
  ON app_contact_rate_limits (reset_at);
