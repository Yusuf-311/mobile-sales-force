-- schema.sql
-- Mobile Sales Force (MSF) Database Schema

CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(100) UNIQUE NOT NULL,
  role       VARCHAR(20)  NOT NULL CHECK (role IN ('mr','dm','rsm','mm')),
  token      VARCHAR(100) UNIQUE NOT NULL,
  region_id  INTEGER
);

CREATE TABLE master_customers (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  specialization VARCHAR(100),
  address        TEXT,
  phone          VARCHAR(30)
);

CREATE TABLE products (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(150) NOT NULL,
  category VARCHAR(100)
);

CREATE TABLE call_lists (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  month       DATE    NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','submitted','approved','rejected')),
  approved_by INTEGER REFERENCES users(id),
  reason      TEXT,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE call_list_doctors (
  id                 SERIAL PRIMARY KEY,
  call_list_id       INTEGER NOT NULL REFERENCES call_lists(id) ON DELETE CASCADE,
  master_customer_id INTEGER NOT NULL REFERENCES master_customers(id),
  UNIQUE (call_list_id, master_customer_id)
);

CREATE TABLE call_plans (
  id           SERIAL PRIMARY KEY,
  call_list_id INTEGER NOT NULL REFERENCES call_lists(id),
  user_id      INTEGER NOT NULL REFERENCES users(id),
  doctor_id    INTEGER NOT NULL REFERENCES master_customers(id),
  visit_date   DATE    NOT NULL,
  visit_time   TIME,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, doctor_id, visit_date)
);

CREATE TABLE call_actuals (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  plan_id        INTEGER REFERENCES call_plans(id),
  doctor_id      INTEGER NOT NULL REFERENCES master_customers(id),
  visit_type     VARCHAR(20) NOT NULL
                 CHECK (visit_type IN ('plan','unplan','non_target')),
  visit_date     DATE        NOT NULL,
  check_in_time  TIME,
  check_out_time TIME,
  photo_url      TEXT        NOT NULL,
  signature_url  TEXT        NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                 CHECK (status IN ('in_progress','completed')),
  created_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, doctor_id, visit_date)
);

CREATE TABLE call_actual_products (
  id             SERIAL PRIMARY KEY,
  call_actual_id INTEGER NOT NULL REFERENCES call_actuals(id) ON DELETE CASCADE,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  UNIQUE (call_actual_id, product_id)
);
