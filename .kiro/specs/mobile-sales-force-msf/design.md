# Design Document — Mobile Sales Force (MSF)

## Overview

MSF adalah sistem manajemen aktivitas kunjungan dokter untuk PT Mersifarma, dibangun sebagai **full-stack monorepo** yang terdiri dari Backend API + Frontend Web App responsif (mendukung akses via perangkat mobile).

**Stack lengkap:**
- **Backend**: Node.js, PostgreSQL (raw SQL via `pg` library), autentikasi berbasis static token
- **Frontend**: React 18 + Vite + Axios + React Router v6 (mobile-responsive)
- **Struktur**: Monorepo — `/backend` dan `/frontend` dalam satu root repository

Sistem melayani tiga alur kerja utama: pembuatan dan persetujuan Call List bulanan, penjadwalan Call Plan harian, dan pencatatan Call Actual (realisasi kunjungan). Atasan (DM, RSM, MM) berwenang menyetujui atau menolak Call List.

---

## Monorepo Folder Structure

```
mobile-sales-force/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               # pg Pool setup
│   │   ├── middleware/
│   │   │   └── auth.js             # hardcoded token lookup middleware
│   │   ├── routes/
│   │   │   ├── mcl.js
│   │   │   ├── callList.js
│   │   │   ├── callPlan.js
│   │   │   └── callActual.js
│   │   └── app.js                  # Express setup + route mounting: /api/mcl and /api/products → mcl.js (both served from the same route file), /api/call-lists → callList.js, /api/call-plans → callPlan.js, /api/call-actuals → callActual.js
│   ├── db/
│   │   ├── schema.sql              # CREATE TABLE statements
│   │   └── seed.js                 # node script to insert seed data
│   ├── .env.example
│   ├── package.json
│   └── server.js                   # entry point: http.listen
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosClient.js      # Axios instance with auth header interceptor
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Spinner.jsx
│   │   │   │   └── Toast.jsx
│   │   │   ├── CallListForm.jsx
│   │   │   ├── CallListTable.jsx
│   │   │   ├── CallPlanForm.jsx
│   │   │   ├── CallPlanTable.jsx
│   │   │   ├── CallActualForm.jsx
│   │   │   └── CallActualTable.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       # Role selector — sets token in localStorage
│   │   │   ├── CallListPage.jsx
│   │   │   ├── CallPlanPage.jsx
│   │   │   └── CallActualPage.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Provides current user/role to components
│   │   ├── router/
│   │   │   └── AppRouter.jsx       # React Router v6 routes with auth guard
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js              # proxy /api → backend port
│   └── package.json
├── .gitignore
└── README.md
```

No separate `controllers/`, `services/`, or `repositories/` folders in the backend. Route handlers contain inline logic. Helpers are extracted to the route file only when reused across multiple routes within that file.

---

## Architecture

```
HTTP Client (Browser — mobile or desktop)
          │
          ▼
    ┌─────────────────────┐
    │   React Frontend    │  ← Vite dev server (proxy /api → :3000)
    │  React Router v6    │
    │  Axios + AuthCtx    │
    └──────────┬──────────┘
               │  HTTP /api/*  Authorization: Bearer <token>
               ▼
    ┌─────────────┐
    │  server.js  │  ← http.createServer / app.listen (:3000)
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │   app.js    │  ← Express setup, middleware, route mounting
    └──────┬──────┘
           │
    ┌──────▼──────────────────────────────────┐
    │         middleware/auth.js              │
    │  Bearer token → SELECT FROM users       │
    │  sets req.user = {id, name, role, ...}  │
    └──────┬──────────────────────────────────┘
           │
    ┌──────▼──────────────────────────────────┐
    │              routes/                    │
    │  ┌──────────┐  ┌────────────┐           │
    │  │  mcl.js  │  │callList.js │           │
    │  └──────────┘  └────────────┘           │
    │  ┌────────────────┐  ┌───────────────┐  │
    │  │ callPlan.js    │  │callActual.js  │  │
    │  └────────────────┘  └───────────────┘  │
    └──────┬──────────────────────────────────┘
           │
    ┌──────▼──────┐
    │  config/    │
    │   db.js     │  ← pg Pool
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │ PostgreSQL  │
    └─────────────┘
```

---

## Authentication Mechanism

**Approach**: Static hardcoded token stored in the `users` table. No JWT, no login endpoint, no bcrypt.

