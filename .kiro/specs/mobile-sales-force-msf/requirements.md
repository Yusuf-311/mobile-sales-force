# Requirements Document

## Introduction

Mobile Sales Force (MSF) adalah aplikasi manajemen aktivitas kunjungan dokter secara digital untuk PT Mersifarma, perusahaan farmasi nasional. Aplikasi ini digunakan oleh Medical Representative (MR) / Field Force (FF) untuk merencanakan dan mencatat kunjungan ke dokter-dokter target. Sistem mencakup tiga fitur inti: Call List (daftar dokter target bulanan), Call Plan (rencana kunjungan harian), dan Call Actual (pencatatan realisasi kunjungan). Atasan langsung (DM, RSM, MM) berwenang menyetujui atau menolak Call List sebelum dapat digunakan.

Sistem dibangun sebagai Backend API + Frontend Web App yang responsif (mendukung akses via perangkat mobile).

---

## Glossary

- **MR (Medical Representative)**: Tenaga lapangan PT Mersifarma yang melakukan kunjungan dokter.
- **DM (District Manager)**: Atasan langsung MR; menyetujui Call List milik MR.
- **RSM (Regional Sales Manager)**: Atasan langsung DM; menyetujui Call List milik DM.
- **MM (Marketing Manager)**: Atasan langsung RSM; menyetujui Call List milik RSM.
- **MCL (Master Customer List)**: Daftar master semua dokter yang terdaftar dalam sistem.
- **Call_List**: Daftar dokter target yang akan dikunjungi MR dalam satu bulan tertentu.
- **Call_Plan**: Rencana kunjungan harian MR ke dokter tertentu berdasarkan Call_List yang disetujui.
- **Call_Actual**: Catatan realisasi kunjungan MR ke dokter, termasuk check-in/check-out, foto, tanda tangan, dan detailing produk.
- **Unplan_Visit**: Kunjungan tanpa Call_Plan ke dokter yang sudah ada di Call_List yang disetujui.
- **Non_Target_Visit**: Kunjungan ke dokter yang terdaftar di MCL tetapi tidak ada dalam Call_List MR.
- **Plan_ID**: Identifier referensi ke Call_Plan yang terkait dengan suatu Call_Actual.
- **Detailing**: Aktivitas presentasi atau penjelasan produk farmasi kepada dokter saat kunjungan.
- **API**: Application Programming Interface — antarmuka backend yang melayani permintaan data dari frontend.
- **System**: Keseluruhan aplikasi MSF (backend + frontend).
- **Backend**: Komponen server-side yang mengelola data, logika bisnis, dan API endpoints.
- **Frontend**: Komponen client-side berbasis web yang diakses pengguna melalui browser.
- **Validator**: Komponen yang memvalidasi data input sebelum diproses lebih lanjut.
- **Authenticator**: Komponen yang memverifikasi identitas pengguna berdasarkan hardcoded token yang disimpan di tabel users.
- **Supervisor**: Atasan langsung pengguna sesuai hierarki peran (DM → MR, RSM → DM, MM → RSM).

---

## Requirements

### Requirement 1: Manajemen Pengguna dan Otentikasi

**User Story:** Sebagai pengguna (MR, DM, RSM, MM), saya ingin dapat mengakses sistem menggunakan identitas berperan yang dipilih, sehingga saya dapat mengakses fitur sesuai wewenang saya.

#### Acceptance Criteria

1. THE System SHALL menyimpan data pengguna dengan atribut: id, name, email, role, token, region_id; field `token` bersifat unik dan hardcoded per pengguna (contoh: 'token-mr1', 'token-dm').
2. WHEN klien mengirimkan header `Authorization: Bearer <token>` yang valid pada setiap permintaan API, THE Authenticator SHALL mengidentifikasi pengguna dengan menjalankan `SELECT id, name, role, region_id FROM users WHERE token = $1` dan mengizinkan akses dengan menyetel `req.user`.
3. WHEN klien mengirimkan token yang tidak valid atau tidak menyertakan header `Authorization`, THE Authenticator SHALL mengembalikan respons HTTP 401 dengan pesan error.
4. WHILE pengguna memiliki token yang valid dalam header, THE System SHALL mengizinkan akses ke endpoint yang sesuai dengan perannya.
5. THE System SHALL menyediakan data seed yang mencakup pengguna dengan peran: mr, dm, rsm, mm beserta token hardcoded dan region_id masing-masing.
6. THE System SHALL menyimpan data pengguna dengan atribut: id, name, email, role, token, region_id.

