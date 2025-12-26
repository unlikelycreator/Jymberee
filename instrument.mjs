// instrument.mjs
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://45c1bd0925d21bb7fabd99d2f55b07af@o4510310651461632.ingest.us.sentry.io/4510310653362176",
  sendDefaultPii: true,
});
