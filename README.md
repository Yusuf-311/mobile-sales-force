# Mobile Sales Force (MSF)

Aplikasi manajemen kunjungan tenaga penjual farmasi PT Mersifarma — monorepo full-stack untuk mengelola Call List, Call Plan, dan Call Actual secara digital.

## Project Scope

Repo ini berisi source code aplikasi utama untuk backend dan frontend MSF, termasuk alur login multi-role, pengelolaan call list, approval flow, dan pencatatan kunjungan aktual. Folder screenshot, export PDF/PPT, serta file generator yang bersifat lokal atau pendukung dokumentasi tidak dimasukkan ke repository.

> Catatan: file seperti capture layar, dokumen presentasi, dan artefak lokal dikecualikan dari source control agar repository tetap fokus pada aplikasi yang benar-benar dipakai.

---

## Tech Stack

**Backend**

- **Node.js 18+** — runtime
- **Native HTTP Module** — custom request handler & router (tanpa framework tambahan)
- **PostgreSQL 14+** — database relasional
- **pg (node-postgres)** — database driver
- **dotenv** — environment variable management
- **Jest + Supertest** — backend testing

**Frontend**

- **React 18** — UI library
- **Vite 5** — build tool + dev server + HMR
- **React Router v6** — client-side routing
- **Axios** — HTTP client dengan interceptors
- **Vitest + React Testing Library** — frontend unit testing
- **Vanilla CSS** — custom design system tokens (tanpa Tailwind)

**Autentikasi**

- Bearer token (hardcoded per user, tanpa JWT library)
- 5 user bawaan: Andi (MR), Sari (MR), Doni (DM), Citra (RSM), Budi (MM)

---

## Prerequisites

Pastikan tools berikut sudah terinstal:

