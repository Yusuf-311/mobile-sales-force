'use strict';

require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const users = [
  { name: 'Budi (MM)',  email: 'budi@mersifarma.com',  role: 'mm',  token: 'token-mm',  region_id: null },
  { name: 'Citra (RSM)', email: 'citra@mersifarma.com', role: 'rsm', token: 'token-rsm', region_id: 1 },
  { name: 'Doni (DM)',  email: 'doni@mersifarma.com',  role: 'dm',  token: 'token-dm',  region_id: 1 },
  { name: 'Andi (MR1)', email: 'andi@mersifarma.com',  role: 'mr',  token: 'token-mr1', region_id: 1 },
  { name: 'Sari (MR2)', email: 'sari@mersifarma.com',  role: 'mr',  token: 'token-mr2', region_id: 1 },
];

const masterCustomers = [
  { name: 'Dr. Ahmad Santoso',   specialization: 'Umum',              address: 'Jl. Merdeka No. 1, Jakarta',       phone: '021-11111111' },
  { name: 'Dr. Dewi Rahayu',     specialization: 'Spesialis Jantung', address: 'Jl. Sudirman No. 10, Jakarta',     phone: '021-22222222' },
  { name: 'Dr. Budi Hartono',    specialization: 'Paru',              address: 'Jl. Gatot Subroto No. 5, Jakarta', phone: '021-33333333' },
  { name: 'Dr. Rina Kusuma',     specialization: 'Anak',              address: 'Jl. Thamrin No. 20, Jakarta',      phone: '021-44444444' },
  { name: 'Dr. Slamet Wijaya',   specialization: 'Penyakit Dalam',   address: 'Jl. Rasuna Said No. 3, Jakarta',   phone: '021-55555555' },
  { name: 'Dr. Maya Indriati',   specialization: 'Kandungan',         address: 'Jl. Kuningan No. 8, Jakarta',      phone: '021-66666666' },
  { name: 'Dr. Hendra Gunawan',  specialization: 'Ortopedi',          address: 'Jl. Senayan No. 15, Jakarta',      phone: '021-77777777' },
  { name: 'Dr. Lestari Putri',   specialization: 'Saraf',             address: 'Jl. Kebayoran No. 7, Jakarta',     phone: '021-88888888' },
  { name: 'Dr. Faisal Rahman',   specialization: 'Mata',              address: 'Jl. Fatmawati No. 12, Jakarta',    phone: '021-99999999' },
  { name: 'Dr. Novi Anggraini',  specialization: 'Kulit',             address: 'Jl. Cilandak No. 6, Jakarta',      phone: '021-10101010' },
];

const products = [
  { name: 'Cardivex 10mg',     category: 'Kardiovaskular' },
  { name: 'Amoxilin 500mg',    category: 'Antibiotik'    },
  { name: 'Parasetamol 500mg', category: 'Analgesik'     },
  { name: 'Vitamin C 1000mg',  category: 'Vitamin'       },
  { name: 'Metformin 500mg',   category: 'Antidiabetes'  },
];

// ---------------------------------------------------------------------------
// Insert helpers (idempotent)
// ---------------------------------------------------------------------------

async function seedUsers(client) {
  for (const u of users) {
    await client.query(
      `INSERT INTO users (name, email, role, token, region_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (token) DO NOTHING`,
      [u.name, u.email, u.role, u.token, u.region_id]
    );
  }
  console.log(`  ✓ users (${users.length} rows attempted)`);
}

async function seedMasterCustomers(client) {
  for (const mc of masterCustomers) {
    await client.query(
      `INSERT INTO master_customers (name, specialization, address, phone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [mc.name, mc.specialization, mc.address, mc.phone]
    );
  }
  console.log(`  ✓ master_customers (${masterCustomers.length} rows attempted)`);
}

async function seedProducts(client) {
  for (const p of products) {
    await client.query(
      `INSERT INTO products (name, category)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [p.name, p.category]
    );
  }
  console.log(`  ✓ products (${products.length} rows attempted)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const client = await pool.connect();
  try {
    console.log('Seeding database…');
    await seedUsers(client);
    await seedMasterCustomers(client);
    await seedProducts(client);
    console.log('Seed complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
