// src/schemas/advertisement.schema.js
import { z } from 'zod';

export const getAdsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().min(1).max(10).optional().default(5),
  }),
});