**Backend flow**:
1. Client includes `Authorization: Bearer <token>` header on every request.
2. `auth.js` middleware extracts the token and runs:
   ```sql
   SELECT id, name, role, region_id FROM users WHERE token = $1
   ```
3. If user found → `req.user = { id, name, role, region_id }` → `next()`
4. If not found → `res.status(401).json({ status: 'error', message: 'Unauthorized' })`

**Frontend auth flow**:
1. User visits `LoginPage` and clicks one of the role/identity cards (MR1, MR2, DM, RSM, MM).
2. Frontend saves the corresponding hardcoded token + role to `localStorage`:
   ```js
   localStorage.setItem('token', 'token-mr1');
   localStorage.setItem('role', 'mr');
   localStorage.setItem('userName', 'Andi (MR1)');
   ```
3. `AuthContext` reads these values and provides them to all components.
4. `axiosClient.js` injects the token automatically via an Axios request interceptor.
5. `AppRouter.jsx` redirects unauthenticated users (no token in localStorage) back to `LoginPage`.
6. No login API call is made — token selection is purely client-side.
7. Logout clears localStorage and redirects to `/login`.

**Token values** (from seed data):
| User | Role | Token |
|------|------|-------|
| MM   | mm   | token-mm  |
| RSM  | rsm  | token-rsm |
| DM   | dm   | token-dm  |
| MR 1 | mr   | token-mr1 |
| MR 2 | mr   | token-mr2 |

**Role guard helper** (inline in each route, backend):
```js
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    next();
  };
}
```

---

## Database Schema

```sql
-- schema.sql

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
  month       DATE    NOT NULL,   -- stored as YYYY-MM-01
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
```

---

## Seed Data

`db/seed.js` inserts the following data (idempotent via `ON CONFLICT DO NOTHING` or truncate before insert):

**users** (5 rows):
| name        | role | token      | region_id |
|-------------|------|------------|-----------|
| Budi (MM)   | mm   | token-mm   | NULL      |
| Citra (RSM) | rsm  | token-rsm  | 1         |
| Doni (DM)   | dm   | token-dm   | 1         |
| Andi (MR1)  | mr   | token-mr1  | 1         |
| Sari (MR2)  | mr   | token-mr2  | 1         |

**master_customers** (10 rows, varied specializations):
Doctors covering: Umum, Spesialis Jantung, Paru, Anak, Penyakit Dalam, Kandungan, Ortopedi, Saraf, Mata, Kulit.

**products** (5 rows):
Products covering categories: Kardiovaskular, Antibiotik, Analgesik, Vitamin, Antidiabetes.

---

## API Endpoints

All endpoints require `Authorization: Bearer <token>` header. Responses use consistent format:
- Success: `{ "status": "success", "data": {...} }` — HTTP 200 or 201
- Error: `{ "status": "error", "message": "..." }` — HTTP 4xx

### MCL

#### `GET /api/mcl`
- **Role**: any authenticated user
- **Response 200**:
  ```json
  {
    "status": "success",
    "data": [
      { "id": 1, "name": "Dr. Ahmad", "specialization": "Umum", "address": "...", "phone": "..." }
    ]
  }
  ```

#### `GET /api/products`
- **Role**: any authenticated user
- **Response 200**:
  ```json
  {
    "status": "success",
    "data": [
      { "id": 1, "name": "Cardivex", "category": "Kardiovaskular" }
    ]
  }
  ```

---

### Call List

#### `POST /api/call-lists`
- **Role**: mr
- **Request Body**:
  ```json
  { "month": "2024-01", "doctor_ids": [1, 2, 3] }
  ```
- **Logic**:
  1. Parse `month` → normalize to `YYYY-MM-01` DATE.
  2. Validate all `doctor_ids` exist in `master_customers`. If any invalid → 422.
  3. Validate `doctor_ids` not empty → 422 if empty.
  4. Check if `call_lists` for same `user_id` + `month` exists:
     - If exists and status is `draft` → delete old `call_list_doctors`, insert new ones, return updated record.
     - If exists and status is NOT `draft` → 409.
     - If not exists → INSERT new call list + doctors.
- **Response 201**: `{ "status": "success", "data": { call list object with doctors } }`

