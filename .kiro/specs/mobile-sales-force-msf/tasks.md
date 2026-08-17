# Implementation Plan: Mobile Sales Force (MSF)

## Overview

Implementasi monorepo full-stack MSF dalam urutan: infrastruktur → database → backend core → backend routes → frontend core → frontend pages → dokumentasi. Backend dibangun lebih dahulu agar dapat diuji via Postman/curl sebelum frontend. Setiap grup diakhiri dengan checkpoint.

---

## Tasks

- [x] 1. Monorepo Setup
  - [x] 1.1 Buat struktur folder root dan konfigurasi dasar
    - Buat folder `backend/` dan `frontend/` di root
    - Buat `.gitignore` di root: abaikan `node_modules/`, `.env`, `dist/`, `coverage/`
    - Buat `backend/package.json` dengan dependencies: `express`, `pg`, `cors`, `dotenv`; devDependencies: `jest`, `fast-check`, `supertest`; scripts: `start`, `dev`, `test`
    - Buat `frontend/package.json` dengan dependencies: `react@^18`, `react-dom@^18`, `react-router-dom@^6`, `axios`; devDependencies: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@vitejs/plugin-react`, `vite`; scripts: `dev`, `build`, `test`
    - Buat `backend/.env.example` dengan variabel: `DATABASE_URL`, `PORT=3000`; dokumentasikan semua variabel yang wajib diisi — gunakan `process.env` untuk semua config, jangan hardcode nilai di source
    - Buat `frontend/.env.example` dengan `VITE_API_URL=http://localhost:3000`; semua env var frontend harus menggunakan prefix `VITE_`
    - _Requirements: 14.1_

- [x] 2. Database — Schema dan Seed
  - [x] 2.1 Buat `backend/db/schema.sql`
    - Tulis `CREATE TABLE` untuk 8 tabel: `users`, `master_customers`, `products`, `call_lists`, `call_list_doctors`, `call_plans`, `call_actuals`, `call_actual_products`
    - Terapkan semua constraints: `CHECK`, `UNIQUE`, `REFERENCES ... ON DELETE CASCADE`, `DEFAULT`
    - Kolom `call_lists.status` CHECK `IN ('draft','submitted','approved','rejected')`
    - Kolom `call_actuals.visit_type` CHECK `IN ('plan','unplan','non_target')`
    - Kolom `call_actuals.status` CHECK `IN ('in_progress','completed')`
    - _Requirements: 1.6, 2.1, 2.4, 14.3_

  - [x] 2.2 Buat `backend/db/seed.js`
    - Tulis Node.js script yang connect ke DB via `pg` dan insert data secara idempotent (`ON CONFLICT DO NOTHING`)
    - Insert 5 users: Budi (MM, token-mm), Citra (RSM, token-rsm), Doni (DM, token-dm), Andi (MR1, token-mr1), Sari (MR2, token-mr2)
    - Insert 10 master_customers dengan spesialisasi bervariasi (Umum, Jantung, Paru, Anak, dll.)
    - Insert 5 products dengan kategori bervariasi (Kardiovaskular, Antibiotik, Analgesik, Vitamin, Antidiabetes)
    - _Requirements: 1.5, 2.2, 2.4, 14.6_

  - [x] 2.3 Checkpoint — Verifikasi database
    - Pastikan `psql -f backend/db/schema.sql` berhasil tanpa error
    - Pastikan `node backend/db/seed.js` berhasil dan data dapat diquery
    - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Backend Core
  - [x] 3.1 Buat `backend/src/config/db.js`
    - Inisialisasi `Pool` dari library `pg` menggunakan `process.env.DATABASE_URL`
    - Export pool instance sebagai satu-satunya modul koneksi DB — semua route wajib import pool dari file ini; jangan buat ad-hoc connections di route lain
    - _Requirements: 14.1_

  - [x] 3.2 Buat `backend/src/middleware/auth.js`
    - Ekstrak Bearer token dari header `Authorization`: periksa dulu apakah header ada dan formatnya `Bearer <token>` sebelum melakukan `.split(' ')`; jika header tidak ada atau malformed, langsung return 401 tanpa membiarkan runtime error lolos ke `next(err)`
    - Jalankan `SELECT id, name, role, region_id FROM users WHERE token = $1` menggunakan parameterized query — tidak boleh ada string interpolation SQL
    - Jika user ditemukan: set `req.user` dan panggil `next()`
    - Jika tidak ditemukan: return `res.status(401).json({ status: 'error', message: 'Unauthorized' })`
    - Bungkus seluruh handler dalam `async function` dengan `try/catch`; error tak terduga diteruskan ke `next(err)`
    - Sertakan helper `requireRole(...roles)` sebagai named export
    - _Requirements: 1.3, 1.4_

  - [x] 3.3 Buat `backend/src/app.js`
    - Setup Express: `cors({ origin: process.env.CORS_ORIGIN || '*' })`, `express.json()`
    - Mount middleware auth global (kecuali health check jika ada)
    - Mount routes: `/api/mcl` → mcl.js, `/api/products` → mcl.js (keduanya dilayani oleh file yang sama), `/api/call-lists` → callList.js, `/api/call-plans` → callPlan.js, `/api/call-actuals` → callActual.js
    - Tambahkan global error handler: `(err, req, res, next)` → log error + return HTTP 500 JSON `{ status: 'error', message: 'Internal server error' }`; jangan expose pesan error DB mentah ke client
    - _Requirements: 14.5_

  - [x] 3.4 Buat `backend/server.js`
    - Panggil `require('dotenv').config()`
    - Import app dari `./src/app.js`
    - Jalankan `app.listen(process.env.PORT || 3000)`
    - _Requirements: 14.1_

  - [x] 3.5 Checkpoint — Verifikasi backend core
    - Jalankan `node backend/server.js` dan pastikan server berjalan
    - Uji endpoint tanpa token → harus dapat 401
    - Uji dengan token valid (token-mr1) → auth middleware lolos
    - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend Routes — MCL
  - [x] 4.1 Buat `backend/src/routes/mcl.js`
    - `GET /api/mcl`: `SELECT id, name, specialization, address, phone FROM master_customers ORDER BY name`; return `{ status: 'success', data: [...] }`
    - `GET /api/products`: `SELECT id, name, category FROM products ORDER BY name`; return `{ status: 'success', data: [...] }`
    - Semua query menggunakan parameterized queries (`$1`, `$2`, ...); tidak ada string interpolation dalam SQL
    - Setiap route handler adalah `async function` dibungkus `try/catch`; error tak terduga diteruskan ke `next(err)`
    - File ini di-mount di `app.js` dua kali: `app.use('/api', mclRouter)` sehingga `/api/mcl` dan `/api/products` keduanya terlayani
    - _Requirements: 2.3, 2.4_

