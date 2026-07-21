# WSPACE — User Stories

Riwi Integrator Project · CodeUp Riwi: Beyond Limits · Basic Track

Format: *As a [role], I want [action], so that [benefit].* Each story includes its acceptance criteria.

---

## 1. Account and authentication

**US-01 — Sign up as a WSpacer**
> As a visitor, I want to sign up with my name, email, and password, so that I can search for and book spaces.
- Validates email format.
- Minimum 8-character password, with an uppercase letter and a number.
- Confirms that the password and its confirmation match.
- Validates phone format (10 digits).
- Requires explicit acceptance of the Terms and Conditions and the Data Policy.
- Shows an error if the email is already registered.

**US-02 — Log in**
> As a registered user, I want to log in with my email and password, so that I can access my account.
- Shows a clear message if the credentials are wrong.
- Redirects back to the section the login was opened from after signing in (without losing navigation context).

**US-03 — Log out**
> As an authenticated user, I want to log out, so that I can protect access to my account on a shared device.

**US-04 — Upgrade to WSpacer+**
> As a WSpacer, I want to request the WSpacer+ role by submitting my national ID and a bank certificate, so that I can publish spaces and receive payments.
- Requires uploading an ID document and a bank certificate before enabling the role.
- Shows the verification status (pending/approved) if the process requires review.

**US-05 — Switch between WSpacer mode and WSpacer+ mode**
> As a user with both roles, I want to switch modes from the profile menu, so that I can manage my bookings or my published spaces depending on what I need.
- Switching modes opens a new browser tab, keeping the session active without closing the original view.

**US-06 — Change the platform's language**
> As a user, I want to switch the language between Spanish and English, so that I can use the platform in my preferred language.
- The change applies without reloading the page.
- The language preference persists across sessions.

---

## 2. Search and discovery (WSpacer)

**US-07 — Search available spaces**
> As a WSpacer, I want to filter spaces by location, type, date, and time, so that I can quickly find one that's available and fits my need.
- Only shows spaces with no overlap against confirmed bookings or existing blocks.
- Respects the operating hours configured for each space.
- Shows a clear, actionable empty state when there are no results.
- Each result includes a thumbnail cover photo.

**US-08 — Browse by category**
> As a WSpacer, I want to browse by space category (office, meeting room, coworking, creative space, music rehearsal room), so that I can discover options without having to type a specific search.

**US-09 — View a space's detail**
> As a WSpacer, I want to see a space's photo gallery, amenities, availability calendar, location, and reviews, so that I can decide whether to book it.
- The amenities shown correspond to the space's type/subtype.
- The main amenities are shown first, with a "view all" option.

**US-10 — Save spaces as favorites**
> As a WSpacer, I want to mark spaces as favorites, so that I can find them easily later without searching again.

---

## 3. Bookings (WSpacer)

**US-11 — Request a booking**
> As a WSpacer, I want to select a date and time and submit a booking request, so that I can secure use of the space.
- Doesn't allow selecting times that are already taken or blocked.
- The total price recalculates live based on the selected hour range.
- Shows the full breakdown (base price + fee + VAT) before confirming.

**US-12 — See my request's status**
> As a WSpacer, I want to see whether my request is pending, approved, or rejected, so that I know whether to wait or look for another option.
- Shows the time remaining before the host's response deadline expires.

**US-13 — Pay for an approved booking**
> As a WSpacer, I want to pay for my booking once the host approves it, so that I can confirm my access to the space.
- Shows an informational notice about VAT and the WSpacer+'s tax responsibility.
- Visually confirms successful payment with a reference number.

**US-14 — Manage my bookings**
> As a WSpacer, I want to see my active, past, and cancelled bookings in one place, so that I can track my requests.

**US-15 — Cancel a booking**
> As a WSpacer, I want to cancel a confirmed booking, so that I can free up the space if I no longer need it.
- Informs whether the cancellation triggers a penalty based on how much time is left before the booking.

**US-16 — Rate a space**
> As a WSpacer, I want to leave a rating and comment after a completed booking, so that I can share my experience with other users.
- The rating is optional and doesn't block closing out the booking.
- Only someone who actually completed a booking can rate it.

---

## 4. Publishing and managing spaces (WSpacer+)

**US-17 — Publish a new space**
> As a WSpacer+, I want to register a space with a name, type, location, price, photos, and amenities, so that I can offer it on the platform.
- Requires at least one uploaded photo before publishing.
- Shows a live price calculator with fee and VAT as the hourly rate is entered.
- The amenities available to select change based on the chosen space type/subtype.
- Shows a notice about VAT responsibility on the published price.

**US-18 — Edit or deactivate a space**
> As a WSpacer+, I want to edit my published spaces' information or temporarily deactivate them, so that I can keep my listings up to date.

**US-19 — Manage availability**
> As a WSpacer+, I want to block specific dates or times on a space, so that I can prevent bookings when it isn't available.

**US-20 — Approve or reject booking requests**
> As a WSpacer+, I want to review and respond to booking requests within a defined deadline, so that I can confirm use of my space.
- If I don't respond within the deadline, the request is automatically cancelled at no charge.

**US-21 — View the income and bookings panel**
> As a WSpacer+, I want to see a summary of pending bookings, this month's income, and my average rating, so that I can track my activity as a host.

**US-22 — View reviews received**
> As a WSpacer+, I want to see the ratings and comments WSpacers have left about my spaces, so that I can understand how my service is perceived.

---

## 5. Communication

**US-23 — Chat with the other party on a booking**
> As a WSpacer or WSpacer+, I want to send messages tied to a specific booking, so that I can coordinate details before or during use of the space.
- Chat is only available in the context of an existing booking, not as free-form messaging.

**US-24 — Receive notifications**
> As a user, I want to receive notifications about the status of my requests, bookings, and payments, so that I stay informed without having to manually check every section.
- Includes an unread-notification counter visible in the navigation bar.
- Clicking a notification navigates to the related view.

---

## 6. General / cross-cutting

**US-25 — View legal information**
> As a user, I want easy access to the Terms and Conditions and the Data Processing Policy, so that I know my rights and responsibilities on the platform.

**US-26 — Get a welcome discount**
> As a new visitor, I want to learn about the discount on my first booking through a pop-up, so that I'm encouraged to try the platform.
- Shown at most once per session.
- Doesn't appear again once the user has already used their free booking (`freeBookingsUsed`).

**US-27 — Edit my profile**
> As a user, I want to update my personal data and password, so that I can keep my information current.