---

### Requirement 2: Master Customer List (MCL)

**User Story:** Sebagai MR, saya ingin melihat daftar dokter yang terdaftar dalam sistem, sehingga saya dapat memilih dokter target saat membuat Call List.

#### Acceptance Criteria

1. THE System SHALL menyimpan data MCL dengan atribut: id, name, specialization, address, phone.
2. THE System SHALL menyediakan data seed MCL dengan minimal dokter-dokter representatif yang mencakup berbagai spesialisasi.
3. WHEN MR melakukan permintaan GET ke endpoint daftar MCL, THE Backend SHALL mengembalikan daftar seluruh dokter yang terdaftar dalam MCL.
4. THE System SHALL menyediakan data produk (id, name, category) yang dapat digunakan saat detailing pada Call Actual.

---

### Requirement 3: Pembuatan Call List

**User Story:** Sebagai MR, saya ingin membuat Call List bulanan berisi daftar dokter yang akan saya kunjungi, sehingga saya dapat merencanakan aktivitas kunjungan saya sebulan ke depan.

#### Acceptance Criteria

1. WHEN MR mengirimkan permintaan POST /api/call-lists dengan bulan target dan array doctor_ids yang valid, THE Backend SHALL membuat Call_List baru dengan status `draft` dan mengembalikan data Call_List yang dibuat.
2. THE Validator SHALL memverifikasi bahwa setiap doctor_id dalam permintaan pembuatan Call_List terdaftar dalam MCL; IF ada doctor_id yang tidak terdaftar, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error yang menyebutkan doctor_id yang tidak valid.
3. THE Validator SHALL memverifikasi bahwa array doctor_ids tidak kosong; IF array doctor_ids kosong, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
4. THE Validator SHALL memverifikasi bahwa bulan target Call_List belum memiliki Call_List aktif (status selain `draft`) untuk MR yang sama; IF sudah ada Call_List aktif, THEN THE Backend SHALL mengembalikan respons HTTP 409 dengan pesan error; IF Call_List yang ada berstatus `draft`, THEN THE Backend SHALL menggantikan atau memperbarui draft tersebut dengan data baru.
5. WHEN MR melakukan permintaan GET /api/call-lists, THE Backend SHALL mengembalikan seluruh Call_List milik MR yang sedang login beserta status persetujuannya.
6. WHEN MR melakukan permintaan GET /api/call-lists/:id untuk Call_List miliknya, THE Backend SHALL mengembalikan detail Call_List beserta daftar dokter dan status persetujuan terkini.
7. IF MR melakukan permintaan GET /api/call-lists/:id untuk Call_List yang bukan miliknya, THEN THE Backend SHALL mengembalikan respons HTTP 403.

---

### Requirement 4: Pengajuan Call List untuk Persetujuan

**User Story:** Sebagai MR, saya ingin mengajukan Call List yang sudah saya buat untuk disetujui atasan, sehingga saya dapat mulai membuat Call Plan setelah mendapat persetujuan.

#### Acceptance Criteria

1. WHEN MR mengirimkan permintaan PATCH /api/call-lists/:id/submit untuk Call_List dengan status `draft` miliknya, THE Backend SHALL mengubah status Call_List menjadi `submitted`.
2. IF MR mencoba mengajukan Call_List dengan status selain `draft`, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error yang menjelaskan status yang tidak valid.
3. IF MR mencoba mengajukan Call_List yang bukan miliknya, THEN THE Backend SHALL mengembalikan respons HTTP 403.

---

### Requirement 5: Alur Persetujuan Call List

**User Story:** Sebagai DM/RSM/MM, saya ingin menyetujui atau menolak Call List dari bawahan langsung saya, sehingga saya dapat memastikan rencana kunjungan sesuai dengan target perusahaan.

#### Acceptance Criteria