- [x] 5. Backend Routes — Call List
  - [x] 5.1 Buat `backend/src/routes/callList.js` — helpers dan GET endpoints
    - Implementasi helper `isDirectSupervisor(approverRole, ownerRole)`: map `{ dm: 'mr', rsm: 'dm', mm: 'rsm' }`
    - Implementasi helper `requireRole` (atau import dari auth.js)
    - `GET /api/call-lists`:
      - Jika role `mr`: SELECT milik `req.user.id`
      - Jika role `dm/rsm/mm`: SELECT call_lists dengan status `submitted` milik bawahan langsung (join users, filter by subordinate role)
    - `GET /api/call-lists/:id`:
      - Fetch by id → 404 jika tidak ada
      - Jika role `mr`: periksa `call_list.user_id === req.user.id` → 403 jika tidak cocok
      - Jika role `dm/rsm/mm`: fetch role pemilik dari tabel users; panggil `isDirectSupervisor(req.user.role, owner.role)` → 403 jika false
      - Fetch doctors dari `call_list_doctors JOIN master_customers`
      - Return `{ status: 'success', data: { ...callList, doctors: [...] } }`
    - Semua query menggunakan parameterized queries; semua handler `async` dengan `try/catch` dan `next(err)` untuk unexpected errors
    - _Requirements: 3.5, 3.6, 3.7_

  - [x] 5.2 Buat POST dan PATCH submit di `callList.js`
    - `POST /api/call-lists`:
      - Validasi eksplisit field request body sebelum menyentuh DB: periksa `month` ada, `doctor_ids` adalah array tidak kosong → 422 jika gagal
      - Validasi semua `doctor_ids` exist di `master_customers` menggunakan parameterized query → 422 jika ada yang tidak valid
      - Cek existing call_list untuk `user_id` + `month`:
        - `draft` → hapus doctors lama, insert baru, return updated
        - Bukan draft → 409
        - Tidak ada → INSERT baru + doctors
      - Return 201 dengan data call list + doctors
    - `PATCH /api/call-lists/:id/submit`:
      - Validasi 404, 403 (ownership), status !== 'draft' → 422
      - UPDATE status = 'submitted'
    - Semua query parameterized; semua handler `async` dengan `try/catch` dan `next(err)`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_

  - [x] 5.3 Buat PATCH approve di `callList.js`
    - `PATCH /api/call-lists/:id/approve`:
      - Fetch call list → 404 jika tidak ada
      - Fetch owner role dari users table menggunakan parameterized query
      - `isDirectSupervisor(req.user.role, owner.role)` → 403 jika false
      - Jika status bukan `submitted` → 422 (hanya call list yang sudah disubmit bisa di-approve atau reject; status lain seperti `approved`, `draft`, `rejected` semua menghasilkan 422)
      - `body.status === 'rejected'` tanpa `reason` atau reason kosong → 422
      - Jika rejected: UPDATE status='draft', simpan reason, set approved_by (reset otomatis ke draft sesuai desain)
      - Jika approved: UPDATE status='approved', set approved_by
    - Semua query parameterized; handler `async` dengan `try/catch` dan `next(err)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 5.4 Tulis unit test untuk `isDirectSupervisor`
    - Test semua pasangan valid: `(dm, mr)` → true, `(rsm, dm)` → true, `(mm, rsm)` → true
    - Test semua pasangan invalid: `(mm, mr)` → false, `(mr, dm)` → false, `(dm, rsm)` → false
    - Test edge case: role tidak dikenal → false
    - _Requirements: 13.6_

  - [ ]* 5.5 Tulis property test: submit only from draft (Property 5)
    - **Property 5: Submit only transitions from draft**
    - **Validates: Requirements 4.1, 4.2**
    - Generate call list dengan status arbitrary; pastikan submit sukses hanya jika status = 'draft'; status lain → 422

  - [ ]* 5.6 Tulis property test: approval requires direct supervisor (Property 6)
    - **Property 6: Approval requires direct supervisor**
    - **Validates: Requirements 5.3**
    - Generate kombinasi approverRole dan ownerRole; pastikan non-direct-supervisor selalu → 403

  - [ ]* 5.7 Tulis property test: rejection resets to draft (Property 7)
    - **Property 7: Rejection always resets to draft**
    - **Validates: Requirements 5.2, 5.5**
    - Generate submitted call list + valid supervisor; reject dengan reason; pastikan status akhir = 'draft' dan reason tersimpan

  - [ ]* 5.8 Tulis property test: rejection requires reason (Property 8)
    - **Property 8: Rejection requires reason field**
    - **Validates: Requirements 5.6**
    - Generate request dengan status='rejected' tanpa reason atau reason kosong → selalu 422

  - [x] 5.9 Checkpoint — Call List routes
    - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Backend Routes — Call Plan
  - [x] 6.1 Buat `backend/src/routes/callPlan.js`
    - `POST /api/call-plans`:
      - Validasi field request body eksplisit sebelum menyentuh DB: periksa `call_list_id`, `doctor_id`, `visit_date` ada → 422 jika tidak
      - Fetch call list → 404
      - Status !== 'approved' → 422
      - `doctor_id` tidak ada di `call_list_doctors` untuk call_list_id ini → 422 (gunakan parameterized query)
      - `visit_date` bulannya tidak cocok dengan call list `month` → 422
      - Duplicate `(user_id, doctor_id, visit_date)` → 409
      - INSERT ke `call_plans`, return 201
    - `GET /api/call-plans`: SELECT WHERE `user_id = req.user.id` ORDER BY visit_date ASC
    - Semua query parameterized (`$1`, `$2`, ...); semua handler `async` dengan `try/catch` dan `next(err)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 6.2 Tulis property test: call plan requires approved call list (Property 10)
    - **Property 10: Call plan requires approved call list**
    - **Validates: Requirements 6.2, 13.2**
    - Generate call_list dengan status selain 'approved'; POST call-plan → selalu 422

  - [ ]* 6.3 Tulis property test: call plan date within month (Property 11)
    - **Property 11: Call plan date must be within call list month**
    - **Validates: Requirements 6.4**
    - Generate visit_date di luar bulan call list; POST → selalu 422

  - [ ]* 6.4 Tulis property test: no duplicate call plans (Property 12)
    - **Property 12: No duplicate call plans per doctor per day**
    - **Validates: Requirements 6.5**
    - Insert call plan pertama sukses; insert kedua dengan (user_id, doctor_id, visit_date) sama → 409

  - [x] 6.5 Checkpoint — Call Plan routes
    - Ensure all tests pass, ask the user if questions arise.

