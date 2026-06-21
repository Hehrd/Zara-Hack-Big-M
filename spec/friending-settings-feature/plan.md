# Friending + Settings feature

## Context
Locus users currently work in isolation — each user only sees their own location
analyses. The goal is to let a user **add friends and view their friends'
analyses**, plus a **Settings page** to edit credentials and obtain a personal
**add-friend link** of the form `<host>/api/add-friend/<uuid>`. The UUID token is
generated at signup and stored on the user. The existing test user
`locus2@gmail.com` (already in the DB without a token) must be backfilled with one.

Confirmed design decisions:
- **Link flow:** frontend route + API call. The link `<host>/api/add-friend/<uuid>`
  resolves to a frontend page; if the visitor is logged in it calls the backend to
  create the friendship, otherwise it routes to login then returns.
- **Direction (default, confirm at review):** **mutual** — using B's link makes A and
  B friends both ways; each can see the other's analyses.
- **Password change (default, confirm at review):** require current password.

Schema is auto-managed by Hibernate (`ddl-auto: update`), so new entities/columns
auto-create — no manual migration files needed.

---

## Backend (Spring Boot — `com.zara.hack`)

### 1. Add friend-link token to users
- `auth/entity/AppUser.java`: add `@Column(unique = true) String friendToken;`
  Generate in `onCreate()` PrePersist via `UUID.randomUUID().toString()` so every
  new signup gets one automatically.
- `auth/repository/AppUserRepository.java`: add `Optional<AppUser> findByFriendToken(String token)`.

### 2. Backfill existing users (covers locus2@gmail.com)
- New `auth/service/FriendTokenBackfillRunner.java` implementing
  `ApplicationRunner`: for every user with null `friendToken`, set a random UUID
  and save. Idempotent — runs each boot, only touches null tokens. This gives
  locus2 (and any pre-existing user) a working link. Log locus2's link at startup
  for easy testing.

### 3. Friendship entity + repo (new package `com.zara.hack.friends`)
- `friends/persistence/entity/FriendshipEntity.java`: `id`, `@ManyToOne user`,
  `@ManyToOne friend`, `createdAt`, unique constraint on `(user_id, friend_id)`.
  Mutual = store **one row** per pair; query both directions.
- `friends/persistence/repository/FriendshipRepository.java`:
  - `existsByUserIdAndFriendId`, plus reverse check
  - `findByUserIdOrFriendId(userId, userId)` to list all of a user's friendships.

### 4. Friends service + controller
- `friends/service/FriendService.java`:
  - `addFriendByToken(meId, token)` — resolve token→owner; reject self-add and
    duplicates (return existing); create one Friendship(me, owner); return owner summary.
  - `listFriends(meId)` — collect the "other side" of each friendship row → list of
    `FriendDTO(id, email)`.
  - `getFriendAnalyses(meId, friendId)` — verify friendship, then reuse
    `AnalysisService.getAnalysisSummaries(friendId)`.
  - `getFriendAnalysisDetail(meId, friendId, analysisId)` — verify friendship, then
    reuse `AnalysisService.getAnalysisDetail(friendId, analysisId)`.
  - (optional) `removeFriend(meId, friendId)`.
- To reuse AnalysisService for arbitrary userIds, its methods
  (`getAnalysisSummaries`, `getAnalysisDetail`) already take a `userId` arg — call
  them directly with `friendId` after the friendship check. No change needed there.
- `friends/controller/FriendController.java` (`@RequestMapping("/api/friends")`),
  same `@AuthenticationPrincipal Jwt` → `Long.valueOf(jwt.getSubject())` pattern as
  `AnalysisController`:
  - `POST /api/friends/add/{token}` → addFriendByToken
  - `GET  /api/friends` → listFriends
  - `GET  /api/friends/{friendId}/analyses` → summaries
  - `GET  /api/friends/{friendId}/analyses/{analysisId}` → detail
  - `DELETE /api/friends/{friendId}` → removeFriend
- DTOs (records, `@JsonNaming(SnakeCaseStrategy)` like existing DTOs, using
  `tools.jackson...`): `FriendDTO(Long id, String email)`.