1. WHEN Supervisor mengirimkan permintaan PATCH /api/call-lists/:id/approve dengan body `{status: "approved"}` untuk Call_List bawahan langsungnya yang berstatus `submitted` atau `pending_approval`, THE Backend SHALL mengubah status Call_List menjadi `approved`; permintaan API itu sendiri sudah cukup untuk memicu proses persetujuan tanpa flag tambahan.
2. WHEN Supervisor mengirimkan permintaan PATCH /api/call-lists/:id/approve dengan body `{status: "rejected", reason: "<alasan>"}` untuk Call_List bawahan langsungnya, THE Backend SHALL mengubah status Call_List menjadi `rejected` dan menyimpan alasan penolakan; IF body berisi reason tetapi tidak menyertakan status `rejected` secara eksplisit, THEN THE Backend SHALL mengabaikan permintaan tersebut dan mengembalikan respons HTTP 422.
3. THE Validator SHALL memverifikasi bahwa penyetuju adalah Supervisor langsung dari pemilik Call_List berdasarkan hierarki peran (DM menyetujui MR, RSM menyetujui DM, MM menyetujui RSM); IF bukan Supervisor langsung, THEN THE Backend SHALL mengembalikan respons HTTP 403.
4. IF Supervisor mencoba menyetujui atau menolak Call_List yang sudah berstatus `approved`, atau mencoba memproses Call_List yang berstatus `draft` (belum disubmit), THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
5. WHEN Call_List ditolak (status `rejected`), THE Backend SHALL secara otomatis mengubah status Call_List menjadi `draft` agar MR dapat merevisi dan mengajukan ulang; perubahan ke `draft` ini terjadi selalu saat status `rejected` ditetapkan.
6. THE Validator SHALL mewajibkan field `reason` saat status yang dikirimkan adalah `rejected`; IF `reason` tidak disertakan, THEN THE Backend SHALL mengembalikan respons HTTP 422.

---

### Requirement 6: Pembuatan Call Plan

**User Story:** Sebagai MR, saya ingin membuat rencana kunjungan harian dari Call List yang sudah disetujui, sehingga saya dapat mengatur jadwal kunjungan saya secara terstruktur.

#### Acceptance Criteria

1. WHEN MR mengirimkan permintaan POST /api/call-plans dengan call_list_id, doctor_id, tanggal, dan waktu yang valid, THE Backend SHALL membuat Call_Plan baru dan mengembalikan data Call_Plan yang dibuat.
2. THE Validator SHALL memverifikasi bahwa Call_List yang direferensikan memiliki status `approved`; IF status adalah selain `approved` (termasuk `pending_approval`, `draft`, `submitted`, atau `rejected`), THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
3. THE Validator SHALL memverifikasi bahwa doctor_id yang dipilih terdapat dalam daftar dokter Call_List yang direferensikan; IF tidak terdapat, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
4. THE Validator SHALL memverifikasi bahwa tanggal kunjungan Call_Plan berada dalam rentang bulan Call_List yang direferensikan; IF di luar rentang, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
5. THE Validator SHALL memverifikasi bahwa tidak ada Call_Plan lain untuk doctor_id dan tanggal yang sama milik MR yang sama (satu dokter, satu rencana per hari); IF sudah ada, THEN THE Backend SHALL mengembalikan respons HTTP 409 dengan pesan error.
6. WHEN MR melakukan permintaan GET /api/call-plans, THE Backend SHALL mengembalikan seluruh Call_Plan milik MR yang sedang login.

---

### Requirement 7: Pencatatan Call Actual (Kunjungan Terencana)

**User Story:** Sebagai MR, saya ingin mencatat hasil kunjungan dokter yang sudah saya rencanakan, sehingga ada bukti realisasi kunjungan beserta aktivitas detailing yang saya lakukan.

#### Acceptance Criteria

