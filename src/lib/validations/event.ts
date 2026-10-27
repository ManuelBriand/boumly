import { z } from "zod";

// Catégorie de stand (pricing variable) — prix en centimes.
const CategorySchema = z.object({
  name: z.string().min(1, { message: "categoryNameRequired" }),
  price: z.number().int().min(0),
});

export const EventScheduleSchema = z.object({
  type: z.enum(["recurring", "oneoff"]),
  frequency: z.enum(["weekly", "monthly", "custom"]).optional(),
  // Dates ISO yyyy-mm-dd côté formulaire ; converties en Timestamp à l'écriture.
  nextDates: z.array(z.string()).default([]),
  description: z.string().default(""),
});

export const EventPricingSchema = z.object({
  type: z.enum(["fixed", "variable", "both"]),
  fixedPrice: z.number().int().min(0).optional(),
  categories: z.array(CategorySchema).optional(),
});

export const EventSchema = z.object({
  // Type d'événement — extensible (salon, concert…). "market" par défaut.
  type: z.enum(["market", "fair", "concert"]).default("market"),
  name: z.string().min(2, { message: "nameRequired" }),
  description: z.string().default(""),
  photoUrl: z.string().optional(),
  address: z.string().default(""),
  lat: z.number().optional(),
  lng: z.number().optional(),
  country: z.string().min(2, { message: "countryRequired" }),
  schedule: EventScheduleSchema,
  pricing: EventPricingSchema,
  capacity: z.number().int().min(0).optional(),
  registrationOpen: z.boolean().default(true),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export type EventInput = z.infer<typeof EventSchema>;
