// src/routes/v1/index.js
import { Router } from 'express';
import authRoutes from './auth.route.js';
import referralRoutes from './referral.route.js'; // ← ADD THIS
import sosRoutes from './sos.route.js';
import notificationRoutes from './notification.route.js';
import reportRoutes from './report.route.js';
import imageRoutes from './image.route.js';
import advertisementRoutes from './advertisement.route.js';
import adminRoutes from './web.route.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/referral', referralRoutes); // ← MOUNT HERE
router.use('/sos', sosRoutes);
router.use('/notification', notificationRoutes);
router.use('/report', reportRoutes);
router.use('/images', imageRoutes);
router.use('/ads', advertisementRoutes);
router.use('/web', adminRoutes);

router.get('/', (req, res) => {
  res.json({ version: 'v1', status: 'active' });
});

export { router as router_v1 };