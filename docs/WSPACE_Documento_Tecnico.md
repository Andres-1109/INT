# Technical Document — WSPACE

Riwi Integrator Project · CodeUp Riwi: Beyond Limits · Basic Track

---

## 1. Project name

**WSPACE** — A platform for renting physical spaces by the hour.

---

## 2. General objective

To design, develop, and present a functional web application that lets people and businesses (**WSpacer+**) publish physical spaces available by the hour, and lets other people (**WSpacer**) search for, book, and pay for them, integrating frontend, backend, and data persistence under real intermediary business logic (fees, booking approval, availability, and differentiated tax responsibility).

---

## 3. Specific objectives

1. Implement a Vanilla JavaScript SPA interface, with no frameworks, with smooth navigation, responsive (mobile-first) design, and real-time form validation.
2. Model and persist, in a relational database normalized up to 3NF, the data for users, spaces, bookings, photos, availability blocks, and amenities.
3. Implement real business logic: differentiated fee and VAT calculation, booking approval with a response deadline, cross-checked availability control, and non-compliance penalties.
4. Apply the SCRUM methodology throughout development, with evidence of a Product Backlog, Sprint Backlog, and tracking board.
5. Integrate real third-party services: file uploads (Cloudinary) and a simulated payment gateway.
6. Document the project so that every team member can individually defend it, including the decisions made and their rationale.

---

## 4. Problem identified

Freelancers, remote work teams, and musicians who need a physical space for a short block of hours (an interview, a one-off meeting, a music rehearsal) don't have a centralized, trustworthy platform to find and book one. Current alternatives are fragmented: coworking spaces with rigid monthly plans, room rentals managed manually over WhatsApp or social media, and an almost complete lack of organized supply for specific niches like music rehearsal rooms.

---

## 5. Scope

### Included in the MVP
- Registration and authentication with email/password.
- Space publishing by WSpacer+, with photos, price, location, type, and amenities.
- Search and filtering of spaces by location, type, date, and time, respecting real availability.
- Full booking flow: request → host approval/rejection with a deadline → simulated payment → confirmation.
- Calculation and display of differentiated fees and VAT (WSpacer 12% + VAT, WSpacer+ 6% + VAT).
- Host panel (dashboard, my spaces, bookings received).
- Guest panel (my bookings, profile).
- Bilingual platform (Spanish/English).
- Legal documents (Terms and Conditions, Data Policy) integrated into the platform.

### Out of scope for the MVP (documented future work)
- Real integration with a payment gateway (ePayco sandbox).
- Google authentication (OAuth).
- Password recovery by email.
- Real-time notifications (WebSockets).
- A full tax engine (withholdings, DIAN electronic invoicing).
- A fully implemented favorites and reviews system (documented, scaffolded, pending connection to a real backend).

---

## 6. User stories

The full detail (27 stories with acceptance criteria, organized by functional block) is in `WSPACE_Historias_de_Usuario.md`. Summary by block:

| Block | Number of stories |
|---|---|
| Account and authentication | 6 |
| Search and discovery | 4 |
| Bookings | 6 |
| Space publishing and management | 6 |
| Communication (notifications, chat) | 2 |
| Cross-cutting (legal, profile, welcome) | 3 |

---

## 7. Solution architecture

### 7.1 Overview
A classic client-server architecture, with an SPA frontend consuming a REST API.

```
+----------------------+        HTTP / JSON        +------------------------+
|   FRONTEND (SPA)      | -------------------------->|   BACKEND (REST API)   |
|  HTML + CSS + JS       | <---------------------------|  Express.js            |
|  Vanilla, no            |                            +-----------+------------+
|  frameworks              |                                        |
+----------+-------------+                                        |
           |                                                       |
           | (direct call,                              +---------v---------+
           |  bypasses the backend)                      |  Database          |
           v                                              |  PostgreSQL        |
+----------------------+                                  +--------------------+
|  Cloudinary            |
|  (photos and documents)|
+----------------------+
```

### 7.2 Frontend
- **Pattern:** a hand-built SPA (no framework), with its own routing based on `history.pushState` and a `popstate` listener.
- **Modular structure:** a clear separation between `router`, `auth`, `api` (backend communication), `i18n` (languages), `upload` (Cloudinary), reusable components (navbar, modals, cards), and per-screen views.
- **Authentication:** a JWT received from the backend, stored in `localStorage` (allows a session shared across tabs, needed for the WSpacer/WSpacer+ mode switch).
- **Design:** mobile-first, with centralized CSS variables for the brand identity (Montserrat typography, teal/coral colors).

