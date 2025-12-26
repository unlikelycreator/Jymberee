// src/routes/v2/index.js
import { Router } from 'express';
import authRoutes from './auth.route.js';
import referralRoutes from './referral.route.js';
import sosRoutes from './sos.route.js';
import notificationRoutes from './notification.route.js';
import reportRoutes from './report.route.js';
import imageRoutes from './image.route.js';
import advertisementRoutes from './advertisement.route.js'; // v2 version
import bannerRoutes from './banner.route.js'; // NEW
import adminRoutes from './web.route.js';
import { fallbackToV1 } from '../../middlewares/fallbackToV1.js';

const router = Router();

// === FALLBACK IF v2 FAILS (except /banner) ===
router.use(fallbackToV1);

// === v2 ROUTES (same as v1) ===
router.use('/auth', authRoutes);
router.use('/referral', referralRoutes);
router.use('/sos', sosRoutes);
router.use('/notification', notificationRoutes);
router.use('/report', reportRoutes);
router.use('/images', imageRoutes);
router.use('/ads', advertisementRoutes); // v2 version of ads
router.use('/web', adminRoutes);

// === NEW v2 FEATURE ===
router.use('/banner', bannerRoutes);

// === v2 Root ===
router.get('/', (req, res) => {
  res.json({
    version: 'v2',
    status: 'active',
    features: ['banner', 'improved ads', 'fallback to v1 on error'],
  });
});

export { router as router_v2 };