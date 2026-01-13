// src/app.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// import syncRouter from './routes/sync.js';
// ---------- Custom Middleware ----------
import { globalErrorHandler } from './middlewares/errorHandler.js';
import { authLimiter } from './middlewares/rateLimiter.js';

// ---------- Versioned Routers ----------
import { router_v1 } from './routes/v1/index.js';
import { router_v2 } from './routes/v2/index.js'; 
import { router_v3 } from './routes/v3/index.js';   

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Security & Logging ----------
app.use(
  helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
  })
);
app.use(morgan('combined'));

// ---------- CORS ----------
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || true,
    credentials: true,
  })
);

// ---------- Body Parsing ----------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// ---------- Static Files ----------
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ---------- Ensure Upload Directories ----------
const uploadDirs = ['uploads/user_images', 'uploads/reports'];
uploadDirs.forEach(dir => fs.mkdirSync(path.join(__dirname, '..', dir), { recursive: true }));

// ---------- Rate Limiting on Sensitive Endpoints ----------
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/resend-otp', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
// app.use('/api/sync', syncRouter);
// ---------- API Routes ----------
app.use('/api/v1', router_v1);
app.use('/api/v2', router_v2);
app.use('/api/v3', router_v3); // ← will 404 until implemented

// ---------- Health Check (for PM2 / K8s) ----------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------- Catch-all 404 ----------
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ---------- Global Error Handler ----------
app.use(globalErrorHandler);


export default app;

