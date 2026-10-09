# UniPath

UniPath is a campus academic operations and navigation platform built as a college minor project. Admins manage academic resources, timetables, quiz venues, and events; students use a portal for current academic activity and notifications. The faculty dashboard is currently a placeholder, although faculty-scoped read APIs exist. This README describes the implemented prototype and its technical flow.

Timetable generation is a constraint-based scheduling heuristic, not AI or a globally optimal solver. Campus maps, route finding, quiz grading, and attendance are not implemented.

## Architecture and technical flow

```text
React/Vite browser
  ├─ React Router pages and ProtectedRoute
  ├─ AuthContext (session restore, login, registration, logout)
  ├─ Axios client (API base URL + JWT Bearer header)
  ├─ Feature services/hooks (resources, timetable, quizzes, events)
  └─ NotificationContext (Socket.IO + persisted notification refresh)
                 │ HTTP JSON and authenticated Socket.IO
                 ▼
Express API (backend/src)
  ├─ routes/       Mount endpoints and select auth/role/validation middleware
  ├─ middleware/   JWT auth, roles, Zod validation, error/not-found handling
  ├─ controllers/  Translate HTTP requests/responses and call services
  ├─ services/     Academic rules, scheduling, allocation, analytics, notices
  ├─ models/       Mongoose schemas, validation, references, indexes
  └─ utils/        JWT, application errors, logging
                 │ Mongoose
                 ▼
              MongoDB
```

The request flow is: browser service calls Express route → authentication middleware verifies the JWT and attaches the current database user to `req.user` → role middleware gates privileged operations → Zod middleware validates body/query input → a controller invokes a service → the service applies business rules and reads/writes Mongoose documents → JSON response. The common error handler formats Zod, Mongoose, duplicate-key, application, and unexpected errors. Business rules are kept in services rather than React components or route declarations.

The frontend stack is React 18, Vite, React Router, Tailwind CSS with feature stylesheets, Axios, Lucide React, Recharts, and `socket.io-client`. The backend stack is Node.js ES modules, Express, MongoDB/Mongoose, dotenv, bcryptjs, JWT, Zod, and Socket.IO.

`backend/src/server.js` creates the HTTP and Socket.IO servers, authenticates socket handshakes with JWT, joins sockets to `user:<id>` and `role:<role>` rooms, starts the HTTP listener, and connects to MongoDB. The frontend starts `AuthProvider` and `NotificationProvider` around the route tree. The Axios client adds `Authorization: Bearer ...` from `sessionStorage` to API requests.

### Main code areas

- `frontend/src/App.jsx`: route tree and role-protected pages.
- `frontend/src/context/`: auth/session and notifications state.
- `frontend/src/pages/`: login, registration, role dashboards, and admin feature pages.
- `frontend/src/services/`, `hooks/`, `lib/api.js`: API calls and shared page state.
- `backend/src/app.js`: Express middleware and feature route mounting.
- `backend/src/routes/`, `controllers/`, `services/`, `models/`, `middleware/`, `utils/`: API and domain layers.
- `backend/scripts/`: local development account/resource seeding.

## Requirements and installation

- Node.js 18 or newer and npm
- MongoDB Community Server or a MongoDB Atlas database

Install dependencies in separate terminals:

```powershell
cd frontend
npm install
```

```powershell
cd backend
npm install
```

## Environment configuration

Use `frontend/.env.example` and `backend/.env.example` as templates for private local `.env` files. Do not commit `.env` files or put real credentials in the examples.

Backend variables:

- `PORT`: API port; defaults to `4000`.
- `MONGODB_URI`: MongoDB connection string, for example `mongodb://127.0.0.1:27017/unipath`. `MONGO_URI` is also accepted for an existing local setup.
- `JWT_SECRET`: required random secret, at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` and set it only in the private backend `.env` file.
- `JWT_EXPIRES_IN`: token lifetime; defaults to `1d`.
- `CLIENT_ORIGIN`: allowed frontend origin for CORS and Socket.IO; defaults to `http://localhost:5173`. `CLIENT_URL` is also accepted for an existing local setup.