### 7.3 Backend
Built with **Express.js**, connected to a real **PostgreSQL** database, following the entity-relationship model defined by the team (see section 8), through **Prisma** as the ORM. Exposes a REST API consumed by the frontend, with JWT authentication, input validation (via zod), and centralized error handling. Can be run locally with Docker (`docker-compose.yml` included) or with a direct PostgreSQL installation, depending on the team's preference. Earlier in development, a temporary mock backend (in-memory data) was used to test the frontend independently while the real backend was being built; that stage is now complete and the mock backend has been retired.

### 7.4 Data persistence
A relational **PostgreSQL** database, normalized up to 3NF, with 8 tables and 1-to-N and N-to-N relationships implemented through foreign keys and a join table (`space_amenity`). Domain rules (user role, booking status) are enforced with database-level enums/constraints. Persistence was verified empirically: data remains intact after restarting the server. See the data model in section 8.

### 7.5 Third-party services integrated
- **Cloudinary:** uploads space photos and verification documents, called directly from the frontend.
- **Payment gateway:** simulated on the backend (an in-house mock), with the architecture prepared to integrate ePayco's real sandbox as future work.

---

## 8. Data model

Originally designed by the backend team, and **implemented and working** in `backend/prisma/schema.prisma` (PostgreSQL, 8 tables, normalized up to 3NF). Main entities:

- **USERS** — identification data, role (WSpacer / WSpacer+), account status.
- **SPACES** — published spaces, with type/subtype, location, capacity, prices, and hours.
- **BOOKINGS** — bookings, with status, prices, fees, and response deadlines.
- **BOOKING_PENALTIES** — penalties tied to a booking.
- **SPACE_PHOTOS** — each space's photos.
- **SPACE_BLOCKS** — availability blocks set by the host.
- **AMENITIES** — amenity catalog, related to SPACES through a join table (M:N relationship).

**Main relationships:** USERS *publishes* SPACES (1:N) · USERS *books* BOOKINGS (1:N) · SPACES *receives* BOOKINGS (1:N) · BOOKINGS *generates* BOOKING_PENALTIES (1:N) · SPACES *has* SPACE_PHOTOS and SPACE_BLOCKS (1:N) · SPACES *has* AMENITIES (M:N).

**Business-logic rationale in the model:** fields like `guestFee`, `hostFee`, `usedFreeBooking` (on BOOKINGS) and `responseDeadline` show that the model isn't limited to CRUD operations, but supports real business rules around fees, time-limited approval, and penalties.

---

## 9. Scrum evidence

- **Product Backlog:** built from the 27 user stories documented in `WSPACE_Historias_de_Usuario.md`.
- **Sprint Backlog:** to be defined by the team, distributing the stories across sprints according to the project's overall timeline (Week 1: planning and design; Weeks 2-3: development; Weeks 4-5: integration and defense).
- **Tracking board:** managed in whichever tool the team chooses (Trello, Jira, GitHub Projects), with evidence of tasks moved across columns during development.
- **Scrum roles:** Scrum Master/Lead, Backend Developer, Frontend Developer, Product Owner (roles are a reference; every member participates actively in development).

---

## 10. Technology rationale

| Decision | Rationale |
|---|---|
| Vanilla JavaScript + hand-built SPA | A mandatory requirement of the brief (frameworks aren't allowed); demonstrates real understanding of how the routing and state management that a framework normally provides actually work. |
| Relational database (PostgreSQL) | The business domain has clear, stable relationships between entities (users, spaces, bookings), which benefits from referential integrity and relational queries. PostgreSQL specifically was chosen because the team already had experience with Docker + PostgreSQL + DataGrip from other modules in the training track. |
| JWT + localStorage | Allows protecting SPA routes without reloading the page, and enables the cross-tab shared-session pattern needed for the WSpacer/WSpacer+ mode switch. |
| Cloudinary | Avoids depending on server-side file storage, which is unreliable in serverless/static deployment environments like Vercel or GitHub Pages. |
| Simulated payment gateway | Academic scope: lets the full business flow be demonstrated without the complexity and risk of handling real transactions; the architecture is left ready for a real integration later. |
| Combined 18% fee (12% + 6%) | Calculated considering the real cost of a payment gateway (~4.5%) and benchmarked against the closest direct competitor (Peerspace, with combined fees of 25-35%), ensuring market competitiveness. |
| Prisma as ORM | Type-safe queries and migrations that stay in sync with the schema, reducing the risk of a query drifting out of sync with the actual table structure as the schema evolves. |

---

## 11. Defined MVP

WSPACE's Minimum Viable Product lets a WSpacer+ publish a space with complete information (photos, price, location, amenities), and lets a WSpacer find it through filtered search, request a booking, receive the host's approval or rejection within a deadline, pay for it (simulated), and see the full fee and VAT breakdown at every step. Project evaluation prioritizes functionality, stability, and real user value over the number of features built, in line with the brief's criteria.
