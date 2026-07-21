# WSPACE

A platform for renting physical spaces by the hour (private offices, meeting rooms, coworking, creative spaces, and music rehearsal rooms), under a multi-host model inspired by Airbnb.

**Riwi Integrator Project — CodeUp: Beyond Limits (Basic Track).**

This repository merges the work of two team members who developed the backend independently. See `docs/GUIDE.md` for the full story and the list of bugs fixed during the merge.

---

## Tech stack

- **Frontend:** HTML + CSS + Vanilla JavaScript (hand-built SPA, no frameworks)
- **Backend:** Express.js + TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **File uploads:** Cloudinary
- **Auth:** JWT + bcrypt

---

## Prerequisites

- [Node.js](https://nodejs.org) 20 or newer
- [Docker](https://www.docker.com/) (recommended, for PostgreSQL) — or a local PostgreSQL install

---

## Getting started

### 1. Database (PostgreSQL)

```bash
cd backend
docker compose up -d
```

This starts a PostgreSQL container with a database called `wspace_db`. If you'd rather not use Docker, create a database named `wspace_db` in your own local PostgreSQL install and update `DATABASE_URL` accordingly in step 2.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Open .env and set JWT_SECRET to your own random phrase.
# If you're not using Docker, also update DATABASE_URL.

npm install
npm run prisma:generate
npm run prisma:migrate     # creates the 11 tables in the database
npm run seed                # loads test users and sample spaces
npm run dev
```

The backend listens on `http://localhost:3000`. Leave this terminal running while you test the frontend.

### 3. Frontend

The frontend is plain HTML/CSS/JS, so it needs no build step — just a local static server (opening the file directly with a double-click won't work, since `fetch()` needs an actual server).

**With Live Server (VS Code) — recommended:**
1. Open the project's root folder in VS Code.
2. Right-click `frontend/index.html` → "Open with Live Server".

**Without VS Code:**
```bash
cd frontend
npx serve .
```

### 4. Test accounts

Created automatically by `npm run seed`:

| Email | Password | Role |
|---|---|---|
| `admin@wspace.com` | `password123` | Admin |
| `ana@example.com` | `password123` | WSpacer (books spaces) |
| `carlos@example.com` | `password123` | WSpacer+ (owns 3 sample spaces) |

---

## Project structure

```
wspace/
├── README.md
├── docs/                       Full project documentation
│   ├── GUIDE.md                  Developer guide (start here for context)
│   ├── WSPACE_Documento_Tecnico.md
│   ├── WSPACE_Historias_de_Usuario.md
│   ├── WSPACE_Resumen_Ejecutivo_Proyecto.md
│   └── WSPACE_Terminos_y_Politica_Datos.md
├── frontend/                   Vanilla JS SPA
│   ├── index.html
│   ├── css/
│   ├── i18n/                     es.json / en.json
│   ├── photos/
│   └── js/
│       ├── core/                  router, auth, api, i18n, upload, utils, app
│       ├── components/            navbar, footer, modals, space card
│       └── views/                  one screen per file
└── backend/                    Express + TypeScript + Prisma + PostgreSQL
    ├── prisma/
    │   ├── schema.prisma           data model (8 tables, normalized to 3NF)
    │   └── seed.ts
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── routes/
    │   ├── middleware/
    │   ├── validators/
    │   └── server.ts
    ├── docker-compose.yml
    └── .env.example
```

---

## API overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/spaces` | Search spaces (`?city=&type=`) |
| GET | `/api/spaces/mine` | Spaces owned by the logged-in user |
| GET | `/api/spaces/:id` | Space detail |
| POST | `/api/spaces` | Publish a new space |
| PATCH | `/api/spaces/:id` | Edit a space |
| PATCH | `/api/spaces/:id/toggle-active` | Temporarily hide/show a space |
| POST | `/api/bookings` | Request a booking — payment is simulated and mandatory as part of this call; the booking is never created if it fails |
| GET | `/api/bookings/mine` | My bookings (as guest) |
| GET | `/api/bookings/host` | Bookings received on my spaces |
| PATCH | `/api/bookings/:id/respond` | Approve/reject a request |
| PATCH | `/api/bookings/:id/cancel` | Cancel a booking (guest) |
| PATCH | `/api/bookings/:id/host-cancel` | Cancel a booking (host, may incur a penalty) |
| GET | `/api/admin/spaces/pending` | Spaces awaiting approval (admin) |
| PATCH | `/api/admin/spaces/:id/approve` | Approve a space (admin) |
| PATCH | `/api/admin/spaces/:id/reject` | Reject a space (admin) |

---

## Notes

- `.env` is never committed (it's in `.gitignore`) — use `.env.example` as the template.
- Known gaps and pending work are documented in `docs/GUIDE.md`, section 6.
- If a search returns no results right after a fresh `npm run seed`, double-check `docker compose ps` shows the `postgres` container as healthy before running migrations.
