const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, PageBreak, Header, Footer, PageNumber,
  TableOfContents, LevelFormat, TabStopType, Bookmark, InternalHyperlink, PageReference,
} = require('docx');

const OUT = process.argv[2];
const DIR = __dirname;
const LOGO = '/home/user/Jymberee/marketing/assets/jymberee-logo.png';
const MARK = '/home/user/Jymberee/marketing/assets/jymberee-mark.png';

const C = { ink: '0B1020', ink2: '3B4256', muted: '6B7280', red: 'E8261C', line: 'D9DCE3', soft: 'F4F5F9', head: 'FFF1EF', code: 'F6F7FB' };
const W = 9638; // content width (A4, 2 cm margins)

/* ---------- helpers ---------- */
const runs = (text, base = {}) => {
  // **bold** and `code` inline markup
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ ...base, text: t.slice(1, -1), font: 'Consolas', size: (base.size || 21) - 2, color: 'B42318' }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
};
const P = (text, opts = {}) => new Paragraph({ children: runs(text, opts.run || {}), spacing: { after: 120, line: 288 }, ...opts.p });
const TOC = [];
const mark = (t, lvl) => { const id = `h${TOC.length + 1}`; TOC.push({ t, lvl, id }); return new Bookmark({ id, children: [new TextRun(t)] }); };
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [mark(t, 1)], pageBreakBefore: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [mark(t, 2)] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const B = (t, level = 0) => new Paragraph({ numbering: { reference: 'bullets', level }, children: runs(t), spacing: { after: 60, line: 276 } });
const N = (t, ref = 'steps') => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), spacing: { after: 60, line: 276 } });
const code = (lines) => lines.map((l, i) => new Paragraph({
  children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 18, color: C.ink })],
  shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.code },
  spacing: { before: i === 0 ? 80 : 0, after: i === lines.length - 1 ? 160 : 0, line: 252 },
  indent: { left: 160, right: 160 },
  border: {
    left: { style: BorderStyle.SINGLE, size: 12, color: 'C9CDD8', space: 6 },
  },
}));
const callout = (title, text, color = C.red, fill = C.head) => new Table({
  width: { size: W, type: WidthType.DXA }, columnWidths: [W],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: W, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill },
    margins: { top: 120, bottom: 120, left: 200, right: 200 },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, left: { style: BorderStyle.SINGLE, size: 24, color } },
    children: [
      new Paragraph({ children: [new TextRun({ text: title, bold: true, color })], spacing: { after: 60 } }),
      ...[].concat(text).map((t) => new Paragraph({ children: runs(t), spacing: { after: 40, line: 276 } })),
    ],
  })] })],
});
const gap = (n = 120) => new Paragraph({ children: [], spacing: { after: n } });

const border = { style: BorderStyle.SINGLE, size: 4, color: C.line };
const borders = { top: border, bottom: border, left: border, right: border };
function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  widths = widths.map((w) => Math.round((w / total) * W));
  widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
  const cell = (t, i, head, zebra) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: head ? C.ink : zebra ? 'FAFBFC' : 'FFFFFF' },
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [].concat(t).map((line) => new Paragraph({
      children: head ? [new TextRun({ text: line, bold: true, color: 'FFFFFF', size: 19 })] : runs(line, { size: 19 }),
      spacing: { after: 20, line: 264 },
    })),
  });
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false, ri % 2 === 1)) })),
    ],
  });
}
const img = (file, w, h, caption) => [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: w, height: h },
      altText: { title: caption, description: caption, name: path.basename(file) } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: caption, italics: true, size: 18, color: C.muted })] }),
];

/* ---------- content ---------- */
const body = [];
const add = (...x) => x.flat().forEach((e) => body.push(e));

/* 1 Introduction */
add(H1('1. Introduction'));
add(H2('1.1 Purpose of this document'));
add(P('This document is the technical reference for **Jymberee**, a personal-safety and emergency SOS platform. It explains what the product does, how the mobile app and backend are built, how data flows during an emergency, how to set up, run and deploy each part, and what risks and defects exist in the current code.'));
add(H2('1.2 Audience'));
add(B('**Developers** joining the project: architecture, code layout, API and data model.'));
add(B('**DevOps / operations**: environment variables, deployment, monitoring and backups.'));
add(B('**Product and QA**: features, user flows, platform differences and known issues.'));
add(H2('1.3 Scope and source'));
add(P('Everything here was derived from the monorepo `unlikelycreator/Jymberee`, which contains two applications:'));
add(table(['Folder', 'Application', 'Technology'], [
  ['`backend/`', 'REST API server', 'Node.js (ES modules), Express 4, MongoDB via Mongoose 8'],
  ['`frontend/`', 'Mobile app for Android and iOS', 'React Native 0.86, TypeScript, custom Kotlin modules'],
  ['`marketing/`', 'Marketing flyer and logo assets', 'HTML source, PNG, PDF'],
], [1.4, 2.2, 4.4]));
add(gap());
add(callout('Note on accuracy', 'This document describes the code as it is, including parts that are unfinished or broken. Statements about behaviour are based on reading the source; they are not the result of running the system against production.', '2563EB', 'EEF3FF'));

