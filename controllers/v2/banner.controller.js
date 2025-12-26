// src/controllers/v2/banner.controller.js
import asyncHandler from '../../middlewares/asyncHandler.js';
import validate from '../../middlewares/validate.js';
import { getAdsSchema } from '../../schemas/advertisment.schema.js';
import { getActiveAdvertisements } from '../../services/advertisement.service.js';

export const GetBanners = [
  validate(getAdsSchema),
  asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const banners = await getActiveAdvertisements(limit);
    res.json({
      success: true,
      count: banners.length,
      banners,
    });
  }),
];