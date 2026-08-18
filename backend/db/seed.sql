-- seed.sql
-- Mobile Sales Force (MSF) — Master data seed
-- Run AFTER schema.sql:  psql -f backend/db/schema.sql && psql -f backend/db/seed.sql

-- Users (idempotent: ON CONFLICT (token) DO NOTHING)
INSERT INTO users (name, email, role, token, region_id) VALUES
  ('Budi (MM)',   'budi@mersifarma.com',  'mm',  'token-mm',  NULL),
  ('Citra (RSM)', 'citra@mersifarma.com', 'rsm', 'token-rsm', 1),
  ('Doni (DM)',   'doni@mersifarma.com',  'dm',  'token-dm',  1),
  ('Andi (MR1)',  'andi@mersifarma.com',  'mr',  'token-mr1', 1),
  ('Sari (MR2)',  'sari@mersifarma.com',  'mr',  'token-mr2', 1)
ON CONFLICT (token) DO NOTHING;

-- Master Customers / MCL (idempotent via name+specialization)
INSERT INTO master_customers (name, specialization, address, phone) VALUES
  ('Dr. Ahmad Santoso',  'Umum',             'Jl. Merdeka No. 1, Jakarta',       '021-11111111'),
  ('Dr. Dewi Rahayu',    'Spesialis Jantung','Jl. Sudirman No. 10, Jakarta',     '021-22222222'),
  ('Dr. Budi Hartono',   'Paru',             'Jl. Gatot Subroto No. 5, Jakarta', '021-33333333'),
  ('Dr. Rina Kusuma',    'Anak',             'Jl. Thamrin No. 20, Jakarta',      '021-44444444'),
  ('Dr. Slamet Wijaya',  'Penyakit Dalam',   'Jl. Rasuna Said No. 3, Jakarta',   '021-55555555'),
  ('Dr. Maya Indriati',  'Kandungan',        'Jl. Kuningan No. 8, Jakarta',      '021-66666666'),
  ('Dr. Hendra Gunawan', 'Ortopedi',         'Jl. Senayan No. 15, Jakarta',      '021-77777777'),
  ('Dr. Lestari Putri',  'Saraf',            'Jl. Kebayoran No. 7, Jakarta',     '021-88888888'),
  ('Dr. Faisal Rahman',  'Mata',             'Jl. Fatmawati No. 12, Jakarta',    '021-99999999'),
  ('Dr. Novi Anggraini', 'Kulit',            'Jl. Cilandak No. 6, Jakarta',      '021-10101010')
ON CONFLICT DO NOTHING;

-- Products
INSERT INTO products (name, category) VALUES
  ('Cardivex 10mg',     'Kardiovaskular'),
  ('Amoxilin 500mg',    'Antibiotik'),
  ('Parasetamol 500mg', 'Analgesik'),
  ('Vitamin C 1000mg',  'Vitamin'),
  ('Metformin 500mg',   'Antidiabetes')
ON CONFLICT DO NOTHING;