/* 2 Product overview */
add(H1('2. Product overview'));
add(H2('2.1 What Jymberee does'));
add(P('Jymberee turns a phone into a personal safety network. When a user is in danger they trigger an SOS. The app captures their GPS location (and optionally a photo), the backend records the emergency, sends a WhatsApp alert with the address, map coordinates and photo to the user\u2019s emergency contacts, and sends a push notification to other Jymberee users in the same postal-code area, who can see the SOS on a live map.'));
add(img('/home/user/Jymberee/marketing/jymberee-flyer.png', 250, 353, 'Figure 1 \u2013 Marketing flyer summarising the product'));
add(H2('2.2 Core features'));
add(table(['Feature', 'Description', 'Where in code'], [
  ['SOS by button', 'Bottom-tab SOS button opens a bubble menu: Fire, Theft, Rape, Medical, Other (free text). Each option takes a photo, then sends the SOS.', '`navigation/TabNavigator.tsx`, `utils/sendsos.ts`'],
  ['Emergency screens', 'Dedicated screens for Rape/Assault, Crime/Theft, Medical, Fire and Other, each with an SOS action plus safety tips and helplines.', '`screens/RapeScreen.tsx`, `TheftScreen.tsx`, `Medical.tsx`, `FireScreen.tsx`, `OtherEmergencyScreen.tsx`'],
  ['Voice SOS', 'Continuous speech recognition while the Dashboard is open. Phrases such as \u201chelp me\u201d, \u201chelp fire\u201d, \u201chelp theft\u201d, \u201chelp rape\u201d, \u201chelp medical\u201d trigger an SOS (8 s cooldown).', '`utils/voiceSos.ts`'],
  ['Shake / \u201cchop\u201d SOS (Android)', 'A native foreground service reads the accelerometer and fires an SOS after 5 sharp chops within 1.3 s, even with the app in the background. Restarts after reboot.', '`android/.../ShakeDetectionService.kt`, `SosDispatcher.kt`, `BootReceiver.kt`'],
  ['WhatsApp alerts', 'Emergency contacts receive a WhatsApp template with name, phone, address, coordinates, message and photo.', '`backend/controllers/v3/imageController.js`'],
  ['Community alerts', 'Push notification to all users whose `postalCode` matches the SOS location; stored as in-app notifications (last 5 kept).', '`backend/controllers/v3/notification.controller.js`'],
  ['Live map', 'Shows the 3 most recent SOS events from other users, with profile pictures and a driving route via GraphHopper.', '`screens/MapScreen.tsx`'],
  ['Emergency contacts', 'Import from phone contacts or add manually; at least one is mandatory at registration.', '`screens/EmergencyContacts.tsx`'],
  ['Safety guides', 'First aid, safety tips, fire safety, medical safety and crime-prevention content.', '`screens/FirstAidGuide.tsx` and related'],
  ['Refer & earn', 'Each user has a referral code. Inviter earns 10, new user earns 5 (balance units). Rewarded ads on the referral screen.', '`backend/services/referral.service.js`, `screens/ReferralScreen.tsx`'],
  ['Ads & banners', 'Dashboard carousel from `/ads`; AdMob banner/rewarded ads in the app.', '`backend/services/advertisement.service.js`'],
  ['Account management', 'Profile, profile picture, preferred locations, password reset, account deletion with reason (archived).', '`screens/ProfileScreen.tsx`, `DeleteAccountScreen.tsx`'],
], [1.6, 4.2, 2.6]));
add(H2('2.3 SOS triggers by platform'));
add(table(['Trigger', 'Android', 'iOS', 'Notes'], [
  ['SOS button / emergency screens', 'Yes', 'Yes', 'Takes a photo with the camera before sending.'],
  ['Voice phrases', 'Yes (app open on Dashboard)', 'Yes (app open on Dashboard)', 'Listener starts on Dashboard focus; not a background service.'],
  ['Shake / chop gesture', 'Yes (background)', 'No', 'Native Kotlin service only; no iOS equivalent.'],
  ['Earbuds', 'Disabled', 'Disabled', '`utils/earbudSos.ts` exists but its listener is commented out in `DashboardScreen.tsx` and `index.js`.'],
], [2.2, 1.7, 1.7, 3.0]));
add(gap());
add(callout('Marketing alignment', ['The flyer currently advertises earbud triggering and shake-while-locked as general features. In the code, earbud SOS is switched off and shake SOS is Android-only. Either enable/port these features or adjust the marketing copy before publishing.'], 'B54708', 'FFF6E6'));

/* 3 Architecture */
add(H1('3. System architecture'));
add(H2('3.1 High-level view'));
add(P('Jymberee is a classic three-tier mobile system: a React Native client, a stateless Express REST API with MongoDB, and several third-party services for messaging, geocoding and push delivery.'));
add(img(path.join(DIR, 'arch.png'), 620, 362, 'Figure 2 \u2013 System architecture'));
add(H2('3.2 Technology stack'));
add(table(['Layer', 'Technology', 'Version / detail'], [
  ['Mobile framework', 'React Native, React', 'RN ^0.86.3, React 19.2.8, TypeScript'],
  ['Navigation', 'React Navigation', 'native-stack, stack, bottom-tabs v7'],
  ['Mobile storage', 'AsyncStorage; Android SharedPreferences', 'Token, user JSON, FCM token'],
  ['Maps & location', 'react-native-maps, map-clustering, get-location, geolocation-service', 'GraphHopper for routes'],
  ['Push', '@react-native-firebase/messaging, Notifee', 'Channel `sos_channel`'],
  ['Monitoring (app)', 'Firebase Crashlytics', ''],
  ['Ads / analytics', 'react-native-google-mobile-ads, react-native-fbsdk-next, tracking-transparency', 'AdMob app IDs in `app.json`'],
  ['Voice', '@dev-amirzubair/react-native-voice', 'On-device speech recognition'],
  ['Native (Android)', 'Kotlin, OkHttp, Google Play Services Location', 'Shake service, SOS dispatcher'],
  ['API server', 'Node.js, Express 4', 'ES modules (`"type": "module"`)'],
  ['Database', 'MongoDB with Mongoose 8', 'Database name `jimburry`'],
  ['Validation', 'Zod 4', '`backend/schemas/`'],
  ['Auth', 'jsonwebtoken, bcryptjs', 'JWT Bearer, default expiry 7 days'],
  ['Security middleware', 'helmet, cors, express-rate-limit', ''],
  ['Push (server)', 'firebase-admin', '`sendEachForMulticast`'],
  ['Email', 'Nodemailer (Gmail service)', 'OTP and transactional emails'],
  ['Realtime (optional)', 'socket.io', 'Separate `socketServer.js` process'],
  ['Ops', 'PM2, @godaddy/terminus, @sentry/node', 'Health checks, graceful shutdown, error tracking'],
], [1.8, 3.2, 3.0]));
add(H2('3.3 External services'));
add(table(['Service', 'Used for', 'Called from', 'Credentials'], [
  ['Firebase Cloud Messaging', 'Push alerts to nearby users', 'Backend', '`backend/serviceAccountKey.json`'],
  ['BhashSMS (WhatsApp)', 'SOS message + photo to emergency contacts (v3)', 'Backend', 'Hard-coded in `imageController.js`'],
  ['dealsms.in (WhatsApp)', 'Text-only SOS message (legacy `/sos` route)', 'Backend', '`INSTANCE_ID`, `WHATSAPP_ACCESS_TOKEN`'],
  ['OpenStreetMap Nominatim', 'Reverse geocoding to address / postal code', 'Backend and app', 'None (public, rate-limited)'],
  ['Gmail SMTP', 'OTP, temporary password, deletion emails', 'Backend', '`EMAIL_USER`, `EMAIL_PASS`'],
  ['GraphHopper', 'Driving route on the Map screen', 'App', 'Key hard-coded in `MapScreen.tsx`'],
  ['Google AdMob, Facebook SDK', 'Ads, analytics', 'App', 'IDs in `app.json` / native config'],
  ['MongoDB Atlas', 'Backup target', '`backup-sync.cjs`', 'Hard-coded URI'],
], [2.0, 2.8, 1.4, 2.4]));
add(H2('3.4 Environments'));
add(table(['Environment', 'API base URL', 'How it is selected'], [
  ['Production', '`https://ezeelink.net/api/v3`', 'Default in `frontend/src/utils/api.ts`; native `SosDispatcher.kt` is hard-coded to it.'],
  ['Test', '`http://103.118.17.247:8001/api/v3`', 'Commented line in `api.ts`; swap manually.'],
  ['Notification test mode', 'n/a', 'App sends `env: "test"` to `/notification/send-notification`; backend then only notifies three hard-coded test user IDs. Production code sends `env: "prod"`.'],
], [1.6, 3.0, 4.0]));

