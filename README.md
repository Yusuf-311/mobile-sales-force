# Mobile Sales Force (MSF)

Aplikasi manajemen kunjungan tenaga penjual farmasi PT Mersifarma — monorepo full-stack dengan Express backend dan React frontend.

---

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **psql** CLI (terinstal bersama PostgreSQL)

---

## Backend Setup

```bash
# 1. Salin file environment dan isi DATABASE_URL
cp backend/.env.example backend/.env
# Edit backend/.env → set DATABASE_URL=postgres://user:password@localhost:5432/msf_db

# 2. Buat schema database
psql -f backend/db/schema.sql

# 3. Seed data awal (users, master_customers, products)
node backend/db/seed.js

# 4. Jalankan server
node backend/server.js
# Server berjalan di http://localhost:3000
```

---

## Frontend Setup

```bash
# 1. Salin file environment (opsional — proxy sudah dikonfigurasi via Vite)
cp frontend/.env.example frontend/.env

# 2. Install dependencies
cd frontend && npm install

# 3. Jalankan dev server
npm run dev
# Frontend berjalan di http://localhost:5173
```

> **Catatan:** Vite dikonfigurasi dengan proxy `/api → http://localhost:3000`, sehingga frontend dan backend dapat berjalan secara bersamaan tanpa CORS issue saat development.

---

## Token Reference

| User  | Role | Token       |
|-------|------|-------------|
| Budi  | MM   | `token-mm`  |
| Citra | RSM  | `token-rsm` |
| Doni  | DM   | `token-dm`  |
| Andi  | MR1  | `token-mr1` |
| Sari  | MR2  | `token-mr2` |

**Hierarki:** MM → RSM → DM → MR  
Setiap supervisor hanya bisa approve call list dari **bawahan langsungnya** (DM → MR, RSM → DM, MM → RSM).

---

## Endpoint List

| Method | Path | Role Required | Deskripsi |
|--------|------|---------------|-----------|
| GET    | `/health` | — | Health check (no auth) |
| GET    | `/api/mcl` | Any | Daftar master customers (dokter) |
| GET    | `/api/products` | Any | Daftar produk |
| GET    | `/api/call-lists` | Any | MR: list milik sendiri; DM/RSM/MM: list submitted dari bawahan langsung |
| POST   | `/api/call-lists` | MR | Buat/update call list (upsert jika draft bulan sama) |
| GET    | `/api/call-lists/:id` | Any | Detail call list beserta daftar dokter |
| PATCH  | `/api/call-lists/:id/submit` | MR | Submit call list (draft → submitted) |
| PATCH  | `/api/call-lists/:id/approve` | DM/RSM/MM | Approve atau reject call list |
| GET    | `/api/call-plans` | MR | Daftar call plan milik sendiri |
| POST   | `/api/call-plans` | MR | Buat call plan (call list harus approved) |
| GET    | `/api/call-actuals` | MR | Daftar kunjungan aktual milik sendiri |
| POST   | `/api/call-actuals` | MR | Catat kunjungan aktual |

---

## Test Commands

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

---

## Test Scenarios

Skenario-skenario berikut dapat dijalankan via `curl` atau Postman. Pastikan backend berjalan di `localhost:3000` dan seed data sudah dijalankan.

---

### Skenario 1 — Happy Path: End-to-End Flow

**Alur:** MR membuat Call List → submit → DM approve → MR membuat Call Plan → MR mencatat Call Actual.

#### Step 1: MR (Andi) membuat Call List

```bash
curl -s -X POST http://localhost:3000/api/call-lists \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{"month": "2026-08", "doctor_ids": [1, 2, 3]}' | jq
```

**Expected response (201):**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "user_id": 4,
    "month": "2026-08-01T00:00:00.000Z",
    "status": "draft",
    "doctors": [
      { "id": 1, "name": "Dr. Ahmad Santoso", "specialization": "Umum" },
      { "id": 2, "name": "Dr. Budi Prasetyo", "specialization": "Jantung" },
      { "id": 3, "name": "Dr. Citra Dewi", "specialization": "Paru" }
    ]
  }
}
```

#### Step 2: MR submit Call List

```bash
curl -s -X PATCH http://localhost:3000/api/call-lists/1/submit \
  -H "Authorization: Bearer token-mr1" | jq