Frontend variable:

- `VITE_API_BASE_URL`: API base URL; defaults to `http://localhost:4000/api`.
- `VITE_SOCKET_URL`: optional Socket.IO origin; otherwise it is derived from the API base URL.

## Seed development accounts

With MongoDB running and the backend environment configured, run:

```powershell
cd backend
npm run seed
```

These development-only scripts are disabled when `NODE_ENV=production`. The user seed creates missing demo accounts and does not overwrite existing passwords. The resource seed inserts missing room/faculty/subject examples, updates the named sample section records and their parent links, and archives legacy sample sections.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@unipath.com` | `UniPath-Demo-Only-2026!` |
| Faculty | `faculty@unipath.com` | `UniPath-Demo-Only-2026!` |
| Student | `student@unipath.com` | `UniPath-Demo-Only-2026!` |

The shared password is an obvious development-only credential. Never use it outside local development.

## Start the applications

Run the backend and frontend in separate terminals:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`. Sign in at `/login`; role redirects send admins to `/admin`, faculty to `/faculty`, and students to `/student`. The frontend keeps the JWT in `sessionStorage` and sends it as a Bearer token. It is cleared on sign-out and when the token is rejected.

## Authentication API

- `POST /api/auth/register`: accepts `{ "name", "email", "password", "department?", "semester?" }`; creates a `STUDENT` account and returns a JWT. Public registration cannot assign privileged roles.
- `POST /api/auth/login`: accepts `{ "email", "password" }`; returns `{ success, user, token }`.
- `GET /api/auth/me`: requires `Authorization: Bearer <token>` and returns the signed-in user.
- `GET /api/admin`: example admin-only route. It rejects unauthenticated requests with `401` and faculty/student accounts with `403`.

Request bodies are validated with Zod. Passwords are hashed with bcryptjs (bcrypt format) before persistence; the API never returns password hashes.

## Academic resources

The admin sidebar links to Rooms, Faculty, Subjects, and Sections. Each management page supports search, relevant filters, create, edit, and delete actions.

All resource endpoints require a Bearer token. Resource collections and item paths are:

- `/api/resources/rooms`
- `/api/resources/faculty`
- `/api/resources/subjects`
- `/api/resources/sections`

For each resource, `GET /api/resources/:resource` lists records and accepts `search` plus supported filters; `GET /api/resources/:resource/:id` reads one record; `POST /api/resources/:resource` creates; `PATCH /api/resources/:resource/:id` updates; and `DELETE /api/resources/:resource/:id` deletes. Only admins may create, update, or delete; other roles receive `403`. Request validation errors return `400`, missing records return `404`, and duplicate unique values return `409`.

Students can read only active campus rooms, faculty and subjects in their own department, and sections matching both their department and semester. Set those profile fields at student registration or on the user record. Students without a department receive no faculty or subject records; those without both department and semester receive no sections. Admins and faculty can read the full resource catalog.

The demo resource seed provides 12 rooms, 21 faculty, 14 subjects, and 24 active CSE/ECE/EE teaching groups. The sample cohorts are CSE (134 students: G1/G2 plus seven 20-person-or-smaller lab batches), ECE (120 students: G1/G2 plus six lab batches), and EE (96 students: G1/G2 plus five lab batches). CSE1–CSE3 are linked to CSE-G1; CSE4–CSE7 are linked to CSE-G2. Two large rooms are included for the 60/74-student CSE lecture cohorts. Legacy CS-A/EE-A sample groups are archived to keep linked records intact. The demo student is assigned Computer Science, semester 3 if those profile fields are not already set.

## Roles, pages, and data model

| Role | Frontend home | Main permissions |
| --- | --- | --- |
| `ADMIN` | `/admin` | Full resource, timetable, quiz allocation, event publishing, and analytics management. |
| `FACULTY` | `/faculty` | Read access to the faculty member's timetable and related quiz/event/resource data. The current faculty page is a placeholder rather than a full workflow. |
| `STUDENT` | `/student` | Department/semester-scoped timetable and quizzes, published events, and own notifications. |

