// routes/advertisement.route.js
import express from 'express';
import { getAdvertisements } from '../../controllers/v1/advertisement.controller.js';

const router = express.Router();

router.route('/').get(getAdvertisements);

export default router;