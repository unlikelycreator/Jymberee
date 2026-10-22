# Jymberee

Jymberee is a personal-safety / emergency SOS app. A user in trouble triggers an SOS
(button, shake/"chop" gesture, voice command or earbud action); the app captures their
location (and optionally a photo), the backend stores the SOS, sends a WhatsApp alert to
the user's emergency contacts, and pushes an FCM notification to other Jymberee users in
the same postal code.

This repository is a monorepo:

```
.
├── backend/    Node.js + Express + MongoDB REST API (versioned /api/v1, v2, v3)
└── frontend/   React Native (0.86) mobile app for Android and iOS
```

---

## Backend (`backend/`)

**Stack:** Node.js (ES modules), Express 4, Mongoose 8 (MongoDB), Firebase Admin (FCM),
Zod validation, JWT auth, Nodemailer, Sentry, Socket.IO, PM2.

### Layout

| Path | Purpose |
|------|---------|
| `index.js` | Entry point: loads `.env`, connects MongoDB, starts HTTP server with `/health` via `@godaddy/terminus` |
| `app.js` | Express app: helmet, CORS, body parsing (50 MB for base64 images), rate limits, mounts `/api/v1`, `/api/v2`, `/api/v3` |
| `routes/v{1,2,3}/` | Versioned routers. **The mobile app uses `v3`.** v3 wraps routes in `fallbackToV1` middleware |
| `controllers/v{1,2,3}/` | Request handlers per version |
| `services/` | Business logic (auth/OTP, referral, ads, email, FCM, firebase-admin) |
| `models/` | Mongoose models: `User` (+ `DeletedUser`), `Sos`, `Notification`, `Report`, `Advertisement`, `Installs`, `EmergencyContacts` |
| `schemas/` | Zod request schemas |
| `middlewares/` | `authenticate` (Bearer JWT), `validate`, `rateLimiter`, `errorHandler`, `fallbackToV1`, `featureFlag` |
| `socketServer.js` | Standalone Socket.IO server for live SOS location updates (separate process, `SOCKET_PORT`) |
| `notify.js`, `backup-sync.cjs` | One-off scripts (manual FCM push; local Mongo → Atlas dump/restore) |
| `ecosystem.config.cjs` | PM2 config (`jymberee-production-8001`) |

### Main API (v3, base `/api/v3`)

| Area | Endpoints |
|------|-----------|
| Auth `/auth` | `POST register`, `verify-otp`, `resend-otp`, `login`, `forgot-password`; `DELETE cancel-account`; authenticated: `POST reset-password`, `save-token`, `profile-picture`; `PUT update-profile`, `emergency-contacts`; `DELETE emergency-contacts/:id`, `delete-account` |
| SOS `/images` | `POST upload-image` (the SOS call: saves image, creates `Sos`, sends WhatsApp to emergency contacts), `GET images`, `POST profilepic` |
| Notifications `/notification` | `POST send-notification` (FCM to users in same postal code; `env: "test"` targets fixed test users), `GET get-notifications`, `DELETE delete-notification/:id`, `DELETE delete-all-notifications`, `PATCH mark-as-read/:id` |
| SOS `/sos` | `POST /`, `GET active` |
| Reports `/report` | `POST crime-report`, `POST fire-report` |
| Referral `/referral` | `POST generate`, `invite`, `apply`; `GET earnings`, `invited` |
| Ads / banners | `GET /ads`, `GET /banner/banners` |
| Web/admin `/web` | `GET users`, `GET users/:id`, `POST install`, `GET installs` |
| Health | `GET /health` |

### Environment variables (`backend/.env`)

`PORT`, `LOCAL_URI`, `DB_NAME`, `MONGO_URI` (socket server / scripts), `ACCESS_TOKEN_SECRET`,
`ACCESS_TOKEN_EXPIRY`, `ALLOWED_ORIGINS`, `EMAIL_USER`, `EMAIL_PASS`, `INSTANCE_ID`,
`WHATSAPP_ACCESS_TOKEN`, `FEATURE_FLAGS`, `SOCKET_PORT`, `NODE_ENV`.
Firebase Admin reads `backend/serviceAccountKey.json`.

### Run

```sh
cd backend
npm install
npm run dev          # nodemon on index.js
# production
pm2 start ecosystem.config.cjs
```

> Note: `npm start` points at `./src/index.js`, which does not exist; use `npm run dev` or PM2.

---

## Frontend (`frontend/`)

**Stack:** React Native 0.86, TypeScript, React Navigation 7 (stack + bottom tabs),
Firebase (Messaging, Crashlytics), Notifee, react-native-maps, Google Mobile Ads,
Facebook SDK, axios, AsyncStorage, custom Kotlin native modules.

### Layout

| Path | Purpose |
|------|---------|
| `App.tsx` | Root: providers (Location, Auth), navigation, FCM init, global SOS loader/alerts driven by `DeviceEventEmitter` (`SOS_SENDING` / `SOS_SENT` / `SOS_FAILED`) |
| `src/navigation/` | `AppNavigator` (auth vs. app stacks), `TabNavigator` (Dashboard, SOS, Map, …) |
| `src/screens/` | Login/Register/OTP/Forgot & Reset password, Dashboard, emergency type screens (Rape, Theft/Crime, Medical, Fire, Other), Map, Notifications, Emergency contacts, Profile, Referral, safety-tip guides, Privacy, Delete account, Offline |
| `src/context/` | `AuthContext` (user + token persisted in AsyncStorage), `LocationContext`, `SosContext` |
| `src/utils/api.ts` | axios instance — base URL `https://ezeelink.net/api/v3` (test server commented out) |
| `src/utils/sendsos.ts` | SOS flow: camera → location → `POST /images/upload-image` → `POST /notification/send-notification` |
| `src/utils/voiceSos.ts`, `earbudSos.ts` | Voice-command and earbud SOS triggers |
| `src/utils/firebase.ts` | FCM token, notification listeners, deep-link to Map |
| `android/app/src/main/java/com/jymberee/` | Native: `ShakeDetectionService` (foreground accelerometer "chop" detection), `SosDispatcher` (sends SOS natively via OkHttp), `BootReceiver`, `MyFirebaseMessagingService`, `LocationHelper` |

### Run

```sh
cd frontend
npm install
cd ios && pod install && cd ..   # iOS only
npm start                         # Metro
npm run android                   # or: npm run ios
```

Release signing on Android expects `android/app/jymberee-release-key.keystore`
(not committed — see `frontend/.gitignore`) and the `MYAPP_UPLOAD_*` properties in
`android/gradle.properties`.

---

## SOS flow end-to-end

1. User triggers SOS in the app (UI button, shake service, voice or earbud).
2. App gets GPS location, optionally takes a photo, and calls
   `POST /api/v3/images/upload-image` with `{ image, latitude, longitude, description }`.
3. Backend saves the image, creates an `Sos` document, reverse-geocodes the address
   (OpenStreetMap Nominatim) and sends a WhatsApp alert to each emergency contact.
4. App calls `POST /api/v3/notification/send-notification`; backend finds users with the
   same postal code and sends FCM pushes, storing them as in-app notifications.
5. Recipients open the notification and see the SOS location on the Map screen.