Public registration always creates `STUDENT`; it cannot assign privileged roles. Frontend route protection improves navigation, but the API separately enforces JWT authentication and role authorization.

| Mongoose model | Main fields and relations |
| --- | --- |
| `User` | Name, normalized unique email, bcrypt `passwordHash` (excluded from ordinary queries), role, optional department/semester, timestamps. |
| `Room` | Name, building, floor, capacity, `CLASSROOM`/`LAB`/`SEMINAR_HALL`, active state. |
| `Faculty` | Name, unique email, department, availability strings. |
| `Subject` | Unique code, name, department, credits, `THEORY`/`LAB`. |
| `Section` | Name, department, semester, student count, `LECTURE`/`LAB`, cohort, optional parent section, roll range, active state, and curriculum array. Curriculum entries hold a subject reference, weekly lecture/lab counts, and each duration. |
| `Timetable` | Section, subject, faculty, room, weekday, start/end time, creator, timestamps. |
| `Quiz` | Subject, one or more sections, date/time, derived student count, status, creator. |
| `VenueAllocation` | Quiz, room, allocated students, inclusive roll range, optional assigned faculty list. |
| `Event` | Title/description, date/time, venue, organizer, draft/published status, creator. |
| `Notification` | Recipient, title/message/type, read state, created date. |

The main frontend routes are `/login`, `/register`, `/admin`, `/admin/rooms`, `/admin/faculty`, `/admin/subjects`, `/admin/sections`, `/admin/timetable`, `/admin/quizzes`, `/admin/events`, `/faculty`, and `/student`. Feature API calls live in frontend service modules rather than being assembled in page components.

## Timetable and scheduling

The admin sidebar opens the Monday-Friday timetable grid. It supports section, faculty, and room filters, manual add/edit/delete, server-side conflict checks, department planning, generation, and confirmed clear-all. Choose a department and semester; all active lecture and lab sections for that semester are included automatically. Select around four or five courses, then edit each course's lecture count, lecture duration, lab count, and lab duration independently. The scheduler replaces the prior schedule only for those included sections; other groups remain untouched. Lab blocks use contiguous time slots and LAB rooms. The UI reports assignments and unassigned meetings. The grid displays days as rows, hourly periods as columns, and longer classes as cards spanning connected periods.

Daily generation excludes the **13:00–14:00 lunch break**; backend validation also rejects manual or generated classes overlapping lunch. CSE-G1 and CSE-G2 have separate section identities and may run classes at the same time when separate rooms and faculty are available. Filtering by a lab subset such as CSE1 also shows its linked parent lecture group.

Timetable APIs require a Bearer token. Reads are available to authenticated roles and are scoped for students to their department/semester sections and for faculty to their own faculty profile. Only admins may create, update, delete, generate, or request a conflict check.

- `GET /api/timetable?section=<id>&faculty=<id>&room=<id>` lists accessible entries; filters can be combined.
- `POST /api/timetable` manually creates an entry with `section`, `subject`, `faculty`, `room`, `day`, `startTime`, and `endTime`.
- `PATCH /api/timetable/:id` updates an entry; `DELETE /api/timetable/:id` removes one.
- `POST /api/timetable/check-conflict` accepts the same entry fields and returns `{ "hasConflict", "conflicts" }` without writing.
- `POST /api/timetable/generate` accepts resource ID arrays plus available days and time slots:

  ```json
  {
    "sections": ["<lecture-section-id>", "<lab-section-id>"],
    "subjects": ["<subject-id>"],
    "faculty": ["<faculty-id>"],
    "rooms": ["<room-id>"],
    "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    "timeSlots": [
      { "startTime": "09:00", "endTime": "10:00" },
      { "startTime": "10:00", "endTime": "12:00" },
      { "startTime": "14:00", "endTime": "15:00" }
    ],
    "weeklyLoads": [{
      "subject": "<subject-id>",
      "lecturesPerWeek": 3,
      "lectureDurationHours": 1,
      "labsPerWeek": 1,
      "labDurationHours": 2
    }],
    "replaceExisting": true
  }
  ```