```

**Expected response (200):**
```json
{
  "status": "success",
  "data": { "id": 1, "status": "submitted", ... }
}
```

#### Step 3: DM (Doni) approve Call List

```bash
curl -s -X PATCH http://localhost:3000/api/call-lists/1/approve \
  -H "Authorization: Bearer token-dm" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}' | jq
```

**Expected response (200):**
```json
{
  "status": "success",
  "data": { "id": 1, "status": "approved", "approved_by": 3, ... }
}
```

#### Step 4: MR buat Call Plan

```bash
curl -s -X POST http://localhost:3000/api/call-plans \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{"call_list_id": 1, "doctor_id": 1, "visit_date": "2026-08-15", "visit_time": "09:00"}' | jq
```

**Expected response (201):**
```json
{
  "status": "success",
  "data": { "id": 1, "call_list_id": 1, "doctor_id": 1, "visit_date": "2026-08-15", ... }
}
```

#### Step 5: MR catat Call Actual (Terencana)

```bash
    curl -s -X POST http://localhost:3000/api/call-actuals \
      -H "Authorization: Bearer token-mr1" \
      -H "Content-Type: multipart/form-data" \
      -F "plan_id=1" \
      -F "doctor_id=1" \
      -F "visit_date=2026-08-15" \
      -F "check_in_time=09:05" \
      -F "check_out_time=09:45" \
      -F "photo=@/path/to/photo.jpg" \
      -F "signature=@/path/to/signature.png" \
      -F "detailing=[{\"product_id\":1},{\"product_id\":2}]" | jq
```

**Expected response (201):**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "visit_type": "plan",
    "status": "in_progress",
    "products": [
      { "id": 1, "name": "CardioMax", "category": "Kardiovaskular" },
      { "id": 2, "name": "AmpicilinXR", "category": "Antibiotik" }
    ]
  }
}
```

---

### Skenario 2 — Error: Call Plan dari Call List yang Belum Approved

MR mencoba membuat Call Plan dari Call List dengan status bukan `approved`.

```bash
# Asumsikan call list ID 99 masih berstatus "draft" atau "submitted"
curl -s -X POST http://localhost:3000/api/call-plans \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{"call_list_id": 99, "doctor_id": 1, "visit_date": "2026-08-20"}' | jq
```

**Expected response (422):**
```json
{
  "status": "error",
  "message": "Call list must be approved to create a call plan"
}
```

---

### Skenario 3 — Error: Duplicate Visit (Dokter Sama, Hari Sama)

MR mencoba mencatat kunjungan ke dokter yang sama pada tanggal yang sudah ada.

```bash
# Kunjungan pertama (sukses)
curl -s -X POST http://localhost:3000/api/call-actuals \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 2,
    "visit_date": "2026-08-20",
    "photo_url": "https://example.com/photo1.jpg",
    "signature_url": "https://example.com/sign1.png",
    "detailing": [{"product_id": 1}]
  }' | jq

# Kunjungan kedua ke dokter & tanggal yang sama → 409
curl -s -X POST http://localhost:3000/api/call-actuals \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 2,
    "visit_date": "2026-08-20",
    "photo_url": "https://example.com/photo2.jpg",
    "signature_url": "https://example.com/sign2.png",
    "detailing": [{"product_id": 1}]
  }' | jq
```

**Expected response pada kunjungan kedua (409):**
```json
{
  "status": "error",
  "message": "A call actual for this doctor on this date already exists"
}
```

---

### Skenario 4 — Error: Call Actual Tanpa `photo_url`

MR submit Call Actual tanpa menyertakan `photo_url`.

```bash
curl -s -X POST http://localhost:3000/api/call-actuals \
  -H "Authorization: Bearer token-mr1" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 3,
    "visit_date": "2026-08-22",
    "signature_url": "https://example.com/sign3.png",
    "detailing": [{"product_id": 1}]
  }' | jq
```

**Expected response (422):**
```json
{
  "status": "error",
  "message": "photo_url is required"
}
```

---

### Skenario 5 — Error: Approve oleh Supervisor yang Bukan Atasan Langsung

RSM (Citra) atau MM (Budi) mencoba approve Call List milik MR — padahal yang berhak hanya DM.

```bash
# RSM mencoba approve call list MR → 403
curl -s -X PATCH http://localhost:3000/api/call-lists/1/approve \
  -H "Authorization: Bearer token-rsm" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}' | jq
```

**Expected response (403):**
```json
{
  "status": "error",
  "message": "Forbidden"
}
```