1. WHEN MR mengirimkan permintaan POST /api/call-actuals, THE System SHALL menerima field: plan_id (nullable), doctor_id, visit_date, check_in_time, check_out_time, photo_url, signature_url, dan detailing (array of product_id).
2. WHEN MR mengirimkan permintaan POST /api/call-actuals dengan plan_id yang valid beserta data kunjungan lengkap, THE Backend SHALL membuat Call_Actual baru dengan status `in_progress` dan mengembalikan data Call_Actual yang dibuat; validasi kepemilikan plan_id hanya dilakukan pada saat permintaan POST aktif.
3. WHEN plan_id disertakan pada permintaan POST aktif, THE Validator SHALL memverifikasi bahwa plan_id merujuk pada Call_Plan milik MR yang sedang login; IF bukan milik MR tersebut, THEN THE Backend SHALL mengembalikan respons HTTP 403.
4. WHEN plan_id disertakan pada permintaan POST aktif, THE Validator SHALL memverifikasi bahwa doctor_id pada permintaan sesuai dengan doctor_id pada Call_Plan yang direferensikan; IF tidak sesuai, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
5. THE Validator SHALL mewajibkan field photo_url pada setiap permintaan pembuatan Call_Actual; IF photo_url tidak disertakan atau kosong, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
6. THE Validator SHALL mewajibkan field signature_url pada setiap permintaan pembuatan Call_Actual; IF signature_url tidak disertakan atau kosong, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
7. THE Validator SHALL mewajibkan minimal 1 item produk dalam field detailing pada setiap permintaan pembuatan Call_Actual; IF detailing kosong atau tidak disertakan, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
8. THE Validator SHALL memverifikasi bahwa tidak ada Call_Actual lain untuk doctor_id dan tanggal yang sama milik MR yang sama (maksimal 1 kunjungan per dokter per hari); IF sudah ada, THEN THE Backend SHALL mengembalikan respons HTTP 409 dengan pesan error.
9. WHEN MR melakukan permintaan GET /api/call-actuals, THE Backend SHALL mengembalikan seluruh Call_Actual milik MR yang sedang login.

---

### Requirement 8: Unplan Visit

**User Story:** Sebagai MR, saya ingin mencatat kunjungan ke dokter yang ada di Call List saya tanpa Call Plan sebelumnya, sehingga kunjungan mendadak tetap dapat tercatat dengan benar.

#### Acceptance Criteria

1. WHEN MR mengirimkan permintaan POST /api/call-actuals tanpa plan_id (null) dan dengan doctor_id yang ada dalam Call_List MR yang berstatus `approved`, THE Backend SHALL membuat Call_Actual sebagai Unplan_Visit dan mengembalikan data Call_Actual yang dibuat.
2. THE Validator SHALL memverifikasi bahwa doctor_id pada Unplan_Visit terdapat dalam setidaknya satu Call_List MR yang berstatus `approved` untuk bulan yang bersangkutan; IF tidak terdapat, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
3. THE Validator SHALL tetap menerapkan aturan maksimal 1 kunjungan per dokter per hari pada Unplan_Visit; IF sudah ada Call_Actual untuk dokter dan tanggal tersebut, THEN THE Backend SHALL mengembalikan respons HTTP 409 dengan pesan error.
4. THE Validator SHALL tetap mewajibkan photo_url, signature_url, dan minimal 1 item detailing pada Unplan_Visit; IF salah satu tidak terpenuhi, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.

---

### Requirement 9: Non Target Visit

**User Story:** Sebagai MR, saya ingin mencatat kunjungan ke dokter yang terdaftar di MCL tetapi tidak ada dalam Call List saya, sehingga peluang kunjungan di luar target tetap dapat tercatat.

#### Acceptance Criteria

1. WHEN MR mengirimkan permintaan POST /api/call-actuals tanpa plan_id (null) dan doctor_id yang terdaftar di MCL tetapi tidak ada dalam Call_List aktif MR, THE Backend SHALL membuat Call_Actual sebagai Non_Target_Visit dan mengembalikan data Call_Actual yang dibuat.
2. THE Validator SHALL memverifikasi bahwa doctor_id pada Non_Target_Visit terdaftar dalam MCL; validasi ini diterapkan berdasarkan kondisi plan_id adalah null; IF tidak terdaftar di MCL, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.
3. THE Validator SHALL memverifikasi bahwa tidak ada Call_Actual lain untuk doctor_id dan tanggal yang sama milik MR yang sama, berlaku untuk semua tipe kunjungan termasuk Non_Target_Visit (plan_id null); IF sudah ada, THEN THE Backend SHALL mengembalikan respons HTTP 409 dengan pesan error.
4. THE Validator SHALL tetap mewajibkan photo_url, signature_url, dan minimal 1 item detailing pada Non_Target_Visit; IF salah satu tidak terpenuhi, THEN THE Backend SHALL mengembalikan respons HTTP 422 dengan pesan error.