- [-] 7. Backend Routes — Call Actual
  - [x] 7.1 Buat `backend/src/routes/callActual.js` — helper resolveVisitType
    - Implementasi helper `resolveVisitType(planId, userId, doctorId, visitDate, db)`:
      - Jika `planId` ada: fetch plan menggunakan parameterized query, validasi ownership (403) dan doctor match (422), return `'plan'`
      - Jika `planId` null: cek apakah doctor ada di approved call list MR untuk bulan visit_date → return `'unplan'`
      - Else: cek apakah doctor ada di `master_customers` → return `'non_target'`; jika tidak ada → throw 422
    - Semua query di helper menggunakan parameterized queries
    - _Requirements: 7.2, 8.1, 8.2, 9.1, 9.2_

  - [x] 7.2 Implementasi POST dan GET di `callActual.js`
    - `POST /api/call-actuals`:
      - Validasi field request body eksplisit sebelum menyentuh DB: periksa `doctor_id`, `visit_date` ada
      - Validasi `photo_url` tidak kosong → 422
      - Validasi `signature_url` tidak kosong → 422
      - Validasi `detailing` array minimal 1 item → 422
      - Cek duplicate `(user_id, doctor_id, visit_date)` menggunakan parameterized query → 409
      - Panggil `resolveVisitType` untuk menentukan `visit_type`
      - INSERT ke `call_actuals`, lalu INSERT ke `call_actual_products` untuk setiap product_id
      - Return 201 dengan data lengkap termasuk products
    - `GET /api/call-actuals`: SELECT WHERE `user_id = req.user.id` ORDER BY visit_date DESC
    - Semua query parameterized; handler `async` dengan `try/catch` dan `next(err)` untuk unexpected errors
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.3, 8.4, 9.3, 9.4_

  - [ ]* 7.3 Tulis unit test untuk `resolveVisitType`
    - Test branch plan: planId valid + ownership cocok + doctor cocok → 'plan'
    - Test branch unplan: planId null + doctor ada di approved call list bulan ini → 'unplan'
    - Test branch non_target: planId null + doctor tidak di call list tapi ada di MCL → 'non_target'
    - Test error: planId null + doctor tidak di MCL → throw 422
    - Test error: planId ada tapi doctor tidak cocok → throw 422
    - _Requirements: 13.6_

  - [ ]* 7.4 Tulis property test: no duplicate call actuals (Property 14)
    - **Property 14: No duplicate call actuals per doctor per day**
    - **Validates: Requirements 7.8, 8.3, 9.3, 13.3**
    - Generate (user_id, doctor_id, visit_date); insert pertama sukses; insert kedua → selalu 409

  - [ ]* 7.5 Tulis property test: visit type resolution is deterministic (Property 15)
    - **Property 15: Visit type resolution is deterministic**
    - **Validates: Requirements 8.1, 8.2, 9.1, 9.2**
    - Generate kombinasi (planId, doctorId, approvedListDoctors, mclDoctors); verifikasi tipe yang di-resolve selalu deterministik sesuai decision tree

  - [ ]* 7.6 Tulis property test: required fields enforced on call actuals (Property 16)
    - **Property 16: Required fields are enforced on call actuals**
    - **Validates: Requirements 7.5, 7.6, 7.7, 8.4, 9.4, 13.4**
    - Generate request dengan salah satu dari photo_url/signature_url/detailing kosong atau hilang → selalu 422

  - [-] 7.7 Checkpoint — Call Actual routes + backend complete
    - Ensure all tests pass, ask the user if questions arise.

