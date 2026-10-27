import { z } from "zod";

export const StoreSettingsSchema = z.object({
  name: z.string().min(2, { message: "nameRequired" }),
  description: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "emailInvalid" }).or(z.literal("")).optional(),
  temporarilyClosed: z.boolean().optional(),
  pickupEnabled: z.boolean().optional(),
  localDeliveryEnabled: z.boolean().optional(),
  localDeliveryFee: z.number().min(0).optional(),
  localDeliveryRadiusKm: z.number().min(0).optional(),
  shippingEnabled: z.boolean().optional(),
  shippingFee: z.number().min(0).optional(),
  shippingZones: z
    .object({
      national: z.object({ enabled: z.boolean(), fee: z.number().min(0) }).optional(),
      regional: z.object({ enabled: z.boolean(), fee: z.number().min(0) }).optional(),
      international: z.object({ enabled: z.boolean(), fee: z.number().min(0) }).optional(),
    })
    .optional(),
  schedulingEnabled: z.boolean().optional(),
  minimumNoticeHours: z.number().min(0).optional(),
  maximumBookingDays: z.number().min(1).optional(),
  cancellationPolicy: z.string().max(2000).optional(),
  socials: z
    .object({
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      facebook: z.string().optional(),
      whatsapp: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
});

export type StoreSettingsInput = z.infer<typeof StoreSettingsSchema>;