---

### Requirement 10: Frontend — Halaman Call List

**User Story:** Sebagai MR, saya ingin menggunakan antarmuka web untuk membuat dan memantau Call List bulanan saya, sehingga saya dapat melakukan manajemen Call List dengan mudah dari perangkat mobile.

#### Acceptance Criteria

1. THE Frontend SHALL menyediakan halaman Call List yang menampilkan form pemilihan bulan dan multi-select dokter dari MCL.
2. WHEN MR memilih bulan dan dokter lalu menekan tombol simpan, THE Frontend SHALL mengirimkan permintaan POST /api/call-lists ke Backend dan menampilkan notifikasi sukses atau pesan error yang deskriptif.
3. THE Frontend SHALL menampilkan tabel daftar Call List milik MR beserta kolom status persetujuan (draft, submitted, approved, rejected).
4. WHEN MR menekan tombol "Submit" pada Call List berstatus draft, THE Frontend SHALL mengirimkan permintaan pengajuan ke Backend dan memperbarui tampilan status secara langsung.
5. WHILE permintaan ke Backend sedang diproses, THE Frontend SHALL menampilkan indikator loading (spinner atau skeleton).
6. IF Backend mengembalikan respons error, THEN THE Frontend SHALL menampilkan pesan error yang informatif melalui toast atau alert; WHEN error terjadi, THE Frontend SHALL menyembunyikan notifikasi sukses dan hanya menampilkan feedback error.
7. IF permintaan gagal sebelum mencapai Backend (misalnya karena masalah jaringan atau validasi sisi klien), THEN THE Frontend SHALL menampilkan pesan error generik dan mengizinkan pengguna untuk mencoba kembali.

---

### Requirement 11: Frontend — Halaman Call Plan

**User Story:** Sebagai MR, saya ingin membuat rencana kunjungan harian melalui antarmuka web, sehingga saya dapat menjadwalkan kunjungan ke dokter-dokter target dengan mudah.

#### Acceptance Criteria

1. THE Frontend SHALL menyediakan halaman Call Plan yang menampilkan form dengan selector Call List yang disetujui, selector dokter, input tanggal, dan input waktu.
2. WHEN MR mengisi form dan menekan tombol simpan, THE Frontend SHALL mengirimkan permintaan POST /api/call-plans ke Backend dan menampilkan notifikasi sukses atau pesan error yang deskriptif.
3. THE Frontend SHALL menampilkan tabel daftar Call Plan milik MR.
4. IF Backend mengembalikan respons HTTP 409 (duplikat dokter pada hari yang sama), THEN THE Frontend SHALL menampilkan pesan error duplikasi yang jelas kepada pengguna melalui toast atau alert; IF Backend mengembalikan kode error lain, THEN THE Frontend SHALL menangani error tersebut melalui mekanisme penanganan error umum (AC6).
5. WHILE permintaan ke Backend sedang diproses, THE Frontend SHALL menampilkan indikator loading.
6. IF Backend mengembalikan respons error, THEN THE Frontend SHALL menampilkan pesan error yang informatif melalui toast atau alert kepada pengguna; WHEN error terjadi, THE Frontend SHALL menyembunyikan notifikasi sukses dan hanya menampilkan feedback error.
7. THE Frontend SHALL menampilkan tampilan yang responsif pada perangkat mobile.

---

### Requirement 12: Frontend — Halaman Call Actual

**User Story:** Sebagai MR, saya ingin mencatat realisasi kunjungan melalui antarmuka web termasuk upload foto dan tanda tangan, sehingga dokumentasi kunjungan dapat tersimpan lengkap.

#### Acceptance Criteria