- [~] 8. Frontend Core
  - [~] 8.1 Buat `frontend/vite.config.js` dan `frontend/src/main.jsx`
    - `vite.config.js`: gunakan `@vitejs/plugin-react` untuk Fast Refresh; konfigurasi proxy `server.proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }` agar semua request `/api/*` diteruskan ke backend saat dev; jaga file tetap minimal (hanya plugin + proxy)
    - `frontend/index.html`: entry point HTML standar Vite
    - `main.jsx`: render `<App />` ke `document.getElementById('root')`, wrap dengan `<AuthProvider>`
    - _Requirements: 14.1_

  - [~] 8.2 Buat `frontend/src/api/axiosClient.js`
    - Buat Axios instance dengan `baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000'` — gunakan `import.meta.env.VITE_API_URL`, bukan URL yang dihardcode
    - Request interceptor: baca `localStorage.getItem('token')`, inject `Authorization: Bearer <token>`
    - Response interceptor: pada status 401 → `localStorage.clear()` + `window.location.href = '/login'`
    - Export sebagai default
    - _Requirements: 1.3, 1.4_

  - [~] 8.3 Buat `frontend/src/context/AuthContext.jsx`
    - Definisikan array `USERS` dengan 5 user (label, role, token)
    - State `user` diinisialisasi dari `localStorage` (token, role, userName)
    - Fungsi `login(selectedUser)`: simpan ke localStorage + update state
    - Fungsi `logout()`: `localStorage.clear()` + set user null
    - Export `AuthProvider`, `AuthContext`, `useAuth`
    - _Requirements: 1.3_

  - [~] 8.4 Buat `frontend/src/router/AppRouter.jsx`
    - Definisikan `PrivateRoute`: jika `user` null → `<Navigate to="/login" replace />`
    - Routes: `/login`, `/call-lists`, `/call-plans`, `/call-actuals`, `*` redirect ke `/call-lists`
    - Semua route kecuali `/login` dibungkus `<PrivateRoute>`
    - _Requirements: 1.3_

  - [~] 8.5 Buat `frontend/src/App.jsx`
    - Render `<AppRouter />` sebagai root component
    - Sertakan `ToastContext` provider (atau state Toast lokal) yang menyediakan `showToast` ke seluruh aplikasi
    - Tambahkan komponen NavBar dengan `<nav>` semantik yang memuat links ke `/call-lists`, `/call-plans`, `/call-actuals`, tombol logout, dan nama/role pengguna saat ini; NavBar hanya ditampilkan saat user sudah login
    - _Requirements: 10.6, 11.6, 12.9_

  - [~] 8.6 Buat common components: `Spinner.jsx` dan `Toast.jsx`
    - `Spinner.jsx`: div dengan class `spinner`, `aria-label="Loading..."`, `role="status"`; CSS: circular border animation, centered
    - `Toast.jsx`: komponen notification transient (sukses/error) dengan auto-dismiss 3 detik; variant `success` (hijau) dan `error` (merah); posisi fixed top screen
    - _Requirements: 10.5, 10.6, 11.5, 12.8_

  - [ ] 8.7a Buat custom hooks di `frontend/src/hooks/`
    - Buat `useCallLists.js`: `useState` untuk `data`, `loading`, `error`; `useEffect` untuk initial fetch dari `GET /api/call-lists`; expose fungsi `refresh()` yang memanggil ulang fetch; komponen halaman wajib menggunakan hook ini alih-alih inline fetch
    - Buat `useCallPlans.js`: struktur serupa; initial fetch dari `GET /api/call-plans`; expose `refresh()`
    - Buat `useCallActuals.js`: struktur serupa; initial fetch dari `GET /api/call-actuals`; expose `refresh()`
    - Buat `useMCL.js`: fetch dari `GET /api/mcl`; cache data (tidak perlu refresh — MCL jarang berubah); expose `data` dan `loading`
    - Buat `useProducts.js`: fetch dari `GET /api/products`; cache data; expose `data` dan `loading`
    - Setiap hook: pisahkan logika data fetching dari rendering — komponen hanya konsumsi data dari hook, tidak ada `axios.get` langsung di dalam komponen halaman
    - _Requirements: 10.1, 10.3, 11.1, 11.3, 12.1, 12.7_

  - [~] 8.7 Checkpoint — Frontend core
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Frontend Pages — Login
  - [~] 9.1 Buat `frontend/src/pages/LoginPage.jsx`
    - Gunakan elemen semantik: `<main>` sebagai wrapper halaman, `<section>` untuk grid kartu
    - Tampilkan judul "Mobile Sales Force — PT Mersifarma" dan subtitle
    - Render grid 5 card (Andi MR1, Sari MR2, Doni DM, Citra RSM, Budi MM) menggunakan `<button>` (bukan `<div>`) untuk setiap card; min touch target 44×44px
    - Tiap card: klik → panggil `login(selectedUser)` dari `useAuth()`
    - Setelah login: navigate ke `/call-lists`
    - Jika sudah login (user !== null): redirect langsung ke `/call-lists`
    - Mobile-first CSS: cards responsif mulai 375px, min touch target 44px, setiap interactive element memiliki visible focus ring dan hover state
    - _Requirements: 1.3_