/* 4 Repository */
add(H1('4. Repository structure'));
add(...code([
  'Jymberee/',
  '\u251c\u2500\u2500 README.md',
  '\u251c\u2500\u2500 backend/',
  '\u2502   \u251c\u2500\u2500 index.js              # entry: env, DB connect, HTTP server, /health',
  '\u2502   \u251c\u2500\u2500 app.js                # express app, middleware, /api/v1|v2|v3',
  '\u2502   \u251c\u2500\u2500 instrument.mjs        # Sentry init (loaded with --import)',
  '\u2502   \u251c\u2500\u2500 ecosystem.config.cjs  # PM2 config',
  '\u2502   \u251c\u2500\u2500 socketServer.js       # optional Socket.IO live-location server',
  '\u2502   \u251c\u2500\u2500 notify.js, backup-sync.cjs   # one-off scripts',
  '\u2502   \u251c\u2500\u2500 config/               # db.js, constants.js',
  '\u2502   \u251c\u2500\u2500 routes/v1|v2|v3/      # versioned routers',
  '\u2502   \u251c\u2500\u2500 controllers/v1|v2|v3/ # request handlers',
  '\u2502   \u251c\u2500\u2500 services/             # auth, referral, ads, email, fcm, firebase-admin',
  '\u2502   \u251c\u2500\u2500 models/               # Mongoose models',
  '\u2502   \u251c\u2500\u2500 schemas/              # Zod request schemas',
  '\u2502   \u251c\u2500\u2500 middlewares/          # auth, validate, rate limit, errors, fallback',
  '\u2502   \u2514\u2500\u2500 utils/                # AppError, logger, email template, Indian states',
  '\u251c\u2500\u2500 frontend/',
  '\u2502   \u251c\u2500\u2500 App.tsx, index.js     # root component, SDK init',
  '\u2502   \u251c\u2500\u2500 src/navigation/       # AppNavigator, TabNavigator',
  '\u2502   \u251c\u2500\u2500 src/screens/          # ~35 screens',
  '\u2502   \u251c\u2500\u2500 src/components/       # Popup, VoiceCommandsModal, location picker',
  '\u2502   \u251c\u2500\u2500 src/context/          # Auth, Location, Sos contexts',
  '\u2502   \u251c\u2500\u2500 src/utils/            # api, sendsos, voiceSos, earbudSos, firebase',
  '\u2502   \u251c\u2500\u2500 android/              # Gradle project + Kotlin native modules',
  '\u2502   \u2514\u2500\u2500 ios/                  # Xcode project, Podfile',
  '\u2514\u2500\u2500 marketing/                # flyer.html/.png/.pdf, assets/ (logo)',
]));

/* 5 Backend */
add(H1('5. Backend'));
add(H2('5.1 Startup sequence'));
add(N('`index.js` loads `.env` via `dotenv/config`.', 'boot'));
add(N('`ConnectDB()` connects to `${LOCAL_URI}/${DB_NAME}` with up to 5 retries (1 s, 2 s, \u2026 back-off), pool size 10.', 'boot'));
add(N('An HTTP server is created from `app.js` and wrapped by `@godaddy/terminus`, which adds a `/health` check (re-checks the DB) and graceful shutdown on SIGTERM.', 'boot'));
add(N('The server listens on `PORT` (default 8001). Sentry is initialised before everything by `--import ./instrument.mjs`.', 'boot'));
add(H2('5.2 Request pipeline (app.js)'));
add(table(['Order', 'Middleware', 'Purpose'], [
  ['1', '`helmet` (CSP and COEP disabled)', 'Security headers'],
  ['2', '`morgan("combined")`', 'Access logging'],
  ['3', '`cors` with `ALLOWED_ORIGINS` (or all origins)', 'Cross-origin access, credentials allowed'],
  ['4', '`express.json` / `urlencoded` (limit 50 MB)', 'Large limit because SOS photos arrive as base64'],
  ['5', '`cookie-parser`', 'Cookie parsing'],
  ['6', '`express.static("public")`, `/uploads`', 'Static files'],
  ['7', '`authLimiter` on v1 auth paths (v3 applies it inside register, login and resend-otp handlers)', '10 requests per 15 min per IP'],
  ['8', '`/api/v1`, `/api/v2`, `/api/v3` routers', 'Versioned API'],
  ['9', '`GET /health`', 'Liveness JSON'],
  ['10', 'Catch-all 404, `globalErrorHandler`', 'Uniform error responses'],
], [0.8, 4.2, 3.6]));
add(H2('5.3 API versioning'));
add(P('Three versions are mounted side by side. **The mobile app uses v3 exclusively.** v3 reuses some v2 controllers (reports) and adds banners. v3 routes are wrapped by `fallbackToV1`, which is intended to re-run a request against the v1 router if the v3 handler throws. In practice the fallback rewrites only `/api/v2` paths, so it has little effect on v3 traffic; treat v3 as the source of truth and plan to remove v1/v2 once no client uses them.'));
add(H2('5.4 Authentication'));
add(B('Tokens are JWTs signed with `ACCESS_TOKEN_SECRET`, payload `{ _id, email, phoneNumber }`, expiry `ACCESS_TOKEN_EXPIRY` (default `7d`). There is no refresh token.'));
add(B('Clients send `Authorization: Bearer <token>`. The `authenticate` middleware verifies the token, loads the user (without `password` and `otp`) into `req.user`.'));
add(B('Every authentication failure returns HTTP 401 with `{ success: false, message: "3" }`; the app treats message `"3"` as \u201clog in again\u201d.'));
add(B('Passwords are hashed with bcrypt (cost 10). Accounts start as `pending` and become `active` after email OTP verification.'));
add(H2('5.5 Validation and errors'));
add(P('Request bodies are validated with Zod schemas (`schemas/auth.schema.js`, `referral.schema.js`, `advertisment.schema.js`) through the `validate` middleware. Handlers are wrapped in `asyncHandler`. Business errors throw `AppError(message, statusCode)`; `globalErrorHandler` logs every error through `utils/logger.js` and returns `{ status, message }`. In production, unexpected errors return the generic message \u201cSomething went wrong\u201d.'));
add(H2('5.6 Environment variables'));
add(table(['Variable', 'Required', 'Used by', 'Description'], [
  ['`PORT`', 'No (8001)', 'index.js', 'HTTP port'],
  ['`LOCAL_URI`', 'Yes', 'config/db.js', 'MongoDB connection string without database name'],
  ['`DB_NAME`', 'Yes', 'config/db.js', 'Database name (production: `jimburry`)'],
  ['`MONGO_URI`', 'For scripts', 'socketServer.js, notify.js', 'Full Mongo URI for side processes'],
  ['`ACCESS_TOKEN_SECRET`', 'Yes', 'auth', 'JWT signing secret'],
  ['`ACCESS_TOKEN_EXPIRY`', 'No (7d)', 'user.model.js', 'JWT lifetime'],
  ['`ALLOWED_ORIGINS`', 'No', 'app.js', 'Comma-separated CORS origins'],
  ['`EMAIL_USER`, `EMAIL_PASS`', 'Yes', 'email.service.js', 'Gmail account and app password'],
  ['`INSTANCE_ID`, `WHATSAPP_ACCESS_TOKEN`', 'Legacy', 'controllers v1/v2/v3 sos', 'dealsms.in WhatsApp credentials'],
  ['`FEATURE_FLAGS`', 'No', 'featureFlag.js', 'Comma-separated enabled flags'],
  ['`SOCKET_PORT`', 'For socket server', 'socketServer.js', 'Socket.IO port'],
  ['`NODE_ENV`', 'Recommended', 'errorHandler.js, PM2', '`production` hides error details'],
], [2.6, 1.3, 2.1, 2.6]));
add(gap());
add(P('Firebase Admin additionally reads the service account from `backend/serviceAccountKey.json` (see Section 11).'));
add(H2('5.7 Running locally'));
add(...code([
  'cd backend',
  'npm install',
  'cp .env.example .env      # create it; see table above',
  'npm run dev               # nodemon + Sentry instrument, port 8001',
  'curl http://localhost:8001/health',
]));
add(callout('Known script issue', '`npm start` points to `./src/index.js`, which does not exist. Use `npm run dev` locally and PM2 (`ecosystem.config.cjs`) in production, or change the script to `./index.js`.', 'B54708', 'FFF6E6'));

