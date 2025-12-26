// src/controllers/v1/advertisement.controller.js
import asyncHandler from '../../middlewares/asyncHandler.js';
import validate from '../../middlewares/validate.js';
import { getAdsSchema } from '../../schemas/advertisment.schema.js';
import { getActiveAdvertisements } from '../../services/advertisement.service.js';

export const getAdvertisements = [
  validate(getAdsSchema),
  asyncHandler(async (req, res) => {
    const ads = await getActiveAdvertisements(req, req.query.limit);
    res.json({
      success: true,
      count: ads.length,
      advertisements: ads,
      version: 'v1',
    });
  }),
];