- `DELETE /api/timetable` (ADMIN) clears all saved timetable entries and notifies affected students; section course workloads remain saved. The admin UI requires confirmation before clearing the global schedule.

The backend checks faculty, room, and section time overlaps, room capacity, LAB-to-LAB room assignment, and lunch. Conflicting manual writes return `409` with structured conflicts. Resource edits that would invalidate a saved schedule are also rejected, and referenced resources cannot be deleted. The scheduling service uses a greedy baseline plus bounded backtracking; scoring spreads meetings across days, avoids very tight or very long gaps where possible, and adds mild random tie-breaking so repeated generations need not produce the same weekly pattern. This is a heuristic, not a guarantee of optimality. Assignments with no feasible slot are returned in `unassignedAssignments` with reasons such as room capacity, missing faculty, or no non-conflicting slot.

## Quizzes and venue allocation

Admins can create quizzes for one or more sections from the **Quizzes & venues** page; student count is derived from their section enrollment. The page shows active, inactive, and time-conflicted venues for the selected date/time. The backend independently checks room activity, timetable bookings, and overlapping quizzes. Rooms are filled using a greedy best-fit strategy and student roll numbers are assigned consecutively from 1. Optionally select faculty to book two per venue; overlapping class/quiz bookings are rejected. Deleting a quiz removes its venue allocations and releases its faculty bookings.

- `GET /api/quizzes`: lists accessible quizzes and their venue allocations (admins see all; students see quizzes for their department/semester sections; faculty see quizzes for sections on their timetable).
- `GET /api/quizzes/availability?date=YYYY-MM-DD&startTime=HH:mm&endTime=HH:mm` (ADMIN): lists each venue with availability and reason.
- `POST /api/quizzes` (ADMIN): creates `{ title, subject, sections: [sectionId], date: "YYYY-MM-DD", startTime, endTime }`.
- `POST /api/quizzes/:id/allocate` (ADMIN): accepts `{ "availableRooms": ["<room-id>"], "facultyIds": ["<faculty-id>"] }`. Faculty IDs are optional; if supplied, at least two available faculty are required per venue used. The response contains per-room roll ranges and faculty bookings.
- `DELETE /api/quizzes/:id` (ADMIN): deletes the quiz and releases all room and faculty bookings.

The planner saves course counts and durations into each included section's curriculum. Use the top bar theme button to switch between light and dark mode; the preference is stored in the browser.

Allocation checks overlapping quiz allocations and weekly timetable classes on the quiz's weekday. The backend serializes allocation writes with timetable writes in the running API process.

## Events, notifications, and student portal

Admins manage campus events at `/admin/events`. Events start as drafts by default and can be published or unpublished. Students and faculty only receive published events. Publishing an event notifies all student accounts; timetable mutations notify students in the affected section(s); and changed quiz venue allocations notify students in the quiz's section. Notification targeting and persistence are centralized in `notification.service.js`.

- `GET /api/events`: admin sees all events; faculty and students see published events.
- `POST /api/events` (ADMIN): creates an event with `title`, `description`, `date` (`YYYY-MM-DD`), `startTime`, `endTime`, `venue`, `organizer`, and optional `status` (`DRAFT` or `PUBLISHED`).
- `PATCH /api/events/:id` and `DELETE /api/events/:id` (ADMIN): edit or remove an event.
- `PATCH /api/events/:id/status` (ADMIN): publish with `{ "status": "PUBLISHED" }` or unpublish with `{ "status": "DRAFT" }`.
- `GET /api/notifications`: returns the signed-in user's latest notifications and unread count.
- `PATCH /api/notifications/:id/read` and `PATCH /api/notifications/read-all`: mark notifications read for the signed-in user only.