#### `GET /api/call-lists`
- **Role**: mr, dm, rsm, mm
- **Logic**:
  - If `req.user.role === 'mr'` → `SELECT * FROM call_lists WHERE user_id = $1 ORDER BY created_at DESC`
  - If `req.user.role IN ('dm','rsm','mm')` → return all `submitted` call lists belonging to users whose role is the direct subordinate of the approver (e.g., DM sees MR's submitted lists). Query joins `users` on `call_lists.user_id` and filters by the subordinate role.
- **Response 200**: `{ "status": "success", "data": [...] }`

#### `GET /api/call-lists/:id`
- **Role**: mr, dm, rsm, mm
- **Logic**:
  1. Fetch call list by id. If not found → 404.
  2. If `req.user.role === 'mr'`: if `call_list.user_id !== req.user.id` → 403.
  3. If `req.user.role IN ('dm','rsm','mm')`: fetch owner's role; if `isDirectSupervisor(req.user.role, owner.role)` is false → 403.
  4. Fetch associated doctors from `call_list_doctors JOIN master_customers`.
- **Response 200**: `{ "status": "success", "data": { ...callList, doctors: [...] } }`

#### `PATCH /api/call-lists/:id/submit`
- **Role**: mr
- **Logic**:
  1. Fetch call list by id.
  2. If not found → 404.
  3. If `user_id !== req.user.id` → 403.
  4. If `status !== 'draft'` → 422.
  5. `UPDATE call_lists SET status='submitted', updated_at=NOW() WHERE id=$1`
- **Response 200**: `{ "status": "success", "data": { updated call list } }`

#### `PATCH /api/call-lists/:id/approve`
- **Role**: dm, rsm, mm
- **Request Body**:
  ```json
  { "status": "approved" }
  // or
  { "status": "rejected", "reason": "Daftar dokter tidak sesuai target" }
  ```
- **Logic**:
  1. Fetch call list by id.
  2. If not found → 404.
  3. Verify approver is direct supervisor of call list owner (see Hierarchy section).
  4. If not direct supervisor → 403.
  5. If current status is NOT 'submitted' → 422 (only submitted call lists can be approved or rejected).
  6. If `body.status` is `rejected` and no `reason` → 422.
  7. If `body.status` is `rejected`:
     - `UPDATE ... SET status='draft', approved_by=$2, reason=$3, updated_at=NOW()` (auto-reset to draft per req 5.5).
  8. If `body.status` is `approved`:
     - `UPDATE ... SET status='approved', approved_by=$2, updated_at=NOW()`
- **Response 200**: `{ "status": "success", "data": { updated call list } }`

---

### Call Plan

#### `POST /api/call-plans`
- **Role**: mr
- **Request Body**:
  ```json
  { "call_list_id": 1, "doctor_id": 2, "visit_date": "2024-01-15", "visit_time": "09:00" }
  ```
- **Logic**:
  1. Fetch call list. If not found → 404.
  2. If call list `status !== 'approved'` → 422.
  3. Verify `doctor_id` exists in `call_list_doctors` for this `call_list_id` → 422 if not.
  4. Verify `visit_date` month matches call list `month` → 422 if not.
  5. Check for duplicate `(user_id, doctor_id, visit_date)` in `call_plans` → 409 if exists.
  6. INSERT into `call_plans`.
- **Response 201**: `{ "status": "success", "data": { call plan object } }`

#### `GET /api/call-plans`
- **Role**: mr
- **Logic**: `SELECT * FROM call_plans WHERE user_id = $1 ORDER BY visit_date ASC`
- **Response 200**: `{ "status": "success", "data": [...] }`

---

### Call Actual

#### `POST /api/call-actuals`
- **Role**: mr
- **Request Body**:
  ```json
  {
    "plan_id": 1,            // nullable
    "doctor_id": 2,
    "visit_date": "2024-01-15",
    "check_in_time": "09:00",
    "check_out_time": "09:45",
    "photo_url": "https://...",
    "signature_url": "https://...",
    "detailing": [{ "product_id": 1 }, { "product_id": 3 }]
  }
  ```
- **Logic** (visit type resolution):
  1. Validate `photo_url` not empty → 422 if missing.
  2. Validate `signature_url` not empty → 422 if missing.
  3. Validate `detailing` array has at least 1 item → 422 if empty.
  4. Check for duplicate `(user_id, doctor_id, visit_date)` in `call_actuals` → 409 if exists.
  5. **Visit type resolution** (if `plan_id` is provided):
     - Fetch the plan. If not found or `plan.user_id !== req.user.id` → 403.
     - If `plan.doctor_id !== body.doctor_id` → 422.
     - `visit_type = 'plan'`
  6. **Visit type resolution** (if `plan_id` is null):
     - Check if `doctor_id` is in any approved call list of MR for this month:
       ```sql
       SELECT cld.id FROM call_list_doctors cld
       JOIN call_lists cl ON cl.id = cld.call_list_id
       WHERE cl.user_id = $1
         AND cl.status = 'approved'
         AND DATE_TRUNC('month', cl.month) = DATE_TRUNC('month', $2::date)
         AND cld.master_customer_id = $3
       ```
       - If found → `visit_type = 'unplan'`
     - Else check if `doctor_id` exists in `master_customers`:
       - If found → `visit_type = 'non_target'`
       - If not found → 422
  7. INSERT into `call_actuals`, then INSERT products into `call_actual_products`.
- **Response 201**: `{ "status": "success", "data": { call actual object with products } }`

#### `GET /api/call-actuals`
- **Role**: mr
- **Logic**: `SELECT * FROM call_actuals WHERE user_id = $1 ORDER BY visit_date DESC`
- **Response 200**: `{ "status": "success", "data": [...] }`

---

## Business Rule Implementation Notes

### Supervisor Hierarchy Helper

Used in `PATCH /api/call-lists/:id/approve` to determine if the approver is the direct supervisor of the call list owner.

```js
// In callList.js or a shared helper within the file
function isDirectSupervisor(approverRole, ownerRole) {
  const hierarchy = {
    dm:  'mr',
    rsm: 'dm',
    mm:  'rsm',
  };
  return hierarchy[approverRole] === ownerRole;
}
```

Usage: Fetch both the approver (`req.user`) and the call list owner (`SELECT role FROM users WHERE id = call_list.user_id`), then call `isDirectSupervisor(req.user.role, owner.role)`.

### Visit Type Resolution

The `visit_type` field is resolved at call actual creation time based on this decision tree:

```
POST /api/call-actuals
        │
        ├─ plan_id provided?
        │     Yes → validate plan ownership + doctor match → visit_type = 'plan'
        │
        └─ plan_id is null?
              │
              ├─ doctor in MR's approved call list for this month?
              │     Yes → visit_type = 'unplan'
              │
              └─ doctor in master_customers?
                    Yes → visit_type = 'non_target'
                    No  → 422 error
```

### Call List Status Transitions

```
draft ──submit──► submitted ──approve──► approved
  ▲                          └─reject──► [auto-reset to] draft
  │                                            │
  └────────────────────────────────────────────┘
```

Key rules:
- Only `draft` can be submitted (MR action).
- Only `submitted` can be approved or rejected (supervisor action).
- `approved` and `rejected` states block further approve/reject actions (422).
- Rejection **always** resets to `draft` immediately (not a separate step).

---

## Error Handling

### Backend Error Handling

All errors return JSON in this format:
```json
{ "status": "error", "message": "Human-readable description" }
```

| Scenario | HTTP Status |
|----------|-------------|
| Missing / invalid token | 401 |
| Insufficient role | 403 |
| Resource owned by someone else | 403 |
| Resource not found | 404 |
| Duplicate resource | 409 |
| Invalid input / business rule violation | 422 |
| Unexpected server error | 500 |

Global error handler in `app.js`:
```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});
```

Route handlers use `try/catch` and call `next(err)` for unexpected errors. Business rule violations are returned directly (not via `next(err)`) to ensure the correct HTTP status code.

### Frontend Error Handling

All API calls in page components and form handlers follow this pattern:

```js
const [loading, setLoading] = useState(false);
const { showToast } = useContext(ToastContext);

async function handleSubmit(data) {
  setLoading(true);
  try {
    const res = await axiosClient.post('/api/call-lists', data);
    showToast('success', 'Call List berhasil disimpan');
    // refresh data
  } catch (err) {
    const msg = err.response?.data?.message || 'Terjadi kesalahan. Silakan coba lagi.';
    showToast('error', msg);
  } finally {
    setLoading(false);
  }
}
```

Rules:
- `Spinner` is shown whenever `loading === true` (button disabled + spinner overlay or inline spinner).
- `Toast` displays success or error — never both at the same time.
- Network errors (no `err.response`) show a generic message.
- 409 from Call Plan creation shows a specific "Dokter sudah dijadwalkan pada tanggal ini" message.

---

## Frontend Design

### Tech Stack

| Layer | Technology |
|-------|-----------|
| UI library | React 18 |
| Build tool | Vite |
| HTTP client | Axios |
| Routing | React Router v6 |
| State | React Context API (AuthContext) |
| Styling | CSS Modules or plain CSS, mobile-first |

### Frontend Overview

React 18 + Vite + Axios + React Router v6 — no backend framework on the frontend. Mobile-first responsive UI targeting 375px+ screens. Authentication is entirely client-side: user selects their identity on a login page, token is stored in localStorage, and every Axios request includes that token via a request interceptor. No login API endpoint is called.

### Vite Proxy Configuration

`frontend/vite.config.js` proxies all `/api` requests to the backend during development, avoiding CORS issues:

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

In production, the backend serves all requests; the proxy is only needed in dev.

### Axios Client

`frontend/src/api/axiosClient.js` creates a single Axios instance shared by the entire app:

```js
// axiosClient.js
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Request interceptor: inject Authorization header from localStorage
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: on 401, clear auth state and redirect to login
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
```

`VITE_API_URL` defaults to `http://localhost:3000`. In development, the Vite proxy intercepts `/api/*` before requests reach the network, so the baseURL effectively doesn't matter for `/api` paths.

### Auth Flow (Frontend)

1. **LoginPage** renders a grid of role-selection cards: MR1, MR2, DM, RSM, MM.
2. On click, the selected user's `{ token, role, name }` is written to localStorage and `AuthContext` state is updated — no API call.
3. Router immediately redirects authenticated users from `/login` to `/call-lists`.
4. `axiosClient` reads `token` from localStorage via the request interceptor for every subsequent request.
5. If the backend returns HTTP 401 (token no longer valid), the response interceptor clears localStorage and redirects to `/login`.
6. Logout: `AuthContext.logout()` calls `localStorage.clear()` and sets user state to `null`, which triggers the router guard to redirect to `/login`.

### Auth Context

`frontend/src/context/AuthContext.jsx` reads auth state from `localStorage` and provides it to the component tree:

```jsx
// AuthContext.jsx
import { createContext, useContext, useState } from 'react';

export const AuthContext = createContext(null);

const USERS = [
  { label: 'Andi (MR1)',  role: 'mr',  token: 'token-mr1' },
  { label: 'Sari (MR2)',  role: 'mr',  token: 'token-mr2' },
  { label: 'Doni (DM)',   role: 'dm',  token: 'token-dm'  },
  { label: 'Citra (RSM)', role: 'rsm', token: 'token-rsm' },
  { label: 'Budi (MM)',   role: 'mm',  token: 'token-mm'  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    const role  = localStorage.getItem('role');
    const name  = localStorage.getItem('userName');
    return token ? { token, role, name } : null;
  });

  function login(selectedUser) {
    localStorage.setItem('token',    selectedUser.token);
    localStorage.setItem('role',     selectedUser.role);
    localStorage.setItem('userName', selectedUser.label);
    setUser({ token: selectedUser.token, role: selectedUser.role, name: selectedUser.label });
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### Router

`frontend/src/router/AppRouter.jsx` defines all routes and guards unauthenticated access:

```jsx
// AppRouter.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginPage      from '../pages/LoginPage';
import CallListPage   from '../pages/CallListPage';
import CallPlanPage   from '../pages/CallPlanPage';
import CallActualPage from '../pages/CallActualPage';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/call-lists"   element={<PrivateRoute><CallListPage /></PrivateRoute>} />
        <Route path="/call-plans"   element={<PrivateRoute><CallPlanPage /></PrivateRoute>} />
        <Route path="/call-actuals" element={<PrivateRoute><CallActualPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/call-lists" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

### Page Designs

#### LoginPage (`/login`)

**Purpose**: Identity selection UI. No API call is made — purely client-side.

**Layout**:
- Page title: "Mobile Sales Force — PT Mersifarma"
- Subtitle: "Pilih identitas Anda untuk melanjutkan"
- Grid of clickable role-selection cards, one per user:
  - Andi (MR1), Sari (MR2), Doni (DM), Citra (RSM), Budi (MM)
- On card click: `login(selectedUser)` from `AuthContext` → saves `{ token, role, name }` to localStorage → React Router redirects to `/call-lists`
- No form submit, no password field

**Components used**: self-contained, no shared components needed

---

#### CallListPage (`/call-lists`)

**Purpose**: MR creates/views Call Lists; DM/RSM/MM views submitted lists to approve or reject.

**MR view**:
- `CallListForm.jsx` (visible only when `role === 'mr'`):
  - Month picker (`<input type="month">`) — required
  - Multi-select of doctors fetched on mount from `GET /api/mcl`
  - Save button → `POST /api/call-lists`
- `CallListTable.jsx`:
  - Columns: ID, Bulan, Status (badge), Jumlah Dokter, Aksi
  - "Submit" action button on rows with `status === 'draft'` → `PATCH /api/call-lists/:id/submit`
  - Table data: `GET /api/call-lists` on mount and after every successful action

**DM / RSM / MM view**:
- `CallListForm.jsx` is hidden
- `CallListTable.jsx` shows subordinates' submitted call lists fetched from `GET /api/call-lists`
  - Columns: ID, MR, Bulan, Status (badge), Jumlah Dokter, Aksi
  - "Setujui" button → opens a confirm dialog → `PATCH /api/call-lists/:id/approve` with `{ status: 'approved' }`
  - "Tolak" button → opens a reason input dialog → `PATCH /api/call-lists/:id/approve` with `{ status: 'rejected', reason }`
  - Buttons only appear on rows with `status === 'submitted'`

**Status badge colors**:
| Status | Color |
|--------|-------|
| draft | gray |
| submitted | blue |
| approved | green |
| rejected | red |

---

#### CallPlanPage (`/call-plans`)

**Purpose**: MR creates Call Plans from an approved Call List. Accessible to MR role only.

**Components**:
- `CallPlanForm.jsx`:
  - Approved Call List dropdown — fetches `GET /api/call-lists` on mount, filters client-side to `status === 'approved'`
  - Doctor dropdown — populated from the selected call list's doctor list (fetched via `GET /api/call-lists/:id` when a list is selected)
  - Date input (`<input type="date">`) — required
  - Time input (`<input type="time">`) — required
  - Save button → `POST /api/call-plans`
- `CallPlanTable.jsx`:
  - Columns: ID, Call List, Dokter, Tanggal, Waktu
  - Table data: `GET /api/call-plans` on mount and after successful save

**Validation (client-side)**:
- All fields required before submit
- Date must be within the selected call list's month (display helper text showing allowed range)

---

#### CallActualPage (`/call-actuals`)

**Purpose**: MR records visit actuals. Supports three modes. Accessible to MR role only.

**Components**:
- `CallActualForm.jsx`:
  - Visit mode selector (radio or tabs): **Terencana (Plan)** | **Unplan** | **Non Target**
  - **When mode = Terencana**: Call Plan dropdown — fetches `GET /api/call-plans` on mount; doctor selector auto-fills from selected plan (read-only)
  - **When mode = Unplan or Non Target**: Doctor dropdown — fetches `GET /api/mcl`
  - Visit date input (`<input type="date">`) — required
  - Check-in time input (`<input type="time">`) — required
  - Check-out time input (`<input type="time">`) — required
  - Photo URL input (`<input type="text">`, mock URL) — required
  - Signature URL input (`<input type="text">`, mock URL) — required
  - Product multi-select — fetches `GET /api/products`; minimum 1 required
  - Save button → `POST /api/call-actuals`
    - Sends `plan_id = selectedPlan.id` when mode is Terencana
    - Sends `plan_id = null` when mode is Unplan or Non Target
- `CallActualTable.jsx`:
  - Columns: ID, Dokter, Tanggal, Tipe Kunjungan, Status (badge)
  - Status badge: `in_progress` = yellow, `completed` = green
  - Table data: `GET /api/call-actuals` on mount and after successful save

**Visit type mapping** (client-side only for UX — server resolves the actual type):
| Mode selected | `plan_id` sent to API |
|---------------|----------------------|
| Terencana     | selected call plan ID |
| Unplan        | null |
| Non Target    | null |

---

### Common Components

#### `Spinner.jsx`
Displays a centered loading indicator. Used inside forms while a request is in-flight.

```jsx
export default function Spinner() {
  return <div className="spinner" aria-label="Loading..." role="status" />;
}
```

CSS: circular border animation, centered via `position: absolute` or `flexbox` parent.

#### `Toast.jsx`
Displays a transient notification at the top of the screen.

```jsx
// Usage: showToast('success' | 'error', 'message text')
// Auto-dismisses after ~3 seconds
```

Toast state is managed either via a `ToastContext` co-located in `App.jsx`, or as local state in `App.jsx` passed via props. Supports:
- `success` variant — green background
- `error` variant — red background

---

### UI/UX Patterns

**Loading state**: `Spinner` is shown and the submit button is disabled while a request is in flight. This prevents double-submission.

**Toast notifications**: Success or error toast is shown after every form submission. Never show both at the same time. Toast auto-dismisses after 3 seconds.

**Status badges**: Inline `<span>` with color-coded CSS class:
| Status | Color |
|--------|-------|
| draft | gray (`#9ca3af`) |
| submitted | blue (`#3b82f6`) |
| approved | green (`#22c55e`) |
| rejected | red (`#ef4444`) |
| in_progress | yellow (`#eab308`) |
| completed | green (`#22c55e`) |

**Responsive layout**:
- Max content width: `100%` on mobile, `640px` centered on larger screens
- Inputs and buttons have `min-height: 44px` (touch target)
- Tables scroll horizontally on small screens (`overflow-x: auto` on a wrapper div)
- No horizontal overflow at any viewport width
- Font size minimum `16px` on inputs to prevent iOS auto-zoom
- Flexbox/grid layout — works at 375px (iPhone SE / typical Android)

MR users are the primary mobile audience — all forms must be comfortably usable on a 375px wide screen.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property-based testing is applicable here because the core business logic (status transitions, hierarchy validation, visit type resolution, uniqueness constraints, data isolation) involves pure functions or testable logic that varies meaningfully with input. Properties are tested using a PBT library (e.g., `fast-check` for Node.js) with mocked DB calls, minimum 100 iterations per property.

---

### Property 1: Role-based access enforcement

*For any* protected endpoint that requires role R, a request with a token whose role is NOT in the allowed set for that endpoint SHALL receive a 403 response.

**Validates: Requirements 1.3**

---

### Property 2: Call list creation produces draft status

*For any* valid month and non-empty list of doctor_ids that exist in MCL, creating a call list SHALL always produce a record with status = `draft`.

**Validates: Requirements 3.1**

---

### Property 3: Invalid doctor_ids are rejected

*For any* call list creation request containing at least one doctor_id that does not exist in `master_customers`, the system SHALL return HTTP 422.

**Validates: Requirements 3.2**

---

### Property 4: Call list data isolation between MRs

*For any* two distinct MR users A and B, the call lists returned by GET /api/call-lists for user A SHALL NOT contain any call list belonging to user B.

**Validates: Requirements 3.5, 3.7**

---

### Property 5: Submit only transitions from draft

*For any* call list, submitting it SHALL succeed (returning the list in `submitted` status) if and only if the current status is `draft`. For any other status, submit SHALL return HTTP 422.

**Validates: Requirements 4.1, 4.2**

---

### Property 6: Approval requires direct supervisor

*For any* call list in `submitted` status and any user who is NOT the direct supervisor of the call list owner (according to the DM→MR, RSM→DM, MM→RSM hierarchy), an approval or rejection attempt SHALL return HTTP 403.

**Validates: Requirements 5.3**

---

### Property 7: Rejection always resets to draft

*For any* submitted call list that is rejected by a valid supervisor, the final persisted status SHALL be `draft` (not `rejected`), and the `reason` field SHALL contain the provided rejection reason.

**Validates: Requirements 5.2, 5.5**

---

### Property 8: Rejection requires reason field

*For any* approval request with `status = "rejected"` that omits the `reason` field (or provides an empty string), the system SHALL return HTTP 422.

**Validates: Requirements 5.6**

---

### Property 9: Approved/rejected call lists block further approval

*For any* call list in `approved` or `rejected`/`draft` status (i.e., already processed), any subsequent approve or reject request by any supervisor SHALL return HTTP 422.

**Validates: Requirements 5.4**

---

### Property 10: Call plan requires approved call list

*For any* call plan creation request referencing a call list whose status is NOT `approved`, the system SHALL return HTTP 422.

**Validates: Requirements 6.2, 13.2**

---

### Property 11: Call plan date must be within call list month

*For any* call plan creation request, if `visit_date` is not within the same calendar month as the referenced call list's `month`, the system SHALL return HTTP 422.

**Validates: Requirements 6.4**

---

### Property 12: No duplicate call plans per doctor per day

*For any* MR and any (doctor_id, visit_date) pair, attempting to create a second call plan with the same (user_id, doctor_id, visit_date) combination SHALL return HTTP 409.

**Validates: Requirements 6.5**

---

### Property 13: Call plan and call actual data isolation between MRs

*For any* two distinct MR users A and B, the call plans returned for user A SHALL NOT contain call plans belonging to user B; likewise for call actuals.

**Validates: Requirements 6.6, 7.9**

---

### Property 14: No duplicate call actuals per doctor per day

*For any* MR and any (doctor_id, visit_date) pair, attempting to create a second call actual with the same (user_id, doctor_id, visit_date) SHALL return HTTP 409 regardless of visit type.

**Validates: Requirements 7.8, 8.3, 9.3, 13.3**

---

### Property 15: Visit type resolution is deterministic

*For any* call actual creation request without a `plan_id`, the resolved `visit_type` SHALL be:
- `unplan` if and only if the `doctor_id` is in the MR's approved call list for the visit month.
- `non_target` if and only if the `doctor_id` is in `master_customers` but not in any approved call list.
- A 422 error if and only if the `doctor_id` is not in `master_customers` at all.

**Validates: Requirements 8.1, 8.2, 9.1, 9.2**

---

### Property 16: Required fields are enforced on call actuals

*For any* call actual creation request missing `photo_url`, `signature_url`, or an empty `detailing` array, the system SHALL return HTTP 422. This applies to all visit types (plan, unplan, non_target).

**Validates: Requirements 7.5, 7.6, 7.7, 8.4, 9.4, 13.4**

---

### Property 17: Error responses always include status and message

*For any* request that results in an error (4xx or 5xx), the response body SHALL always be a JSON object containing both `status` and `message` string fields.

**Validates: Requirements 14.5**

---

## Testing Strategy

### Dual Testing Approach

Two layers of tests are used together:

1. **Unit / property tests** — Test pure business logic functions in isolation with mocked DB calls. Use `fast-check` for property-based tests (minimum 100 iterations per property).
2. **Integration tests** — Test complete happy path flows against a real test database (or Docker Postgres). Use `supertest` to make HTTP calls.

### Property Test Configuration

Library: [`fast-check`](https://github.com/dubzzz/fast-check) (Node.js)

Each property test:
- Runs minimum 100 iterations
- Tags with: `// Feature: mobile-sales-force-msf, Property N: <property text>`
- Tests the pure logic function (e.g., `isDirectSupervisor`, `resolveVisitType`, `validateCallListStatus`) with generated inputs

### Unit Tests (example-based)

Focus areas:
- `isDirectSupervisor(approverRole, ownerRole)` — 3+ test cases covering all role pairs
- Auth middleware with valid token, invalid token, missing header
- `resolveVisitType(planId, doctorId, approvedListDoctors, mclDoctors)` — all three branches
- Each route's validation logic with specific invalid inputs (empty doctor_ids, wrong status, missing photo_url, etc.)

### Integration Tests

Focus on the complete happy path per Requirement 13.1:
1. Use `token-dm` to approve MR's submitted call list
2. MR creates call plan from approved call list
3. MR creates call actual (plan visit, unplan visit, non-target visit)
4. Verify HTTP 409 on duplicate call actual for same doctor+date

### Frontend Tests

Frontend testing focuses on component behavior with example-based tests:
- `LoginPage`: clicking a user card stores the correct token in localStorage and redirects to `/call-lists`
- `CallListForm`: submitting with no doctors selected shows a validation message before any API call
- `CallActualForm`: switching mode between Terencana/Unplan/Non Target shows/hides the correct fields
- `axiosClient`: request interceptor adds `Authorization: Bearer <token>` header when token is in localStorage; response interceptor clears localStorage and redirects on 401
- `PrivateRoute`: unauthenticated users (no token) are redirected to `/login`

Library: Vitest + React Testing Library (standard Vite/React ecosystem choice).

### What NOT to property-test

- Frontend rendering and layout (use React Testing Library example-based tests or visual regression)
- Database schema structure (use smoke tests / migration checks instead)
- Infrastructure wiring (use integration tests with 1-2 examples)
- Axios interceptor behavior (example-based unit test is sufficient — behavior is deterministic)
