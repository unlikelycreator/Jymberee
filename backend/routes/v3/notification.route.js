import express from 'express';
const router = express.Router();
import authenticate from '../../middlewares/auth.middleware.js';
import { Notification, getNotifications, deleteNotification, deleteAllNotifications, markAsRead } from '../../controllers/v3/notification.controller.js';

router.route('/send-notification').post(authenticate, Notification);
router.route('/get-notifications').get(authenticate, getNotifications);
router.route('/delete-notification/:notificationId').delete(authenticate, deleteNotification);
router.route('/delete-all-notifications').delete(authenticate, deleteAllNotifications);
router.route('/mark-as-read/:notificationId').patch(authenticate, markAsRead);

export default router;