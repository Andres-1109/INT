# WSPACE — Developer Guide

This file summarizes the current state of the project and the decisions behind it, so anyone picking up the code — teammate or AI assistant — can get oriented quickly. It replaces an earlier version that had fallen out of sync with the actual code after this project was merged from two parallel repositories.

---

## 1. Where this codebase came from

WSPACE was built by a 5-person Riwi team. Two members (María Clara and Daniel) ended up developing the backend independently in parallel, without syncing their branches — María built a working Express + raw-SQL backend against real PostgreSQL, while Daniel rebuilt the backend in TypeScript with Prisma but with a different, less complete data model. This repository is the result of merging both: **María's complete business logic and data model**, rebuilt on **Daniel's TypeScript/Prisma architecture** (controllers, centralized error handling, validators), with several bugs from both original versions fixed along the way. See section 5 for the specific list.

---

## 2. Project rules (from the Riwi brief)

- Backend allowed: Python (Flask/FastAPI) or Express.js — **Express.js (TypeScript) was chosen**.
- Database allowed: MySQL, PostgreSQL, or MongoDB — **PostgreSQL was chosen** (the team already had Docker + PostgreSQL + DataGrip experience from other modules).
- No frontend frameworks allowed — the frontend is Vanilla JS with a hand-built SPA router.
- The project must not be limited to basic CRUD — see section 4 of `WSPACE_Documento_Tecnico.md` for the real business logic implemented (fees, VAT, time-limited approval, overlap validation, penalties).

---

## 3. Current state, in short

- **Brand:** "Agile Facilitator" personality, tagline *"The space you need, when you need it"*, Montserrat typeface, colors: primary teal `#0f6e56`, secondary magenta/lilac `#a55086`.
- **Roles:** WSpacer (books) / WSpacer+ (publishes spaces). Any account can hold both roles; publishing a first space upgrades the account to WSpacer+ automatically.
- **Categories:** `private_office`, `meeting_room`, `coworking`, `creative_space`, `rehearsal_room` — music rehearsal rooms are the project's key differentiator (a niche no mainstream competitor covers).
- **Fees:** 12% + VAT (19% on the fee) to the WSpacer, 6% + VAT to the WSpacer+. WSPACE is **not** a withholding agent for the rental's own VAT — that's the host's responsibility. Notices about this are shown both at checkout and on the publish form.
- **Payments:** simulated (a mock endpoint in the backend), no real gateway integration. A real ePayco sandbox integration is documented as future work.
- **File uploads:** via Cloudinary, called directly from the frontend, no backend involvement.
- **Login:** email/password only. Google OAuth is documented future work.
- **Password recovery:** NOT included in the MVP, future work.
- **Dual mode (WSpacer / WSpacer+):** the mode switch opens a **new browser tab** (`target="_blank"`), it doesn't navigate within the same tab. The session carries over because the JWT lives in `localStorage`, shared across tabs of the same origin.
- **Legal documents:** Terms and Conditions + Data Policy, in `WSPACE_Terminos_y_Politica_Datos.md`.
- **User stories:** 27, in `WSPACE_Historias_de_Usuario.md`.

---

## 4. Project structure

```
wspace/
├── README.md                 Setup and usage instructions — start here
├── docs/                      Full project documentation
├── frontend/                  Vanilla JS SPA
│   ├── index.html
│   ├── css/                   variables.css (brand tokens) + styles.css
│   ├── i18n/                  es.json / en.json dictionaries
│   ├── photos/                logo + promo carousel images
│   └── js/
│       ├── core/               router, auth, api, i18n, upload, utils, app
│       ├── components/         navbar, footer, modals, space card
│       └── views/               one screen per file
└── backend/                   Express + TypeScript + Prisma + PostgreSQL
    ├── prisma/
    │   ├── schema.prisma        data model (8 tables, normalized to 3NF)
    │   └── seed.ts               test data
    ├── src/
    │   ├── config/                Prisma client
    │   ├── controllers/           business logic per resource
    │   ├── routes/                 route → controller wiring
    │   ├── middleware/            auth, error handling, body validation
    │   ├── validators/            zod schemas
    │   └── server.ts
    └── docker-compose.yml         local PostgreSQL
```

---

## 5. What changed in the merge (fixes applied)

These were found while auditing both original repos before merging, and are fixed in this codebase:

1. **Broken login (Daniel's repo):** email was encrypted with a random IV on every call before being used as a lookup key, so the same email produced different ciphertext each time — login could almost never find the matching user. This merge stores email as plain, unique, indexed text (the normal approach), and only hashes the password.
2. **Hardcoded fallback secrets (Daniel's repo):** both the encryption key and the JWT secret had a hardcoded fallback value committed to the repo. This merge fails fast at startup if `JWT_SECRET` isn't set, instead of silently falling back to anything.
3. **Incomplete overlap validation (Daniel's repo):** the booking model only stored a start time, with no end time, so overlapping bookings couldn't be fully checked. This merge stores both `startTime` and `endTime` and checks both ends of the range.
4. **Non-normalized data (Daniel's repo):** photos and amenities were stored as plain string arrays on the space row, which doesn't meet the project's 3NF requirement. This merge uses proper relational tables (`SpacePhoto`, `Amenity`, `SpaceAmenity`), matching María's original design.
5. **Full address exposed publicly (Daniel's repo):** the space detail endpoint returned the full street address. This merge only exposes `city` and `neighborhood` publicly, consistent with the project's privacy rule.
6. **Lost payment reference (Daniel's repo):** the simulated payment generated a reference number but never saved it. This merge persists it on `Booking.paymentReference`.
7. **Duplicate validation systems (Daniel's repo):** `express-validator` and an unused `zod`-based middleware existed side by side. This merge standardizes on `zod` everywhere.
8. **Stray SQLite file:** `backend-mock/dev.db`, a leftover from before the migration to PostgreSQL, was committed to the repo. Dropped.
9. **Role typo (Daniel's repo):** new users were created with `role: "vspacer"` (a "v", not a "w"). Fixed.

---

## 6. Known gaps (documented, not yet built)

- **Admin approval UI:** the backend has the full approve/reject workflow for new space listings (`/api/admin/spaces/...`), but neither original repo built a frontend screen for it. Seeded spaces are pre-approved so the app is usable without it.
- **Favorites, reviews, notifications:** the frontend views exist as placeholders (see the "NOTE for the team" boxes inside `favorites.js`, `hostReviews.js`, and `notifications.js`) but aren't backed by real endpoints yet.
- **Availability calendar (`spaceAvailability.js`):** the UI for a host to block specific dates/times isn't built yet, even though the backend supports it (`SpaceBlock` model, `space_blocks` table).
- **Profile editing:** `profile.js` only simulates saving; there's no `PATCH /users/me` endpoint yet.
- **WSpacer+ verification documents:** the data model supports a national ID and bank certificate upload (as URLs, same pattern as space photos), but no signup step actually collects them yet.
- **"First hour free" promo:** the `freeBookingsUsed` field and the welcome pop-up promising it existed in both original repos, but neither wired it into the actual price calculation. This merge fills that gap in the booking controller — worth double-checking with the team that "one free hour on your first booking" is really the intended rule.

---

## 7. Local setup

See `README.md` at the project root for the full step-by-step.
