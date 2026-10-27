import { z } from "zod";

const ProductOptionSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.string().min(1)).min(1).max(10),
  adjustments: z.record(z.string(), z.number()),
});

const ProductVariantSchema = z.object({
  id: z.string(),
  options: z.record(z.string(), z.string()),
  stock: z.number().nullable(),
  enabled: z.boolean(),
});

const CustomFieldSchema = z.object({
  label: z.string().min(1),
  required: z.boolean(),
});

export const ProductSchema = z.object({
  name: z.string().min(2, { message: "productNameMin" }),
  description: z.string().min(10, { message: "productDescriptionMin" }),
  price: z.number().min(0.01, { message: "productPriceInvalid" }),
  active: z.boolean(),
  images: z.array(z.string()).max(5),
  options: z.array(ProductOptionSchema).max(3),
  variants: z.array(ProductVariantSchema),
  stock: z.number().int().min(0).nullable().optional(),
  trackStock: z.boolean(),
  customField: CustomFieldSchema.optional(),
});

export type ProductInput = z.infer<typeof ProductSchema>;