- [ ] 10. Frontend Pages — Call List
  - [~] 10.1 Buat `frontend/src/components/CallListForm.jsx`
    - Hanya tampil jika `role === 'mr'`
    - Gunakan elemen semantik: `<form>` sebagai wrapper, bukan `<div>`
    - `<input type="month">` untuk bulan (required) — controlled input dengan `useState`
    - Multi-select dokter: gunakan hook `useMCL()` untuk data dokter; tampilkan sebagai checkbox list atau multi-select; state selection dikontrol via `useState`
    - Semua field form menggunakan controlled inputs (`useState` per field); disable tombol submit saat loading
    - Submit button → POST /api/call-lists → showToast sukses/error → panggil `refresh()` dari `useCallLists()`
    - Tampilkan Spinner saat loading, disable button
    - _Requirements: 10.1, 10.2, 10.5, 10.6, 10.7_

  - [~] 10.2 Buat `frontend/src/components/CallListTable.jsx`
    - Gunakan elemen semantik: `<section>` sebagai wrapper, `<table>` dengan `role="region"` dan `aria-label` deskriptif; header kolom menggunakan `<th scope="col">`
    - Kolom MR view: ID, Bulan, Status (badge warna), Jumlah Dokter, Aksi
    - Kolom DM/RSM/MM view: ID, MR, Bulan, Status (badge), Jumlah Dokter, Aksi
    - Badge warna: draft=abu, submitted=biru, approved=hijau, rejected=merah
    - Tombol "Submit" hanya pada rows status `draft` (MR view) → PATCH :id/submit; tombol menggunakan `<button>` bukan `<div>` atau `<span>`, dengan focus ring visible
    - Tombol "Setujui" dan "Tolak" hanya pada rows status `submitted` (supervisor view)
    - "Setujui" → confirm dialog → PATCH approve `{status:'approved'}`
    - "Tolak" → input reason dialog → PATCH approve `{status:'rejected', reason}`
    - `overflow-x: auto` wrapper untuk mobile scroll
    - _Requirements: 10.3, 10.4_

  - [~] 10.3 Buat `frontend/src/pages/CallListPage.jsx`
    - Gunakan `<main>` sebagai wrapper halaman
    - Gunakan hook `useCallLists()` untuk data dan refresh; jangan fetch inline di dalam komponen
    - Render `<CallListForm />` + `<CallListTable data={callLists} onRefresh={refresh} />`
    - Terapkan loading state dan error handling dari hook
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 11. Frontend Pages — Call Plan
  - [~] 11.1 Buat `frontend/src/components/CallPlanForm.jsx`
    - Gunakan `<form>` sebagai wrapper semantik
    - Dropdown approved Call List: gunakan `useCallLists()`, filter client-side ke status `approved`; controlled input dengan `useState`
    - Saat Call List dipilih: fetch `GET /api/call-lists/:id` untuk ambil daftar dokter, populate Doctor dropdown
    - `<input type="date">` untuk tanggal (required) — controlled input
    - `<input type="time">` untuk waktu (required) — controlled input
    - Semua field form menggunakan controlled inputs; disable tombol submit saat loading
    - Submit → POST /api/call-plans → showToast; pada 409 tampilkan "Dokter sudah dijadwalkan pada tanggal ini"
    - Spinner + disabled button saat loading
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.6_

  - [~] 11.2 Buat `frontend/src/components/CallPlanTable.jsx`
    - Gunakan `<table>` dengan `role="region"` dan `aria-label`; header kolom `<th scope="col">`
    - Kolom: ID, Call List, Dokter, Tanggal, Waktu
    - `overflow-x: auto` wrapper
    - _Requirements: 11.3_

  - [~] 11.3 Buat `frontend/src/pages/CallPlanPage.jsx`
    - Gunakan `<main>` sebagai wrapper halaman
    - Hanya accessible untuk role `mr` (redirect jika bukan)
    - Gunakan hook `useCallPlans()` untuk data dan refresh
    - Render `<CallPlanForm />` + `<CallPlanTable />`
    - _Requirements: 11.1, 11.3, 11.7_

