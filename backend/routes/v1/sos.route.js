import express from 'express';
import sosController from '../../controllers/v1/sos.controller.js';
import authenticate from '../../middlewares/auth.middleware.js';
const router = express.Router();

router.route('/').post(authenticate, sosController.createSos);
router.route('/active').get(authenticate, sosController.getSos);

export default router;