/* 6 Data model */
add(H1('6. Data model'));
add(P('MongoDB stores most user-related data embedded in the `User` document (contacts, images, notifications, transactions). Other collections are small and flat.'));
add(H2('6.1 User'));
add(table(['Field', 'Type', 'Rules / notes'], [
  ['`name`', 'String', 'Required, min 2 chars'],
  ['`email`', 'String', 'Required, unique, lower-case'],
  ['`phoneNumber`', 'String', 'Unique (sparse), stored in E.164, e.g. `+919876543210`'],
  ['`password`', 'String', 'bcrypt hash'],
  ['`countryCode`', 'String', 'Required, e.g. `+91`'],
  ['`postalCode`', 'String', 'Used to target community alerts'],
  ['`fcmToken`', 'String | null', 'Firebase device token; cleared when FCM reports it invalid'],
  ['`profilePicture`', 'String', 'Public image URL'],
  ['`preferredLocations[]`', '{street, city, state, postalCode, country}', 'Optional saved addresses'],
  ['`emergencyContacts[]`', '{name, number, countryCode}', 'At least one required; numbers normalised to E.164'],
  ['`images[]`', '{url, uploadedAt}', 'Every SOS photo URL is appended'],
  ['`notifications[]`', '{title, message, senderId, sos[], latitude, longitude, mark_as_read, createdAt}', 'Only the latest 5 are kept'],
  ['`otp`', 'String', '6-digit email OTP; cleared on verification'],
  ['`status`', '`pending` | `active`', 'Active after OTP verification'],
  ['`referralCode`', 'String', 'Unique 6-char code, upper-case'],
  ['`referrer`, `referredUsers[]`', 'ObjectId refs', 'Referral graph'],
  ['`balance`', 'Number', 'Referral earnings, min 0'],
  ['`transactions[]`', '{title, amount, type: credit|debit, relatedUser, date}', 'Earnings ledger'],
  ['`createdAt`, `updatedAt`', 'Date', 'Mongoose timestamps'],
], [2.3, 2.7, 3.6]));
add(H2('6.2 Other collections'));
add(table(['Model', 'Fields', 'Purpose'], [
  ['`Sos`', '`userId`, `latitude`, `longitude`, `description`, `timestamp`', 'One active SOS per user (previous one is deleted on each new SOS)'],
  ['`DeletedUser`', 'Copy of user fields + `userId`, `reason`, `deletedAt`', 'Archive written before an account is deleted'],
  ['`Report`', '`userId`, `reportType` (fire|crime), `details`, `timestamp`', 'User-submitted incident reports'],
  ['`Advertisement`', '`title`, `imageUrl`, `redirectUrl`, `active`', 'Dashboard ads and banners (fallback ads returned if empty)'],
  ['`Install`', '`ip`, `installId`, `platform`, `userAgent`, `installedAt`', 'Install tracking from the login screen'],
  ['`Notification`', '`userId`, `title`, `message`, `senderId`, `sos`, `read`', 'Defined but not used; notifications live inside `User`'],
  ['`EmergencyContacts`', 'Legacy model', 'Not used by v3'],
], [1.7, 3.6, 3.3]));

