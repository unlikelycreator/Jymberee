// routes/sync.js
import express from 'express';
import { syncLocalToAtlas, syncAtlasToLocal } from '../config/db.js';

const router = express.Router();

router.post('/local-to-atlas', async (req, res) => {
  await syncLocalToAtlas();
  res.json({ status: 'Local → Atlas synced' });
});

router.post('/atlas-to-local', async (req, res) => {
  await syncAtlasToLocal();
  res.json({ status: 'Atlas → Local synced' });
});

export default router;