The student dashboard loads events, today's timetable, upcoming quizzes and their venue/roll allocations, and notifications from those APIs. Read access uses the existing timetable and quiz role scoping. Authenticated clients open Socket.IO with their existing JWT in the handshake auth payload. The server joins each connection to private user and role rooms. After MongoDB saves a notification, the notification service emits `notification:new` to each recipient's private room. `notifyRole` persists one notification per role member before emitting. If the socket is disconnected, the client continues to use persisted notifications and polls the notification API every 20 seconds until it reconnects. Notification recipient selection uses department and semester because student accounts do not yet have a linked section or roll number.

To try a live quiz venue change, sign in as the affected student in one browser and as admin in another. Allocate a quiz to Room 301 first, then select Room 405 for that quiz and run **Auto allocate venues** again. When both rooms are active and available, the student receives a toast naming the new room and roll range; the notification is also stored in MongoDB and appears in the student portal.

## Admin analytics

`GET /api/analytics/admin` (ADMIN) returns current account/resource counts, active published events, detected saved timetable conflicts, upcoming quizzes/events, grouped recent notification deliveries, recent timetable changes, and a seven-day timetable/quiz update trend. Room utilization is seat-hours filled divided by seat capacity-hours across saved timetable records and non-cancelled quiz allocations. Timetable records are weekly schedule slots; quiz allocations are individual dated sessions, so the dashboard labels the measure as utilization across saved bookings rather than campus-wide operating-hour occupancy. The admin dashboard refreshes this endpoint on demand and does not use hardcoded metrics or a cache.

## Prototype limitations

- The Faculty workspace is a placeholder. Faculty can read scoped APIs, but faculty timetable editing or course management is not exposed as a complete UI.
- Faculty `availability` is stored on the profile but is not parsed into timetable generator constraints yet.
- Student accounts are scoped by department and semester, not by a specific lecture group, lab subset, or roll number. Notifications therefore target matching department/semester students.
- Timetable generation uses a randomized heuristic with bounded search. It enforces hard constraints but cannot promise global optimality; classes can remain unassigned if rooms/resources are insufficient.
- Quiz roll ranges are allocated consecutively starting at roll 1 for each quiz rather than using institutional roll identifiers.
- Room utilization is a seat-hours estimate from saved timetable and quiz allocation records, not a full campus opening-hours calendar.
- Socket notifications are persisted before emission, but the emitter is in-process. Multi-instance deployment would need a shared Socket.IO adapter/message broker.
- Events provide publication and student visibility; maps, campus route finding, attendance, quiz questions/grading, and event registration are outside the current implementation.

## Manual verification

After seeding and starting both applications:

1. Visit `/login` and sign in with each demo account. Confirm the role lands on its matching dashboard.
2. While signed in as a student or faculty user, navigate directly to `/admin`. The frontend redirects to that user's own role route.
3. Use this PowerShell example to verify server-side role authorization. Replace the email/password for each role; admin should get `200`, faculty/student should get `403`:

   ```powershell
   $body = @{ email = 'admin@unipath.com'; password = 'UniPath-Demo-Only-2026!' } | ConvertTo-Json
   $session = Invoke-RestMethod -Method Post -Uri 'http://localhost:4000/api/auth/login' -ContentType 'application/json' -Body $body
   Invoke-RestMethod -Uri 'http://localhost:4000/api/admin' -Headers @{ Authorization = "Bearer $($session.token)" }
   ```

4. Verify the current user with `GET /api/auth/me` using the same token. Try `/api/admin` without a token; it should return `401`.
5. Register a student with `POST /api/auth/register`. Confirm an invalid email/password body returns `400`; a body containing a `role` field is rejected with `400`.
6. Open `/admin/timetable`, generate a timetable, and confirm the result reports assignments, conflicts, and unassigned classes. Attempt to manually add two overlapping classes for the same faculty, room, or section; the API should reject each with `409` and identify the conflict type. Also try a room smaller than the section, and a `LAB` subject in a non-LAB room; both should be rejected.

## API and MongoDB health

Open `http://localhost:4000/api/health` or run `Invoke-RestMethod http://localhost:4000/api/health`. Its `database` field reports `connected` when Mongoose is connected. The backend terminal also logs MongoDB connection and disconnection events.