/* 7 API reference */
add(H1('7. API reference (v3)'));
add(P('Base URL: `https://ezeelink.net/api/v3`. All bodies are JSON. \u201cAuth\u201d means a valid `Authorization: Bearer <JWT>` header is required.'));
add(H2('7.1 Auth \u2013 /auth'));
add(table(['Method & path', 'Auth', 'Request body', 'Result'], [
  ['POST `/register`', 'No', '`name, email, password (\u22656), phoneNumber, countryCode, postalCode?, preferredLocations?, emergencyContacts[{name, number, countryCode?}] (\u22651), referralCode?`', 'Creates `pending` user, applies referral bonus, emails OTP'],
  ['POST `/verify-otp`', 'No', '`email? | phoneNumber?, otp (6 digits)`', 'Activates user; returns `{ user, token }`'],
  ['POST `/resend-otp`', 'No', '`email`', 'Generates and emails a new OTP'],
  ['POST `/login`', 'No', '`phoneNumber (E.164), password`', '`{ user, token }`; if not active, re-sends OTP and returns 403'],
  ['POST `/forgot-password`', 'No', '`email? | phoneNumber?`', 'Sets a random 6-digit temporary password and emails it'],
  ['DELETE `/cancel-account`', 'No', '`email`', 'Deletes an unfinished registration'],
  ['GET `/get-fcm`', 'No*', '\u2013', 'Returns stored FCM token (*see defects: needs auth)'],
  ['POST `/reset-password`', 'Yes', '`password (\u22656)`', 'Changes password'],
  ['POST `/save-token`', 'Yes', '`fcmToken | null`', 'Stores device push token'],
  ['POST `/profile-picture`', 'Yes', '`imageUrl`', 'Sets profile picture URL'],
  ['PUT `/update-profile`', 'Yes', '`name, phoneNumber (E.164), email, postalCode?, preferredLocations?`', 'Updates profile'],
  ['PUT `/emergency-contacts`', 'Yes', '`name, number`', 'Adds an emergency contact'],
  ['DELETE `/emergency-contacts/:id`', 'Yes', '\u2013', 'Removes a contact'],
  ['DELETE `/delete-account`', 'Yes', '`reason`', 'Archives to `DeletedUser`, emails confirmation, deletes user and referral links'],
], [2.2, 0.7, 3.6, 2.6]));
add(H2('7.2 SOS and images \u2013 /images, /sos'));
add(table(['Method & path', 'Auth', 'Request body', 'Result'], [
  ['POST `/images/upload-image`', 'Yes', '`image (data:image/...;base64 | null), latitude, longitude, description`', 'Main SOS endpoint (see 8.4). Returns `{ message, imageUrl, sos }`. 429 if an SOS is already processing for this user.'],
  ['GET `/images/images`', 'Yes', '\u2013', 'User\u2019s uploaded SOS images'],
  ['POST `/images/profilepic`', 'Yes', '`image (base64)`', 'Uploads and sets profile picture'],
  ['POST `/sos`', 'Yes', '`latitude, longitude, description`', 'Legacy SOS: text WhatsApp via dealsms.in and push to **all** users'],
  ['GET `/sos/active`', 'Yes', '\u2013', '3 most recent SOS from other users, with sender profile'],
], [2.2, 0.7, 3.3, 2.9]));
add(H2('7.3 Notifications \u2013 /notification'));
add(table(['Method & path', 'Auth', 'Request body', 'Result'], [
  ['POST `/send-notification`', 'Yes', '`title, message?, latitude, longitude, description, env ("prod" | "test")`', 'Pushes to users in the same postal code; `{ success, successCount }`'],
  ['GET `/get-notifications`', 'Yes', '\u2013', 'Latest 5 notifications with sender and SOS populated'],
  ['DELETE `/delete-notification/:notificationId`', 'Yes', '\u2013', 'Removes one'],
  ['DELETE `/delete-all-notifications`', 'Yes', '\u2013', 'Clears all'],
  ['PATCH `/mark-as-read/:notificationId`', 'Yes', '\u2013', 'Sets `mark_as_read = 1`'],
], [2.6, 0.7, 3.2, 2.6]));
add(H2('7.4 Referral, reports, content and admin'));
add(table(['Method & path', 'Auth', 'Request body', 'Result'], [
  ['POST `/referral/generate`', 'Yes', '\u2013', 'Issues a new referral code'],
  ['POST `/referral/invite`', 'Yes', '\u2013', 'Returns the user\u2019s code for sharing'],
  ['POST `/referral/apply`', 'Yes', '`referralCode`', 'Inviter +10, user +5 (once per user, no self-referral)'],
  ['GET `/referral/earnings`', 'Yes', '\u2013', '`{ balance, transactions }`'],
  ['GET `/referral/invited`', 'Yes', '\u2013', 'Invited users (name, email, phone)'],
  ['POST `/report/crime-report`', 'Yes', '`details`', 'Creates crime report (*currently broken, see 11.2)'],
  ['POST `/report/fire-report`', 'Yes', '`details`', 'Creates fire report'],
  ['GET `/ads`', 'No', '`?limit`', 'Active advertisements (fallbacks if none)'],
  ['GET `/banner/banners`', 'No', '`?limit`', 'Banners (*currently broken, see 11.2)'],
  ['GET `/web/users`', 'No', '\u2013', 'All users without password/OTP (**unauthenticated**)'],
  ['GET `/web/users/:id`', 'No', '\u2013', 'User name by ID'],
  ['POST `/web/install`', 'No', '`installId?, platform?`', 'Upserts install record'],
  ['GET `/web/installs`', 'No', '\u2013', 'All install records'],
  ['GET `/health` (root)', 'No', '\u2013', '`{ status: "ok", timestamp }`'],
], [2.4, 0.7, 2.0, 3.9]));

/* 8 Flows */
add(H1('8. Key flows'));
add(H2('8.1 Registration and email verification'));
add(N('User fills the multi-step Register screen: name, email, phone with country, password, postal code / location, at least one emergency contact, optional referral code.', 'reg'));
add(N('App calls `POST /auth/register`. The backend normalises the phone and every contact number to E.164, rejects duplicates, hashes the password, generates a referral code and creates the user with status `pending`.', 'reg'));
add(N('If a valid referral code was supplied, the inviter receives 10 and the new user 5 balance units, recorded as transactions.', 'reg'));
add(N('A 6-digit OTP is saved on the user and emailed. The app shows the OTP screen; the user may resend or cancel (`DELETE /auth/cancel-account`).', 'reg'));
add(N('`POST /auth/verify-otp` activates the account and returns a JWT. The app stores token and user in AsyncStorage, saves the token in native SharedPreferences (for the shake service), and registers the FCM token with `POST /auth/save-token`.', 'reg'));
add(H2('8.2 Login'));
add(P('`POST /auth/login` with phone number and password. If the account is still `pending`, the server emails a fresh OTP and returns 403 so the app can switch to OTP entry. On success the app stores the token, records the install (`POST /web/install`) and navigates to the Home tabs.'));
add(H2('8.3 Forgot and reset password'));
add(P('`POST /auth/forgot-password` replaces the password with a random 6-digit temporary password and emails it. The user then logs in and sets a new password from the profile (`POST /auth/reset-password`).'));
add(H2('8.4 SOS from the app (button, emergency screens)'));
add(img(path.join(DIR, 'seq.png'), 620, 393, 'Figure 3 \u2013 SOS sequence (in-app trigger)'));
add(N('The app checks that at least one emergency contact exists, requests camera permission, gets a high-accuracy GPS fix (60 s timeout) and opens the camera.', 'sos'));
add(N('A global \u201cSending SOS\u2026\u201d overlay appears (`SOS_SENDING` event). The photo is sent as base64 to `POST /images/upload-image` with coordinates and description.', 'sos'));
add(N('The backend takes a per-user 30 s lock, writes the image to `/var/www/images/jym-<userId>-<timestamp>.<ext>`, appends its public URL to `user.images`, replaces the user\u2019s `Sos` document and reverse-geocodes the address.', 'sos'));
add(N('A WhatsApp template (`sos_alert_final`) with name, phone, address, latitude, longitude, message and the image is sent to each unique emergency contact through BhashSMS (second 30 s lock prevents duplicates).', 'sos'));
add(N('The app then calls `POST /notification/send-notification`. The backend resolves the postal code of the SOS location, finds other users with that postal code and an FCM token, sends high-priority pushes in batches of 500, removes invalid tokens and appends the notification to each recipient (keeping 5).', 'sos'));
add(N('The app shows \u201cSOS sent successfully\u201d (`SOS_SENT`) or an error (`SOS_FAILED`).', 'sos'));
add(H2('8.5 Shake / chop SOS (Android native)'));
add(B('`DashboardScreen` calls `ShakeModule.startService()` which starts `ShakeDetectionService` as a foreground service with a persistent notification. `BootReceiver` restarts it after reboot.'));
add(B('Accelerometer data is low-pass filtered; a \u201cchop\u201d is a direction flip above 15.5 m/s\u00b2. Five chops within 1.3 s trigger an SOS, followed by a 2 s cooldown.'));
add(B('`SosDispatcher` reads the token from SharedPreferences, gets the last known location, and calls `upload-image` (with `image: null`, so a default image URL is used) and then `send-notification` directly over HTTPS with OkHttp. No photo is taken.'));
add(H2('8.6 Voice SOS'));
add(P('While the Dashboard is focused, `startVoiceSosListener()` runs continuous speech recognition with automatic restarts. Recognised text is normalised and matched against phrases (`help help help`, `help me`, `help fire`, `help theft`, `help rape`, `help medical`, \u2026). A match sends the SOS through the same two API calls, with an 8 s cooldown between triggers. iOS permission strings mention \u201chelp\u201d and \u201cbachao\u201d.'));
add(H2('8.7 Receiving an alert'));
add(P('`MyFirebaseMessagingService` (Android) and `utils/firebase.ts` handle incoming pushes on channel `sos_channel`. Tapping a notification navigates to the Map screen, which loads `GET /sos/active` and shows the latest SOS pins, sender photos and a route from the viewer to the SOS location. The Notifications screen lists stored alerts and supports delete and delete-all.'));
add(H2('8.8 Account deletion'));
add(P('`DELETE /auth/delete-account` with a reason: a confirmation email is sent, the full user document is copied to `DeletedUser`, the user is deleted and removed from any referrer\u2019s `referredUsers`.'));