```bash
# MM mencoba approve call list MR → 403
curl -s -X PATCH http://localhost:3000/api/call-lists/1/approve \
  -H "Authorization: Bearer token-mm" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}' | jq
```

**Expected response (403):**
```json
{
  "status": "error",
  "message": "Forbidden"
}
```

> **Mengapa 403?** Fungsi `isDirectSupervisor(approverRole, ownerRole)` memetakan `dm → mr`, `rsm → dm`, `mm → rsm`. RSM dan MM bukan atasan langsung MR, sehingga selalu ditolak.

---

## Refleksi & Tools

### Tools yang Digunakan

| Tool | Fungsi |
|------|--------|
| **Antigravity (AI coding assistant)** | Scaffolding kode backend/frontend, menulis SQL schema, generate unit test, review logika bisnis |
| **PostgreSQL + psql** | Database relasional untuk menyimpan semua data transaksional |
| **Postman / curl** | Pengujian manual endpoint sebelum frontend siap |
| **Vite** | Build tool frontend dengan HMR dan proxy API |
| **Vitest + React Testing Library** | Unit testing komponen React |

### Contoh Output Tools: Diterima vs Ditolak

**Diterima:**  
Output AI untuk `isDirectSupervisor` menghasilkan implementasi `{ dm: 'mr', rsm: 'dm', mm: 'rsm' }` yang akurat sesuai spesifikasi hierarki. Logika ini diverifikasi dengan 6 test case (semua pasangan valid dan invalid) sebelum diintegrasikan.

**Ditolak:**  
Saat AI pertama kali menggenerate endpoint `PATCH /approve`, response untuk rejection tidak mereset status ke `draft` (hanya mengubah ke `rejected`). Output ini ditolak karena bertentangan dengan requirement 5.5 yang menyatakan rejection harus reset ke draft agar MR bisa revisi. Kode direvisi dengan `SET status = 'draft'` pada branch rejected.

**Ditolak (lain):**  
Pada versi awal `resolveVisitType`, AI menggunakan string interpolation dalam query SQL. Output ini langsung ditolak karena membuka SQL injection vulnerability. Versi final menggunakan parameterized query `$1`, `$2`, `$3` secara konsisten.

### Pendekatan Validasi Output Tools

1. **Review logika bisnis** — setiap fungsi kritis (isDirectSupervisor, resolveVisitType) diverifikasi manual terhadap spesifikasi requirement sebelum dikomit
2. **Jalankan manual via curl** — setiap endpoint diuji dengan happy path dan edge case (tanpa token, token salah, role salah) sebelum frontend dibangun
3. **Schema SQL cross-check** — kolom dan constraint di schema.sql diverifikasi terhadap tabel requirements (kolom CHECK, UNIQUE, ON DELETE CASCADE)
4. **Security review** — semua query SQL diperiksa untuk memastikan tidak ada string interpolation; hanya parameterized query yang diizinkan

### Arsitektur Singkat

```
monorepo/
├── backend/          Express + pg (Node.js)
│   ├── db/           schema.sql + seed.js
│   └── src/
│       ├── config/   db.js (pg Pool)
│       ├── middleware/auth.js (Bearer token)
│       └── routes/   mcl, callList, callPlan, callActual
└── frontend/         React + Vite
    └── src/
        ├── api/      axiosClient.js (interceptors)
        ├── context/  AuthContext, ToastContext
        ├── hooks/    useCallLists, useCallPlans, useCallActuals, useMCL, useProducts
        ├── components/ NavBar, forms, tables, Spinner
        └── pages/    Login, CallList, CallPlan, CallActual
```

**Cara menjalankan:**
1. `node backend/server.js` → backend di port 3000
2. `cd frontend && npm run dev` → frontend di port 5173
3. Buka `http://localhost:5173`, pilih user, mulai gunakan aplikasi

---

## Notes

- **File uploads**: The backend accepts multipart/form-data for `POST /api/call-actuals`. Use `-F "photo=@/path/to/photo.jpg"` and `-F "signature=@/path/to/sign.png"` in `curl` or send files from your client as `FormData`. If `multer` is not installed in your environment, the server falls back to accepting `photo_url` and `signature_url` fields (legacy mode).

- **Structured errors**: API responses use a structured error format for client-friendly handling. Error responses follow this shape:

```json
{
  "status": "error",
  "message": "Human readable message",
  "code": "optional_machine_code",
  "details": "optional technical details"
}
```

- **Commit & push**: This README change will be committed and pushed to your repository.