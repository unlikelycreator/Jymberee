// src/services/advertisement.service.js
import { Advertisement } from '../models/advertisement.model.js';

// === v1 FALLBACK (Emergency Ads) ===
const getDefaultV1Ads = () => [
  {
    _id: 'fallback-v1-1',
    title: 'Emergency Helpline',
    imageUrl: 'https://www.verbolabs.com/wp-content/uploads/2024/12/English-Advertising-Introduction-Lesson-Presentation-in-Blue-Yellow-Red-Green-Illustrative-Style-.png',
    redirectUrl: 'https://yourapp.com',
  },
  {
    _id: 'fallback-v1-2',
    title: 'Call Police',
    imageUrl: 'https://www.investopedia.com/thmb/XfyZ2qUrLRYm_RZdp9tmnbqMjZs=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/TailoredAdvertisingGettyImages-1477620685-0729ffd5aa1e4ae794b4a0a7e00de40e.jpg',
    redirectUrl: 'tel:100',
  },
];

// === v2 FALLBACK (Premium Banners) ===
const getDefaultV2Banners = () => [
  {
    _id: 'fallback-v2-1',
    title: 'Go Premium!',
    imageUrl: 'https://www.verbolabs.com/wp-content/uploads/2024/12/English-Advertising-Introduction-Lesson-Presentation-in-Blue-Yellow-Red-Green-Illustrative-Style-.png',
    redirectUrl: 'app://premium',
  },
  {
    _id: 'fallback-v2-2',
    title: 'Refer & Earn ₹50',
    imageUrl: 'https://www.investopedia.com/thmb/XfyZ2qUrLRYm_RZdp9tmnbqMjZs=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/TailoredAdvertisingGettyImages-1477620685-0729ffd5aa1e4ae794b4a0a7e00de40e.jpg',
    redirectUrl: 'app://refer',
  },
];

export const getActiveAdvertisements = async (req, limit = 5) => {
  const isV2 = req.baseUrl.includes('/api/v2');

  try {
    const ads = await Advertisement.find({ active: true })
      .select('title imageUrl redirectUrl')
      .limit(limit)
      .lean();

    if (ads.length > 0) return ads;

    // === RETURN VERSION-SPECIFIC FALLBACK ===
    return isV2 ? getDefaultV2Banners() : getDefaultV1Ads();
  } catch (error) {
    console.error('DB fetch failed:', error.message);
    return isV2 ? getDefaultV2Banners() : getDefaultV1Ads();
  }
};