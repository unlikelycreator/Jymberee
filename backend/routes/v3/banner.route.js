// src/routes/v2/banner.route.js
import express from 'express';
import { GetBanners } from '../../controllers/v3/banner.controller.js';

const router = express.Router();

router.get('/banners', GetBanners);

export default router;