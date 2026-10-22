import express from 'express'
const router = express.Router()
import { createCrimeReport, createFireReport } from '../../controllers/v1/report.controller.js'
import authenticate from '../../middlewares/auth.middleware.js'


router.route('/crime-report').post(authenticate, createCrimeReport)
// router.route('/crime-report').get(getCrimeReports)
router.route('/fire-report').post(authenticate, createFireReport)

export default router