- **Node.js** 18+ — [https://nodejs.org](https://nodejs.org)
- **PostgreSQL** 14+ — harus sudah running
- **psql** CLI — terinstal bersama PostgreSQL

---

## Cara Install & Run

### 1. Clone Repository

```bash
git clone https://github.com/<username>/mobile-sales-force.git
cd mobile-sales-force
```

### 2. Setup Database

```bash
# Buat database (jika belum ada)
createdb msf_db

# Jalankan schema
psql -d msf_db -f backend/db/schema.sql

# Seed data awal — pilih salah satu:
psql -d msf_db -f backend/db/seed.sql    # SQL langsung
# atau
node backend/db/seed.js                   # JavaScript (Node.js)
```

### 3. Setup & Jalankan Backend

```bash
# Salin file environment
cp backend/.env.example backend/.env

# Edit backend/.env → isi DATABASE_URL sesuai konfigurasi lokal Anda:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/msf_db

# Install dependencies
cd backend && npm install

# Jalankan server
node server.js
# ✅ Server berjalan di http://localhost:3000
```

### 4. Setup & Jalankan Frontend

```bash
# Buka terminal baru, dari root project:
cd frontend && npm install

# Jalankan dev server
npm run dev
# ✅ Frontend berjalan di http://localhost:5173
```

### 5. Buka Aplikasi

1. Buka browser → `http://localhost:5173`
2. Pilih salah satu dari 5 kartu user untuk login
3. Mulai gunakan aplikasi

> **Catatan:** Vite dikonfigurasi dengan proxy `/api → http://localhost:3000`, sehingga frontend dan backend dapat berjalan bersamaan tanpa CORS issue.

---

## Menjalankan Test

```bash
# Backend tests (Jest)
cd backend && npm test

# Frontend tests (Vitest) — 14 tests
cd frontend && npm test
```

---

## Arsitektur & Struktur Folder

```
mobile-sales-force/
├── backend/                Node.js + pg
│   ├── .env.example        Template environment variables
│   ├── server.js           Entry point (listen port 3000)
│   ├── db/
│   │   ├── schema.sql      DDL — 8 tabel relasional
│   │   ├── seed.sql        DML — data master (SQL)
│   │   └── seed.js         Seed script (Node.js alternatif)
│   ├── logs/               Auto-generated log files
│   │   ├── activity.log    Track user requests
│   │   └── error.log       Track system & HTTP errors
│   ├── src/
│       ├── app.js           Native HTTP request handler + router
│       ├── config/db.js     PostgreSQL Pool
│       ├── middleware/
│       │   └── auth.js      authenticate() native module
│       ├── utils/
│       │   └── logger.js    Custom logging utility
│       └── routes/
│           ├── mcl.js       GET /api/mcl, GET /api/products
│           ├── callList.js  CRUD + submit + approve Call List
│           ├── callPlan.js  POST + GET Call Plan
│           └── callActual.js POST + GET Call Actual
│
├── frontend/               React + Vite
│   ├── vite.config.js      Vite config + API proxy + Vitest
│   ├── index.html          Entry point HTML
│   └── src/
│       ├── main.jsx         React root (AuthProvider)
│       ├── App.jsx          Layout shell (NavBar + Toast + Router)
│       ├── index.css        Design system CSS tokens
│       ├── api/
│       │   └── axiosClient.js  Axios + interceptors
│       ├── context/
│       │   ├── AuthContext.jsx  Login/logout, localStorage
│       │   └── ToastContext.jsx Toast notifications
│       ├── hooks/              Data fetching hooks
│       ├── router/             Routes + PrivateRoute guard
│       ├── components/         Forms, tables, NavBar, Spinner
│       └── pages/              Login, CallList, CallPlan, CallActual
│
└── README.md
```

---

## Token Reference

- **Budi** — MM — `token-mm`
- **Citra** — RSM — `token-rsm`
- **Doni** — DM — `token-dm`
- **Andi** — MR — `token-mr1`
- **Sari** — MR — `token-mr2`

**Hierarki approval:** MM → RSM → DM → MR  
Setiap supervisor hanya bisa approve call list dari **bawahan langsungnya** (DM approve MR, RSM approve DM, MM approve RSM).

---

## Endpoint List

**Master Data (tanpa auth role tertentu)**

- `GET /health` — health check
- `GET /api/mcl` — daftar master customers (dokter)
- `GET /api/products` — daftar produk

**Call List**

- `POST /api/call-lists` — MR buat call list (bulan + doctor_ids)
- `GET /api/call-lists` — MR: list sendiri; Supervisor: list submitted bawahan
- `GET /api/call-lists/:id` — detail call list + daftar dokter
- `PATCH /api/call-lists/:id/submit` — MR submit (draft → submitted)
- `PATCH /api/call-lists/:id/approve` — DM/RSM/MM approve atau reject

**Call Plan**

- `POST /api/call-plans` — MR buat call plan (CL harus approved)
- `GET /api/call-plans` — list call plan milik MR

**Call Actual**

- `POST /api/call-actuals` — MR catat kunjungan aktual
- `GET /api/call-actuals` — list kunjungan aktual milik MR

---

## Test Scenarios

Skenario berikut dapat dijalankan via `curl` atau Postman. Pastikan backend berjalan di `localhost:3000` dan seed data sudah dijalankan.

### Skenario 1 — Happy Path: End-to-End Flow

**Alur:** MR buat Call List → submit → DM approve → buat Call Plan → catat Call Actual.

**Step 1: MR (Andi) buat Call List**

```bash
curl -s -X POST http://localhost:3000/api/call-lists \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{"month": "2026-08", "doctor_ids": [1, 2, 3]}' | jq
```

Expected: `201` — status `draft`, doctors array berisi 3 dokter.

**Step 2: MR submit Call List**

```bash
curl -s -X PATCH http://localhost:3000/api/call-lists/1/submit \
  -H "Authorization: Bearer token-mr1" | jq
```

Expected: `200` — status berubah ke `submitted`.

**Step 3: DM (Doni) approve Call List**

```bash
curl -s -X PATCH http://localhost:3000/api/call-lists/1/approve \
  -H "Authorization: Bearer token-dm" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}' | jq
```

Expected: `200` — status `approved`, `approved_by: 3`.

**Step 4: MR buat Call Plan**

```bash
curl -s -X POST http://localhost:3000/api/call-plans \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{"call_list_id": 1, "doctor_id": 1, "visit_date": "2026-08-15", "visit_time": "09:00"}' | jq
```

Expected: `201` — call plan terbuat.

**Step 5: MR catat Call Actual (Terencana)**

```bash
curl -s -X POST http://localhost:3000/api/call-actuals \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": 1,
    "doctor_id": 1,
    "visit_date": "2026-08-15",
    "check_in_time": "09:05",
    "check_out_time": "09:45",
    "photo_url": "https://storage.example.com/photos/visit-001.jpg",
    "signature_url": "https://storage.example.com/signatures/sign-001.png",
    "detailing": [{"product_id": 1}, {"product_id": 2}]
  }' | jq
```

Expected: `201` — `visit_type: "plan"`, `status: "in_progress"`, products array.

---

### Skenario 2 — Error: Call Plan dari Call List yang Belum Approved

```bash
curl -s -X POST http://localhost:3000/api/call-plans \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{"call_list_id": 99, "doctor_id": 1, "visit_date": "2026-08-20"}' | jq
```

Expected: `422` — `"Call list must be approved to create a call plan"`

---

### Skenario 3 — Error: Duplicate Visit (Dokter Sama, Hari Sama)

```bash
curl -s -X POST http://localhost:3000/api/call-actuals \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 2, "visit_date": "2026-08-20",
    "photo_url": "https://example.com/photo.jpg",
    "signature_url": "https://example.com/sign.png",
    "detailing": [{"product_id": 1}]
  }' | jq
```

Expected (kunjungan kedua): `409` — `"A call actual for this doctor on this date already exists"`

---

### Skenario 4 — Error: Call Actual Tanpa `photo_url`

```bash
curl -s -X POST http://localhost:3000/api/call-actuals \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 3, "visit_date": "2026-08-22",
    "signature_url": "https://example.com/sign.png",
    "detailing": [{"product_id": 1}]
  }' | jq
```

Expected: `422` — `"photo_url is required"`

---

### Skenario 5 — Error: Approve oleh Supervisor yang Bukan Atasan Langsung

RSM atau MM mencoba approve Call List milik MR — padahal yang berhak hanya DM.

```bash
curl -s -X PATCH http://localhost:3000/api/call-lists/1/approve \
  -H "Authorization: Bearer token-rsm" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}' | jq
```

Expected: `403` — `"Forbidden"`

> **Mengapa?** `isDirectSupervisor()` memetakan `dm → mr`, `rsm → dm`, `mm → rsm`. RSM dan MM bukan atasan langsung MR, sehingga selalu ditolak.

---

## Logging & Monitoring

Aplikasi ini dilengkapi dengan **Custom Logger Utility** yang berjalan murni menggunakan Native Node.js `fs` module, tanpa dependensi eksternal (seperti Winston/Morgan), untuk melacak aktivitas sistem secara otomatis.

- **`logs/activity.log`**: Mencatat semua HTTP request masuk (Endpoint, Method, Timestamp). Sangat berguna sebagai **Audit Trail** untuk melihat siapa yang melakukan approval atau submit data.
- **`logs/error.log`**: Menangkap semua _Unhandled Exception_, _Database Error_, dan _HTTP Error_. Stack trace dan meta data akan di-serialize dan disimpan dengan aman. Sistem di-desain tangguh agar kebal terhadap _Circular JSON reference_ saat logging.

Semua file log ini _auto-generated_ saat aplikasi pertama kali mendeteksi request/error.

---

## Refleksi & Tools

### Tools yang Digunakan

- **Antigravity (AI coding assistant)** — scaffolding kode backend/frontend, SQL schema, unit test, review logika bisnis
- **PostgreSQL + psql** — database relasional untuk semua data transaksional
- **Postman / curl** — pengujian manual endpoint sebelum frontend siap
- **Vite** — build tool frontend dengan HMR dan proxy API
- **Vitest + React Testing Library** — unit testing komponen React

### Contoh Output Tools: Diterima vs Ditolak

**Diterima:**  
Output AI untuk `isDirectSupervisor` menghasilkan implementasi `{ dm: 'mr', rsm: 'dm', mm: 'rsm' }` yang akurat sesuai spesifikasi hierarki. Diverifikasi dengan 6 test case sebelum diintegrasikan.

**Ditolak:**  
Endpoint `PATCH /approve` awalnya tidak mereset status ke `draft` saat rejection — hanya mengubah ke `rejected`. Ditolak karena bertentangan dengan business rule bahwa rejection harus reset ke draft agar MR bisa revisi dan resubmit.

**Ditolak (lain):**  
`resolveVisitType` awalnya menggunakan string interpolation dalam query SQL (risiko SQL injection). Langsung ditolak, diganti parameterized query `$1`, `$2`, `$3`.

### Pendekatan Validasi Output Tools

1. **Review logika bisnis** — fungsi kritis diverifikasi manual terhadap spesifikasi sebelum dikomit
2. **Jalankan manual via curl** — setiap endpoint diuji dengan happy path dan edge case
3. **Schema cross-check** — constraint di schema.sql diverifikasi (CHECK, UNIQUE, ON DELETE CASCADE)
4. **Security review** — semua query SQL hanya menggunakan parameterized query
