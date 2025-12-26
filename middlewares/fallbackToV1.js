// src/middlewares/fallbackToV1.js
import { router_v1 } from '../routes/v1/index.js';

export const fallbackToV1 = (req, res, next) => {
  // Skip fallback for new v2-only routes
  if (req.path.startsWith('/banner')) {
    return next();
  }

  const originalSend = res.send;
  let v2Sent = false;

  // Override res.send to detect v2 response
  res.send = function (data) {
    v2Sent = true;
    return originalSend.call(this, data);
  };

  // Capture next() error
  const handleError = (err) => {
    res.send = originalSend; // restore

    if (v2Sent) return; // v2 already responded

    // === FALLBACK TO v1 ===
    const v1Path = req.originalUrl.replace(/^\/api\/v2/, '/api/v1');
    console.log(`[FALLBACK] ${req.method} ${req.originalUrl} → ${v1Path}`);

    const v1Req = {
      ...req,
      originalUrl: v1Path,
      url: v1Path.replace(/^\/api\/v1/, ''),
      path: v1Path.replace(/^\/api\/v1/, ''),
    };

    const v1Res = {
      ...res,
      send: originalSend,
      setHeader: res.setHeader.bind(res),
    };

    router_v1(v1Req, v1Res, (fallbackErr) => {
      if (fallbackErr) {
        console.error('[FALLBACK FAILED]', fallbackErr.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Service unavailable' });
        }
      }
    });
  };

  // Try v2 first
  try {
    next(); // Let v2 run
  } catch (err) {
    handleError(err);
  }

  // Also catch if next() calls error handler
  const originalNext = req.next;
  req.next = (err) => {
    if (err) handleError(err);
    else if (originalNext) originalNext();
  };
};