### 5. Account (settings) service + controller (new package `com.zara.hack.account`)
- `account/controller/AccountController.java` (`@RequestMapping("/api/account")`):
  - `GET /api/account` → `AccountDTO(id, email, friendToken)` for the current user.
  - `PUT /api/account/credentials` → body `ReqUpdateCredentialsDTO(email?,
    currentPassword?, newPassword?)`. Validates current password (BCrypt
    `passwordEncoder.matches`) before changing email or password; rejects duplicate
    email via `existsByEmail`. Reuse `PasswordEncoder` bean + `AppUserRepository`.
- `account/service/AccountService.java` holding the logic; reuse `ConflictException`
  / `UnauthorizedException` from `common.exception`.
- Frontend builds the full link as `${window.location.origin}/api/add-friend/${friendToken}`,
  so backend only returns the token.

### 6. Security
- `auth/config/SecurityConfig.java`: no change needed — `/api/friends/**`,
  `/api/account/**` fall under `anyRequest().authenticated()`. The add-friend
  endpoint requires auth by design (the frontend sends the JWT).

---

## Frontend (React + TanStack Router + React Query)

API wiring (matches existing `api/*.js` axios pattern):
- `api/friends.js`: `addFriend(token)`, `getFriends()`, `getFriendAnalyses(friendId)`,
  `getFriendAnalysis(friendId, id)`, `removeFriend(friendId)`.
- `api/account.js`: `getAccount()`, `updateCredentials(payload)`.
- `hooks/useFriends.js`, `hooks/useAccount.js`: React Query wrappers mirroring
  `hooks/useAnalyses.js`.

Pages + routes (TanStack file-based; routeTree auto-generated by Vite plugin):
- `routes/settings.jsx` + `pages/SettingsPage.jsx` — edit email/password form,
  display + copy the add-friend link (`origin + /api/add-friend/ + token`).
- `routes/friends.jsx` + `pages/FriendsPage.jsx` — list friends; selecting one
  shows their analysis summaries (reuse the card styling from `DashboardPage`'s
  `RecentAnalysesPanel`); link to a read-only detail view.
- `routes/api.add-friend.$token.jsx` + `pages/AddFriendPage.jsx` — the literal
  `/api/add-friend/<uuid>` link target. On mount: if `useAppStore().user` exists,
  call `addFriend(token)` then redirect to `/friends`; else save token and redirect
  to `/login`, completing the add after login.
- Nav: add **Friends** and **Settings** links to `components/layout/AppShell.jsx`
  `productLinks` (Friends in main nav; Settings near the user/footer area).

UI note (per memory): this feature inherently needs new Settings/Friends UI. Styling
will mirror existing pages (DashboardPage/AppShell) for consistency — no redesign of
existing screens.

---

## Files to create / modify

**Backend — create:**
- `friends/persistence/entity/FriendshipEntity.java`
- `friends/persistence/repository/FriendshipRepository.java`
- `friends/service/FriendService.java`
- `friends/controller/FriendController.java`
- `friends/controller/dto/FriendDTO.java`
- `account/service/AccountService.java`
- `account/controller/AccountController.java`
- `account/controller/dto/AccountDTO.java`
- `account/controller/dto/ReqUpdateCredentialsDTO.java`
- `auth/service/FriendTokenBackfillRunner.java`

**Backend — modify:**
- `auth/entity/AppUser.java` (add friendToken + generate in PrePersist)
- `auth/repository/AppUserRepository.java` (findByFriendToken)

**Frontend — create:**
- `api/friends.js`, `api/account.js`
- `hooks/useFriends.js`, `hooks/useAccount.js`
- `routes/settings.jsx`, `pages/SettingsPage.jsx`
- `routes/friends.jsx`, `pages/FriendsPage.jsx`
- `routes/api.add-friend.$token.jsx`, `pages/AddFriendPage.jsx`

**Frontend — modify:**
- `components/layout/AppShell.jsx` (nav links)

---

## Verification
1. Backend: `cd Backend && ./mvnw spring-boot:run` (or existing run cmd). Confirm
   `friendToken` column + `friendships` table created; check startup log for
   locus2's backfilled link.
2. Frontend: `cd frontend && npm run dev` (port 3000).
3. E2E with two accounts (use agent-browser):
   - Log in as locus2@gmail.com / 123456789 → Settings → copy add-friend link.
   - Log in as a second user → open the link → confirm redirect to /friends and
     locus2 appears; open locus2's analysis from the Friends page.
   - Verify mutual: locus2's Friends list now shows the second user.
   - Settings: change password (with current password), re-login to confirm.
4. Negative checks: self-add rejected; viewing a non-friend's analyses returns 404/403.
```
```