/* 9 Mobile app */
add(H1('9. Mobile app'));
add(H2('9.1 Application shell'));
add(P('`index.js` initialises the Facebook SDK and registers `App`. `App.tsx` wraps the app in `GestureHandlerRootView`, `SafeAreaProvider`, `LocationProvider` and `AuthProvider`, sets up FCM (permission on Android 13+, token stored locally and refreshed), requests iOS tracking permission and renders global SOS loading and result modals driven by `DeviceEventEmitter` events.'));
add(H2('9.2 Navigation map'));
add(table(['Navigator', 'Routes'], [
  ['Auth stack (logged out)', '`Login`, `Register`, `ForgotPassword`'],
  ['Home tabs', '`Dashboard`, `SOS` (centre button opening the SOS bubble menu), `Map`'],
  ['App stack', '`Profile`, `EmergencyContacts`, `ResetPassword`, `ProfileResetPassword`, `rapescreen`, `CrimeScreen`, `Medical`, `FireScreen`, `EmergencyScreen`, `Other`, `first-aid-guide`, `safety-tips`, `fire-safety-tips`, `medical-safety-tips`, `crime-prevention-tips`, `ReferralScreen`, `Privacy`, `DeleteAccount`, `PersonalInfo`, `Location`, `Map`'],
], [2.2, 6.4]));
add(H2('9.3 Screens'));
add(table(['Screen', 'Purpose', 'API calls'], [
  ['LoginScreen', 'Phone + password login, OTP verification for pending accounts, install tracking', '`/auth/login`, `/auth/verify-otp`, `/auth/resend-otp`, `/web/install`'],
  ['RegisterScreen', 'Multi-step sign-up incl. contacts import, location and referral code', '`/auth/register`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/cancel-account`'],
  ['ForgotPasswordScreen', 'Request temporary password', '`/auth/forgot-password`'],
  ['DashboardScreen', 'Home: ads carousel, emergency category cards, safety guides, referral entry, notifications, starts voice and shake listeners', '`/ads`, Nominatim'],
  ['TabNavigator (SOS menu)', 'Animated SOS bubbles: Fire, Theft, Rape, Medical, Other', 'via `sendsos.ts`'],
  ['Rape / Theft / Medical / Fire / Other screens', 'Category SOS action, helplines and tips', 'via `sendsos.ts`'],
  ['MapScreen', 'Live SOS pins, profile images, clustering, GraphHopper route', '`/sos/active`, GraphHopper'],
  ['Notification', 'List, delete, delete-all alerts', '`/notification/*`'],
  ['EmergencyContacts', 'Add, import, delete contacts', '`/auth/emergency-contacts`'],
  ['ProfileScreen, PersonalInfoScreen, LocationScreen', 'Profile data, picture, preferred locations', '`/auth/update-profile`, `/images/profilepic`'],
  ['ResetPassword', 'Change password', '`/auth/reset-password`'],
  ['ReferralScreen', 'Code, invite share, apply code, earnings, invited users, rewarded ads', '`/referral/*`'],
  ['PrivacyScreen', 'Privacy policy and EULA links (ezeelink.net)', '\u2013'],
  ['DeleteAccountScreen', 'Delete with reason', '`/auth/delete-account`'],
  ['FirstAidGuide, SafetyTips, FireSafetyTips, MedicalSafetyTips, CrimePreventionTips', 'Static guidance content', '\u2013'],
  ['OfflinePage', 'Shown without connectivity', '\u2013'],
  ['DoctorCallScreen, SecurityScreen, Camera', 'Prototype screens with placeholder data', '\u2013'],
], [2.4, 3.8, 2.4]));
add(H2('9.4 State management'));
add(B('**AuthContext**: `user`, `emergencyContacts`, `isLoggedIn`, `isLoading`; hydrated from AsyncStorage keys `isLoggedIn` and `user` on start.'));
add(B('**LocationContext**: current map region (default San Francisco coordinates until a fix is obtained).'));
add(B('**SosContext**: list of SOS locations (provider defined, lightly used).'));
add(B('**AsyncStorage keys**: `token`, `user`, `isLoggedIn`, `fcmToken`, `tempUserEmail`.'));
add(B('The axios instance in `utils/api.ts` attaches the token from AsyncStorage to every request.'));
add(H2('9.5 Native Android modules'));
add(table(['Class', 'Responsibility'], [
  ['`ShakeModule` / `ShakePackage`', 'React Native bridge: `startService()`, `stopService()`, `saveToken(token)`; forwards shake broadcasts to JS'],
  ['`ShakeDetectionService`', 'Foreground service with accelerometer chop detection'],
  ['`SosDispatcher`', 'Sends SOS over HTTPS from native code (hard-coded production URLs)'],
  ['`LocationHelper`', 'Fused location helper'],
  ['`BootReceiver`', 'Restarts the shake service after device boot'],
  ['`MyFirebaseMessagingService`', 'Receives FCM messages and token refreshes'],
  ['`MainActivity`, `MainApplication`', 'App entry, intent handling, package registration'],
], [2.8, 5.8]));
add(H2('9.6 Permissions'));
add(table(['Permission', 'Platform', 'Why'], [
  ['Fine / coarse location, foreground service (location)', 'Android, iOS (when in use / always)', 'SOS coordinates, map'],
  ['Camera', 'Android, iOS', 'SOS photo, profile picture'],
  ['Record audio, speech recognition', 'Android, iOS', 'Voice SOS'],
  ['Read / write contacts', 'Android, iOS', 'Import emergency contacts'],
  ['Post notifications', 'Android 13+', 'SOS alerts'],
  ['Foreground service (sensor), wake lock, boot completed', 'Android', 'Background shake detection'],
  ['Bluetooth connect', 'Android', 'Earbud integration (currently disabled)'],
  ['Photo library', 'iOS', 'Profile picture'],
  ['App tracking transparency', 'iOS', 'Ads personalisation'],
], [3.4, 2.3, 2.9]));
add(H2('9.7 Building and running'));
add(...code([
  'cd frontend',
  'npm install',
  'npm start                      # Metro bundler',
  'npm run android                # debug build on device/emulator',
  'cd ios && pod install && cd .. && npm run ios',
  '',
  '# Android release (requires keystore, not in git)',
  'cd android && ./gradlew assembleRelease   # or bundleRelease for Play Store',
]));
add(P('Release signing reads `MYAPP_UPLOAD_STORE_FILE`, `MYAPP_UPLOAD_KEY_ALIAS`, `MYAPP_UPLOAD_STORE_PASSWORD` and `MYAPP_UPLOAD_KEY_PASSWORD` from `android/gradle.properties`; the file `jymberee-release-key.keystore` must be placed in `android/app/` by hand. Firebase config files `google-services.json` and `GoogleService-Info.plist` are committed.'));