- [ ] 12. Frontend Pages — Call Actual
  - [~] 12.1 Buat `frontend/src/components/CallActualForm.jsx`
    - Gunakan `<form>` sebagai wrapper semantik
    - Mode selector (radio/tabs): **Terencana** | **Unplan** | **Non Target** — controlled dengan `useState`
    - Mode Terencana: dropdown Call Plan menggunakan `useCallPlans()`; doctor field auto-fill read-only dari plan
    - Mode Unplan/Non Target: dropdown dokter menggunakan `useMCL()`
    - Field bersama: `<input type="date">`, `<input type="time">` (check-in), `<input type="time">` (check-out), photo URL text input, signature URL text input — semua controlled inputs dengan `useState`
    - Multi-select produk: gunakan `useProducts()`; minimal 1 required; controlled input
    - Semua field form menggunakan controlled inputs; disable tombol submit saat loading
    - Submit:
      - Mode Terencana → kirim `plan_id = selectedPlan.id`
      - Mode Unplan/Non Target → kirim `plan_id = null`
    - Spinner + disabled button saat loading
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8, 12.9_

  - [~] 12.2 Buat `frontend/src/components/CallActualTable.jsx`
    - Gunakan `<table>` dengan `role="region"` dan `aria-label`; header kolom `<th scope="col">`
    - Kolom: ID, Dokter, Tanggal, Tipe Kunjungan, Status (badge)
    - Badge: `in_progress`=kuning, `completed`=hijau
    - `overflow-x: auto` wrapper
    - _Requirements: 12.7_

  - [~] 12.3 Buat `frontend/src/pages/CallActualPage.jsx`
    - Gunakan `<main>` sebagai wrapper halaman
    - Hanya accessible untuk role `mr`
    - Gunakan hook `useCallActuals()` untuk data dan refresh
    - Render `<CallActualForm />` + `<CallActualTable />`
    - _Requirements: 12.1, 12.6, 12.10_

  - [~] 12.4 Checkpoint — Semua halaman frontend
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Frontend Tests
  - [ ]* 13.1 Tulis unit test untuk `axiosClient`
    - Test request interceptor: jika localStorage berisi token → header `Authorization: Bearer <token>` disertakan
    - Test response interceptor: response dengan status 401 → localStorage dibersihkan + redirect ke `/login`
    - _Requirements: 1.3, 1.4_

  - [ ]* 13.2 Tulis unit test untuk `LoginPage`
    - Test: klik card user → token yang benar tersimpan di localStorage + navigate ke `/call-lists`
    - Gunakan Vitest + React Testing Library + `userEvent`
    - _Requirements: 1.3_

  - [ ]* 13.3 Tulis unit test untuk `PrivateRoute`
    - Test: user tidak terautentikasi (tidak ada token di localStorage) → redirect ke `/login`
    - Test: user terautentikasi → children dirender
    - _Requirements: 1.3_

  - [ ]* 13.4 Tulis unit test untuk `CallActualForm` — mode switching
    - Test: mode default 'Terencana' → tampilkan Call Plan dropdown; doctor field read-only
    - Test: switch ke 'Unplan' → Call Plan dropdown hilang; tampilkan Doctor dropdown
    - Test: switch ke 'Non Target' → tampilkan Doctor dropdown
    - _Requirements: 12.1, 12.2_

  - [~] 13.5 Checkpoint — Backend tests + frontend tests selesai
    - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Backend Property Tests — Lanjutan
  - [ ]* 14.1 Tulis property test: call list data isolation (Property 4)
    - **Property 4: Call list data isolation between MRs**
    - **Validates: Requirements 3.5, 3.7**
    - Untuk dua MR berbeda: GET /api/call-lists user A tidak mengandung call list milik user B

  - [ ]* 14.2 Tulis property test: role-based access enforcement (Property 1)
    - **Property 1: Role-based access enforcement**
    - **Validates: Requirements 1.3**
    - Generate kombinasi endpoint + role yang tidak diizinkan → selalu 403

  - [ ]* 14.3 Tulis property test: error responses always include status and message (Property 17)
    - **Property 17: Error responses always include status and message**
    - **Validates: Requirements 14.5**
    - Generate berbagai request yang menghasilkan 4xx; verifikasi semua response body mengandung field `status` dan `message`

