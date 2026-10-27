import { z } from "zod";

export interface CheckoutSchemaOptions {
  scheduling: boolean;
  minISO?: string;
  maxISO?: string;
}

export function makeCheckoutSchema(opts: CheckoutSchemaOptions) {
  return z
    .object({
      customerName: z.string().min(2, { message: "nameRequired" }),
      customerPhone: z.string().min(8, { message: "phoneRequired" }),
      customerEmail: z.string().email({ message: "emailInvalid" }),
      fulfillmentMethod: z.enum(["pickup", "local_delivery", "shipping"]),
      address: z.string().optional(),
      addressComplement: z.string().max(200, { message: "complementTooLong" }).optional(),
      zipCode: z.string().optional(),
      city: z.string().optional(),
      requestedDate: z.string().optional(),
      requestedTime: z.string().optional(),
      note: z.string().max(500, { message: "noteTooLong" }).optional(),
      acceptCancellationPolicy: z.literal(true, { message: "cancellationPolicyRequired" }),
    })
    .superRefine((data, ctx) => {
      const requireAddress = () => {
        // L'adresse (autocomplétion) contient déjà numéro, code postal et ville.
        if ((data.address?.trim().length ?? 0) < 5) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "addressRequired",
            path: ["address"],
          });
        }
      };

      const requireDate = () => {
        const date = data.requestedDate?.trim();
        if (!date) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "dateRequired",
            path: ["requestedDate"],
          });
          return;
        }
        if (opts.minISO && date < opts.minISO) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "dateTooSoon",
            path: ["requestedDate"],
          });
        }
        if (opts.maxISO && date > opts.maxISO) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "dateTooFar",
            path: ["requestedDate"],
          });
        }
      };

      const forbidDate = () => {
        if (data.requestedDate?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "schedulingNotAvailable",
            path: ["requestedDate"],
          });
        }
      };

      if (data.fulfillmentMethod === "pickup") {
        if (opts.scheduling) requireDate();
      } else if (data.fulfillmentMethod === "local_delivery") {
        requireAddress();
        if (opts.scheduling) requireDate();
      } else if (data.fulfillmentMethod === "shipping") {
        requireAddress();
        forbidDate();
      }
    });
}

// Schéma par défaut (programmation désactivée) — sert au typage.
export const CheckoutSchema = makeCheckoutSchema({ scheduling: false });

export type CheckoutInput = z.infer<typeof CheckoutSchema>;