/* 10 Operations */
add(H1('10. Deployment and operations'));
add(H2('10.1 Production layout'));
add(table(['Item', 'Value'], [
  ['Public API', '`https://ezeelink.net/api/v3` (reverse proxy to the Node process)'],
  ['Process manager', 'PM2 app `jymberee-production-8001`, fork mode, 1 instance, port 8001, restart at 400 MB, Sentry preloaded'],
  ['Image directory', '`/var/www/images` on the API host, served publicly as `https://tapis-one.com/images/<file>`'],
  ['Database', 'MongoDB (local instance, database `jimburry`); backup copy on MongoDB Atlas'],
  ['Health', '`GET /health` (terminus checks DB connectivity)'],
], [2.0, 6.6]));
add(H2('10.2 Deploying the backend'));
add(...code([
  'git pull',
  'cd backend && npm ci',
  'pm2 start ecosystem.config.cjs     # first time',
  'pm2 reload jymberee-production-8001 # subsequent deploys',
  'pm2 logs jymberee-production-8001',
]));
add(H2('10.3 Backups'));
add(P('`backup-sync.cjs` is a Windows-oriented script that runs `mongodump` of the local database to `C:\\backup` and `mongorestore --drop` into MongoDB Atlas. It is run manually; there is no scheduled job in the repository. Because it drops the target before restoring, a failed dump followed by a restore could wipe the Atlas copy; schedule it with care and keep dated snapshots.'));
add(H2('10.4 Monitoring'));
add(B('Sentry (backend) via `instrument.mjs`; Firebase Crashlytics (app).'));
add(B('`morgan` access logs and `utils/logger.js` error logs on the server.'));
add(B('Recommended: uptime probe on `/health`, alert on PM2 restarts, and dashboards for WhatsApp and FCM failure counts.'));

/* 11 Issues */
add(H1('11. Known issues and recommendations'));
add(P('The following were found while reviewing the code. Severity reflects impact if exploited or triggered in production.'));
add(H2('11.1 Security'));
add(table(['#', 'Severity', 'Issue', 'Recommendation'], [
  ['S1', 'Critical', '`GET /web/users` and `/web/installs` have no authentication and return every user\u2019s email, phone, emergency contacts, locations, images and notifications.', 'Remove from public routing or protect with an admin role; never return contacts or locations in bulk.'],
  ['S2', 'Critical', 'Secrets committed to git: Firebase service account (`serviceAccountKey.json`), MongoDB Atlas password (`backup-sync.cjs`), BhashSMS credentials (`imageController.js`), GraphHopper key (`MapScreen.tsx`), keystore password in `gradle.properties`.', 'Rotate every credential, move them to environment variables / secret store, purge from git history.'],
  ['S3', 'High', 'Email OTP never expires (`otpExpires` is set in code but is not in the schema, so it is never saved or checked). `verify-otp` and `forgot-password` have no rate limit (register, login and resend-otp do), so a 6-digit OTP can be brute-forced.', 'Add `otpExpires` to the schema and check it; apply `authLimiter` to verify-otp and forgot-password; lock after N failed attempts.'],
  ['S4', 'High', 'Forgot-password resets the real password immediately and anyone who knows an email or phone can trigger it, locking the owner out.', 'Use a time-limited reset token/OTP and only change the password after it is confirmed.'],
  ['S5', 'Medium', '`DELETE /auth/cancel-account` deletes by email without authentication.', 'Allow only for `pending` accounts and require the OTP or a signed registration token.'],
  ['S6', 'Medium', 'CORS defaults to all origins with credentials; Socket.IO allows `*`.', 'Set `ALLOWED_ORIGINS` explicitly in production.'],
  ['S7', 'Medium', 'iOS `NSAppTransportSecurity` allows insecure HTTP for an exception domain; test API uses plain HTTP.', 'Use HTTPS for test servers and remove the ATS exception.'],
  ['S8', 'Low', 'JWT lifetime 7 days with no refresh or revocation.', 'Shorter access tokens plus refresh tokens; invalidate on password change.'],
], [0.5, 1.0, 3.8, 3.3]));
add(H2('11.2 Functional defects'));
add(table(['#', 'Area', 'Defect', 'Effect'], [
  ['D1', 'Reports', '`createCrimeReport` (v2 controller, used by v3) reads `details` without destructuring it from `req.body`.', 'Every crime report returns HTTP 500.'],
  ['D2', 'Banners', '`GetBanners` calls `getActiveAdvertisements(limit)` but the service expects `(req, limit)` and reads `req.baseUrl`.', '`GET /banner/banners` throws and returns an error.'],
  ['D3', 'Auth', '`GET /auth/get-fcm` is mounted before `authenticate` but reads `req.user._id`.', 'Always fails; also should require auth.'],
  ['D4', 'Contacts', 'App calls `PATCH /auth/emergency-contacts/toggle`, which does not exist on the server.', 'Toggle action in Emergency Contacts fails.'],
  ['D5', 'Notifications', 'Community alerts depend on an exact `postalCode` string match from Nominatim; users who did not enter a postal code, or whose code is formatted differently, never receive alerts. If Nominatim is slow or down, no one is notified.', 'Missed alerts. Prefer geospatial queries (store last known location with a 2dsphere index and query by radius).'],
  ['D6', 'SOS', 'SOS sending blocks on the camera; if the user cancels the camera, no SOS is sent at all.', 'Send location-only SOS immediately; attach the photo as a follow-up.'],
  ['D7', 'SOS', 'WhatsApp sends to contacts run sequentially inside the request, each with a 20 s timeout.', 'Slow responses for users with many contacts; move to a background queue.'],
  ['D8', 'SOS', 'In-memory locks (`sendingSOS`, `whatsappLock`) only work with a single process.', 'Use Redis or DB-based locks before scaling beyond one PM2 instance.'],
  ['D9', 'Backend', '`npm start` points to a missing file; `form-data` is imported but not a direct dependency; `app.js` creates upload folders one directory above the backend.', 'Startup and packaging fragility.'],
  ['D10', 'App', 'API base URL and `env: "prod"/"test"` are switched by editing code; native code duplicates the production URL.', 'Use build-time config (e.g. react-native-config) for both JS and native.'],
  ['D11', 'App', 'Earbud SOS code is present but disabled; shake SOS is Android-only.', 'Marketing and store listing must match.'],
  ['D12', 'App', 'Leftover files: `LoginScreen copy.tsx`, `ios/true`, prototype screens with example.com data.', 'Remove to reduce confusion.'],
], [0.5, 1.2, 4.0, 2.9]));
add(H2('11.3 Recommended roadmap'));
add(N('**Immediately**: rotate and remove leaked secrets; lock down `/web/*`; fix D1\u2013D4.', 'road'));
add(N('**Short term**: OTP expiry and rate limits on v3; safe password reset; location-only SOS without camera; environment-based config.', 'road'));
add(N('**Medium term**: geospatial alert targeting, background job queue for WhatsApp/FCM, retire v1/v2 routes, automated tests and CI.', 'road'));
add(N('**Product**: decide on earbud and iOS background triggers; align marketing claims.', 'road'));

