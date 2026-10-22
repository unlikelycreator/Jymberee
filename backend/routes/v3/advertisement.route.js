// routes/advertisement.route.js
import express from 'express';
import { GetAdvertisements } from '../../controllers/v3/advertisement.controller.js';

const router = express.Router();

router.route('/').get(GetAdvertisements);

export default router;