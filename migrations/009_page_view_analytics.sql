CREATE TABLE app_page_view_daily (
  view_date date NOT NULL,
  pathname varchar(256) NOT NULL,
  views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (view_date, pathname)
);
