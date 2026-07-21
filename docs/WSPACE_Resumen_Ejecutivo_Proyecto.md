# WSPACE — Project Executive Summary

Riwi Integrator Project · CodeUp Riwi: Beyond Limits · Basic Track

---

## 1. Business concept

**WSPACE** is a platform for renting physical spaces by the hour (private offices, meeting rooms, coworking, creative spaces, and music rehearsal rooms), under a **multi-host** model inspired by how Airbnb works, but adapted specifically to work and creative needs rather than lodging.

**Value proposition:** *"The space you need, when you need it."*

### Why this approach
Unlike a lodging platform, WSPACE solves a **short-term, high-frequency** need (hours, not nights), which requires a more granular availability model (blocks by the hour, not by the day) and different business logic around approval, cancellation, and payments.

---

## 2. Brand identity

| Element | Definition | Rationale |
|---|---|---|
| Personality | Agile Facilitator | Balances seriousness (business audience) with approachability (freelancers), without feeling cold-corporate or overly informal |
| Tone of voice | Direct, action verbs, no corporate jargon | Reinforces the perception of "solving things fast" |
| Typography | Montserrat | Geometric, legible on screen, modern without losing seriousness |
| Primary color | Teal `#0F6E56` | Trust and seriousness — balances the B2B side of the business |
| Secondary color | Coral `#D85A30` | Warmth and approachability — balances the freelance/creative side |

### Role naming: WSpacer / WSpacer+
Terms like "host/guest" (a domestic metaphor that doesn't fit a work context) were dropped in favor of a short, brand-owned term that needs no translation between Spanish and English, and carries an "extra tier" logic (the `+` symbol) that reinforces that any WSpacer can become a WSpacer+ without conceptual friction.

---

## 3. Product categories (key differentiator)

| Category | Differentiating element |
|---|---|
| Private office | Market standard |
| Meeting room | Market standard |
| Coworking / shared desk | Market standard |
| Creative space (studio/podcast/photo) | An underserved niche among general-purpose platforms |
| **Music rehearsal room** | **Main differentiator** — a niche with no centralized, trustworthy platform in the local market, with a naturally high hourly-use frequency (a perfect fit for the business model) |

**Amenities are contextual per category** (e.g. "water station" for offices vs. "drum kit included" for rehearsal rooms), presented with a Booking.com-style visual pattern (icon grid + checkmarks + "view all"), consuming the M:N relationship that already exists between `SPACES` and `AMENITIES` without requiring any structural change to the data model.

---

## 4. Frontend structure (Vanilla JavaScript SPA)

### 4.1 Route map
```
/                              Home
(login/signup)                 Login/register modal (not a full-page route)
/spaces                        Listing with filters (query params)
/space/:id                     Space detail
/my-bookings                   WSpacer panel
/favorites                     WSpacer panel
/profile                       Shared
/notifications                 Shared
/dashboard                     WSpacer+ panel
/my-spaces                     WSpacer+ panel
/my-spaces/new                 Publication form
/my-spaces/:id/availability    Manage blocked dates/times
/my-spaces/bookings            Approve booking requests
/my-spaces/reviews             Reviews received
/terms, /privacy-policy        Static legal pages
```

### 4.2 Why Vanilla JS with this routing approach
Since frameworks aren't allowed, routing is implemented by managing navigation state with `history.pushState` and a `popstate` listener, dynamically rendering content into a main container — the standard hand-built SPA pattern, which demonstrates real understanding of how frameworks work under the hood (a strong point for the individual defense).

### 4.3 Internationalization (i18n) system
JSON dictionaries (`es.json` / `en.json`) + `data-i18n` attributes in the HTML + a text-replacement function, with the language preference persisted in `localStorage`. Justified by the requirement that the commercial pitch be delivered in English — having a bilingual platform reinforces that "ready for an international context" narrative.

### 4.4 Authentication and security
- JWT issued by the backend, stored in `localStorage` (allows a session shared across tabs, needed for the host-mode switch).
- SPA route protection before rendering private views (`requireAuth`, `requireHostRole`).
- A `fetch` wrapper that automatically attaches the token and handles session expiration (401 → clear session and redirect).
- Two-layer form validation: frontend (immediate feedback) and backend (real data integrity).

### 4.5 File uploads
Integration with **Cloudinary** (a third-party service) for space photos and WSpacer+ verification documents, returning URLs that get stored in the corresponding data-model fields (`SPACE_PHOTOS.url`, national ID document, bank certificate). Self-hosted storage was ruled out given the ephemeral nature of the deployment environments under consideration (Vercel, GitHub Pages).

### 4.6 Payments (simulated)
A simulated payment gateway on the backend (an ePayco mock), given the project's academic scope. The architecture is documented for an eventual real integration with ePayco's sandbox environment as future work.

---

## 5. Business logic implemented (beyond CRUD)

This is the section that directly answers the project brief's rule: *"The project may not be limited exclusively to basic CRUD operations."*

1. **Real cross-checked availability:** search excludes spaces with confirmed bookings or blocks that overlap the requested time range.
2. **Time-limited approval:** the WSpacer+ has a deadline to respond to a request; if it expires, the booking is cancelled automatically.
3. **Differentiated fees:** 12% to the WSpacer + VAT on that fee, 6% to the WSpacer+ + VAT on that fee — a structure calculated considering the real cost of a payment gateway (~4.5%) and benchmarked against the closest competitor (Peerspace, 25-35% combined) to stay competitive.
4. **Differentiated tax responsibility:** WSPACE only reports VAT on its own intermediation fee; VAT on the space rental itself is the WSpacer+'s responsibility, with explicit notices both on the publish form and at checkout.
5. **Staged verification:** sensitive data (national ID, bank certificate) is only requested when upgrading to WSpacer+, not at general sign-up — this minimizes initial friction and only asks for what's necessary once money is actually involved.
6. **Penalties:** late cancellations or no-shows create a record in `BOOKING_PENALTIES`, with its own business logic.
7. **Dynamic role-conversion banner:** the "publish your space" CTA changes depending on the user's state (logged out / WSpacer / WSpacer+), demonstrating real conditional logic on the frontend.

---

## 6. Differentiators versus the competition

| Element | Why it's novel |
|---|---|
| Music rehearsal rooms as their own category | A niche not covered by Airbnb, WeWork, or Peerspace |
| Combined fee (18%) well below the closest comparable (Peerspace ~25-35%) | A concrete selling point for the commercial pitch |
| Explicit tax transparency at checkout and publication | Uncommon even on real platforms; builds trust |
| Dual WSpacer/WSpacer+ mode opening in a new tab | Solves a real UX problem (not mixing audiences) with a simple, technically elegant solution |
| Category-contextual amenities system | Avoids a generic, low-relevance catalog for niches like music or photography |

---

## 7. MVP scope (what's in, and what's future work)

**In the MVP:**
Registration/login (email and password), search with real availability, a full booking flow with approval, simulated payments, fees and VAT calculated and displayed, in-app notifications, real file uploads via Cloudinary, a bilingual platform, booking-linked chat (future work, see below).

**As documented future work (not yet implemented):**
Google login (OAuth), password recovery by email, a real integration with ePayco's sandbox, real-time notifications via WebSockets, a full tax engine (withholdings, DIAN electronic invoicing), and the booking-linked chat mentioned above.

---

## 8. Legal documents

Terms and Conditions and the Personal Data Processing Policy were drafted in line with the Colombian regulatory framework (Law 1581 of 2012, Decree 1074 of 2015, Law 1480 of 2011), available in `WSPACE_Terminos_y_Politica_Datos.md`.