/* 12 Appendix */
add(H1('Appendix A. Glossary'));
add(table(['Term', 'Meaning'], [
  ['SOS', 'An emergency alert raised by a user'],
  ['Emergency contact', 'A person (phone number) who receives the WhatsApp alert'],
  ['Community alert', 'Push notification sent to other Jymberee users in the same postal area'],
  ['FCM', 'Firebase Cloud Messaging, Google\u2019s push notification service'],
  ['OTP', 'One-time password, 6 digits, sent by email to verify an account'],
  ['E.164', 'International phone format, e.g. `+919876543210`'],
  ['Chop gesture', 'Rapid back-and-forth phone movement detected by the Android shake service'],
  ['PM2', 'Node.js process manager used in production'],
], [2.2, 6.4]));
add(H2('Appendix B. Sample backend .env'));
add(...code([
  'PORT=8001',
  'NODE_ENV=production',
  'LOCAL_URI=mongodb://localhost:27017',
  'DB_NAME=jimburry',
  'MONGO_URI=mongodb://localhost:27017/jimburry',
  'ACCESS_TOKEN_SECRET=<long-random-string>',
  'ACCESS_TOKEN_EXPIRY=7d',
  'ALLOWED_ORIGINS=https://ezeelink.net',
  'EMAIL_USER=<gmail-address>',
  'EMAIL_PASS=<gmail-app-password>',
  'INSTANCE_ID=<dealsms-instance>',
  'WHATSAPP_ACCESS_TOKEN=<dealsms-token>',
  'FEATURE_FLAGS=',
  'SOCKET_PORT=8002',
]));
add(H2('Appendix C. Sample SOS request'));
add(...code([
  'POST /api/v3/images/upload-image',
  'Authorization: Bearer <jwt>',
  'Content-Type: application/json',
  '',
  '{',
  '  "image": "data:image/jpeg;base64,/9j/4AAQ...",',
  '  "latitude": 19.0760,',
  '  "longitude": 72.8777,',
  '  "description": "Medical Emergency Reported"',
  '}',
  '',
  '200 OK',
  '{ "message": "SOS created successfully", "imageUrl": "https://tapis-one.com/images/jym-...jpeg", "sos": { ... } }',
]));

/* ---------- cover + TOC ---------- */
const logoBuf = fs.readFileSync(LOGO);
const cover = [
  new Paragraph({ spacing: { before: 1400 }, alignment: AlignmentType.CENTER,
    children: [new ImageRun({ type: 'png', data: logoBuf, transformation: { width: 190, height: 220 }, altText: { title: 'Jymberee logo', description: 'Jymberee logo', name: 'logo' } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 500, after: 120 },
    children: [new TextRun({ text: 'Technical Documentation', bold: true, size: 56, color: C.ink })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
    children: [new TextRun({ text: 'Personal Safety & Emergency SOS Platform \u2013 Mobile App and Backend API', size: 26, color: C.ink2 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.red, space: 12 } }, spacing: { before: 200 },
    children: [new TextRun({ text: 'Version 1.0  \u00b7  October 2026', size: 22, color: C.muted })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Repository: unlikelycreator/Jymberee', size: 22, color: C.muted })] }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ children: [new TextRun({ text: 'Contents', bold: true, size: 36, color: C.ink })], spacing: { after: 200 } }),
  ...TOC.map(({ t, lvl, id }) => new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: W, leader: 'dot' }],
    indent: { left: lvl === 1 ? 0 : 360 },
    spacing: { before: lvl === 1 ? 140 : 20, after: 20 },
    children: [
      new InternalHyperlink({ anchor: id, children: [new TextRun({ text: t, bold: lvl === 1, size: lvl === 1 ? 22 : 20, color: lvl === 1 ? C.ink : C.ink2 })] }),
      new TextRun({ text: '\t', size: 20, color: C.muted }),
      new PageReference(id),
    ],
  })),
];

const doc = new Document({
  creator: 'Jymberee', title: 'Jymberee Technical Documentation', description: 'Technical documentation for the Jymberee app and API',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: 'Calibri', size: 21, color: '1F2430' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, color: C.ink, font: 'Calibri' },
        paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.red, space: 6 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 27, bold: true, color: C.red, font: 'Calibri' },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 23, bold: true, color: C.ink, font: 'Calibri' },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '\u2013', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } },
      ] },
      ...['steps', 'boot', 'reg', 'sos', 'road'].map((r) => ({ reference: r, levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } },
      ] })),
    ],
  },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: cover },
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1250, bottom: 1134, left: 1134, right: 1134 }, pageNumbers: { start: 1 } } },
      headers: { default: new Header({ children: [new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: W }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } },
        children: [
          new ImageRun({ type: 'png', data: fs.readFileSync(MARK), transformation: { width: 16, height: 15 }, altText: { title: 'logo', description: 'logo', name: 'mark' } }),
          new TextRun({ text: '  Jymberee', bold: true, size: 18, color: C.ink }),
          new TextRun({ text: '\tTechnical Documentation v1.0', size: 18, color: C.muted }),
        ] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ children: ['Page ', PageNumber.CURRENT], size: 18, color: C.muted })] })] }) },
      children: body },
  ],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log('written', OUT, b.length); });
