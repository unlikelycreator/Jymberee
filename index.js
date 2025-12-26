// index.js
import 'dotenv/config';
import app from './app.js';
import ConnectDB from './config/db.js';
import { createTerminus } from '@godaddy/terminus';
import http from 'http';

const PORT = process.env.PORT || 8001;
let server;

async function onHealthCheck() {
  await ConnectDB(); // Ensures DB is live
  return Promise.resolve();
}

async function onSignal() {
  console.log('Shutting down...');
  await Promise.all([server?.close()]);
}

async function start() {
  try {
    await ConnectDB(); // Connect once at startup
    server = http.createServer(app);
    createTerminus(server, { healthChecks: { '/health': onHealthCheck }, onSignal });
    server.listen(PORT, () => console.log(`Server on :${PORT}`));
  } catch (err) {
    console.error('Start failed:', err);
    process.exit(1);
  }
}

start();