- [ ] 15. Dokumentasi
  - [~] 15.1 Buat `README.md` di root monorepo
    - Bagian Prerequisites: Node.js 18+, PostgreSQL, psql
    - Bagian Backend Setup: (1) copy .env.example → .env, isi DATABASE_URL; (2) `psql -f backend/db/schema.sql`; (3) `node backend/db/seed.js`; (4) `node backend/server.js`
    - Bagian Frontend Setup: (1) copy .env.example → .env; (2) `cd frontend && npm install && npm run dev`
    - Token reference table: 5 baris (User, Role, Token)
    - Endpoint list: semua endpoint dengan method, path, role required, deskripsi singkat
    - Test commands: `cd backend && npm test`, `cd frontend && npm test`
    - Bagian **Test Scenarios** (wajib, bobot 15%): dokumentasikan minimal 5 skenario test manual mencakup:
      1. Happy path: MR membuat Call List → submit → DM approve → MR membuat Call Plan → eksekusi Call Actual (beserta curl/Postman request + expected response)
      2. Error: MR mencoba membuat Call Plan dari Call List yang belum `approved` → expected HTTP 422
      3. Error: MR mencoba melakukan visit ke dokter yang sama dua kali dalam satu hari → expected HTTP 409
      4. Error: MR submit Call Actual tanpa `photo_url` → expected HTTP 422
      5. Error: Call List milik MR dicoba di-approve oleh RSM atau MM (bukan DM) → expected HTTP 403
    - Bagian **Refleksi & Tools** (wajib, bobot 5%): tuliskan secara singkat: (1) tools yang digunakan dan untuk apa, (2) contoh output tools yang diterima vs ditolak beserta alasannya, (3) pendekatan validasi output tools sebelum dipakai di dalam kode, (4) arsitektur singkat dan cara menjalankan aplikasi
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2_

  - [~] 15.2 Checkpoint Final
    - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan nomor requirement spesifik untuk traceability
