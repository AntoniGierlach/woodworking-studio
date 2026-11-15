CREATE TABLE app_offer_view_daily (
  view_date date NOT NULL,
  offer_slug varchar(100) NOT NULL,
  views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (view_date, offer_slug)
);
