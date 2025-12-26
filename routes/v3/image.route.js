import express from 'express';
import { UploadImageBase64, GetUserImages, UploadProfilePicture } from '../../controllers/v3/imageController.js';
import authenticate from '../../middlewares/auth.middleware.js';

const router = express.Router();
router.post('/upload-image', authenticate, UploadImageBase64);
router.get('/images', authenticate, GetUserImages);
router.post('/profilepic', authenticate, UploadProfilePicture)

export default router;