- Backend dibangun lebih dahulu (Tasks 1–7) sehingga dapat diuji via Postman/curl sebelum frontend dimulai
- Property tests menggunakan `fast-check` (backend) dan `vitest` (frontend)
- Unit tests dan property tests bersifat komplementer, bukan saling menggantikan
- Checkpoint memastikan validasi inkremental di setiap tahap
- Custom hooks (`useCallLists`, `useCallPlans`, `useCallActuals`, `useMCL`, `useProducts`) memisahkan data fetching dari rendering — komponen halaman tidak melakukan `axios.get` secara langsung

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5", "4.1"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["5.3"] },
    { "id": 8, "tasks": ["5.4", "5.5", "5.6", "5.7", "5.8", "6.1"] },
    { "id": 9, "tasks": ["5.9", "6.2", "6.3", "6.4"] },
    { "id": 10, "tasks": ["6.5", "7.1"] },
    { "id": 11, "tasks": ["7.2"] },
    { "id": 12, "tasks": ["7.3", "7.4", "7.5", "7.6"] },
    { "id": 13, "tasks": ["7.7", "8.1"] },
    { "id": 14, "tasks": ["8.2", "8.3", "8.4", "8.5", "8.6", "8.7a"] },
    { "id": 15, "tasks": ["8.7", "9.1"] },
    { "id": 16, "tasks": ["10.1", "10.2"] },
    { "id": 17, "tasks": ["10.3", "11.1", "11.2"] },
    { "id": 18, "tasks": ["11.3", "12.1", "12.2"] },
    { "id": 19, "tasks": ["12.3"] },
    { "id": 20, "tasks": ["12.4", "13.1", "13.2", "13.3", "13.4"] },
    { "id": 21, "tasks": ["13.5", "14.1", "14.2", "14.3"] },
    { "id": 22, "tasks": ["15.1"] },
    { "id": 23, "tasks": ["15.2"] }
  ]
}
```
