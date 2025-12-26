// src/utils/logger.js
import fs from 'fs';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');
const errorLogFile = path.join(logDir, 'error.log');
const combinedLogFile = path.join(logDir, 'combined.log');

// === CREATE LOGS FOLDER ===
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    console.log('[LOGGER] Created logs directory:', logDir);
  } catch (err) {
    console.error('[LOGGER] Failed to create logs directory:', err.message);
  }
}

// === LOG FUNCTIONS ===
export const logError = (label, data) => {
  const entry = `[${new Date().toISOString()}] [${label}] ${JSON.stringify(data, null, 2)}\n`;
  console.error(entry);
  try {
    fs.appendFileSync(errorLogFile, entry);
  } catch (err) {
    console.error('[LOGGER] Failed to write error log:', err.message);
  }
};

export const logInfo = (label, data) => {
  const entry = `[${new Date().toISOString()}] [INFO] [${label}] ${JSON.stringify(data)}\n`;
  console.log(entry);
  try {
    fs.appendFileSync(combinedLogFile, entry);
  } catch (err) {
    console.error('[LOGGER] Failed to write info log:', err.message);
  }
};