1. THE Frontend SHALL menyediakan halaman Call Actual dengan form yang mendukung tiga mode: kunjungan terencana (dari Call Plan), Unplan Visit, dan Non Target Visit.
2. WHEN MR memilih mode kunjungan terencana, THE Frontend SHALL menampilkan selector Call Plan yang tersedia untuk dipilih.
3. THE Frontend SHALL menyediakan input upload foto (menggunakan mock URL) dan input tanda tangan (menggunakan mock URL) yang wajib diisi.
4. THE Frontend SHALL menyediakan multi-select produk untuk detailing dengan minimal 1 produk wajib dipilih.
5. THE Frontend SHALL menyediakan input check-in time dan check-out time.
6. WHEN MR mengisi form dan menekan tombol simpan, THE Frontend SHALL mengirimkan permintaan POST /api/call-actuals ke Backend dan menampilkan notifikasi sukses atau pesan error yang deskriptif.
7. THE Frontend SHALL menampilkan tabel daftar Call Actual milik MR beserta kolom status (In Progress, Completed).
8. WHILE permintaan ke Backend sedang diproses, THE Frontend SHALL menampilkan indikator loading.
9. IF Backend mengembalikan respons error, THEN THE Frontend SHALL menampilkan pesan error yang informatif melalui toast atau alert kepada pengguna; WHEN error terjadi, THE Frontend SHALL menyembunyikan notifikasi sukses dan hanya menampilkan feedback error.
10. THE Frontend SHALL menampilkan tampilan yang responsif pada perangkat mobile.

---

### Requirement 13: Validasi dan Pengujian

**User Story:** Sebagai tim pengembang, saya ingin sistem memiliki validasi bisnis yang teruji, sehingga data yang masuk selalu konsisten dan sesuai aturan bisnis PT Mersifarma.

#### Acceptance Criteria

1. THE System SHALL berhasil menjalankan skenario happy path: MR membuat Call List → submit → DM menyetujui → MR membuat Call Plan → MR mengeksekusi Call Actual.
2. THE Validator SHALL menolak permintaan pembuatan Call_Plan dari Call_List yang belum berstatus `approved` dan mengembalikan respons HTTP 422.
3. THE Validator SHALL menolak permintaan pembuatan Call_Actual kedua untuk doctor_id dan tanggal yang sama oleh MR yang sama dan mengembalikan respons HTTP 409.
4. THE Validator SHALL menolak permintaan pembuatan Call_Actual tanpa photo_url dan mengembalikan respons HTTP 422.
5. THE Validator SHALL menolak permintaan persetujuan Call_List oleh pengguna yang bukan Supervisor langsung dari pemilik Call_List dan mengembalikan respons HTTP 403.
6. THE System SHALL menyediakan minimal 3 unit test untuk setidaknya 1 fungsi kritis pada Backend (misalnya: fungsi validasi hierarki persetujuan).

---

### Requirement 14: Arsitektur dan Konfigurasi Sistem

**User Story:** Sebagai tim pengembang, saya ingin sistem dapat dijalankan secara lokal tanpa konfigurasi yang kompleks, sehingga pengembangan dan demonstrasi dapat dilakukan dengan mudah.

#### Acceptance Criteria

1. THE System SHALL dapat dijalankan di lingkungan lokal dengan langkah-langkah setup yang terdokumentasi dan tidak memerlukan dependensi cloud atau layanan eksternal berbayar.
2. THE Backend SHALL menyediakan dokumentasi API (minimal berupa file README atau koleksi Postman) yang mendeskripsikan setiap endpoint, parameter, request body, dan contoh respons.
3. THE System SHALL menggunakan struktur data dan skema database yang dapat diperluas (extensible) untuk mendukung penambahan fitur di masa mendatang.
4. WHERE fitur autentikasi JWT diimplementasikan, THE System SHALL menggunakan mekanisme JWT token standar dengan masa berlaku yang dapat dikonfigurasi; implementasi JWT bersifat opsional — sistem dapat berjalan tanpa JWT dan tetap memenuhi persyaratan ini.
5. THE Backend SHALL mengembalikan respons error dalam format JSON yang konsisten dengan minimal field: `status`, `message`.
6. THE System SHALL menyediakan skrip atau mekanisme seed data otomatis untuk mengisi database dengan data awal (users, roles, MCL, products).
