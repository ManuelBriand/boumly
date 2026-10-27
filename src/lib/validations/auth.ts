import { z } from "zod";

// Messages are translation keys resolved in the consuming form via the
// "validation" namespace (see next-intl messages files).
export const LoginSchema = z.object({
  email: z.string().email({ message: "emailInvalid" }),
  password: z.string().min(6, { message: "passwordMin" }),
});

export const RegisterSchema = z.object({
  storeName: z.string().min(2, { message: "storeNameMin" }),
  country: z.string().min(2, { message: "countryRequired" }),
  email: z.string().email({ message: "emailInvalid" }),
  password: z.string().min(6, { message: "passwordMin" }),
  acceptTerms: z.literal(true, { message: "acceptTermsRequired" }),
});

export const CustomerRegisterSchema = z.object({
  name: z.string().min(2, { message: "nameMin" }),
  email: z.string().email({ message: "emailInvalid" }),
  password: z.string().min(6, { message: "passwordMin" }),
  acceptTerms: z.literal(true, { message: "acceptTermsRequired" }),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type CustomerRegisterInput = z.infer<typeof CustomerRegisterSchema>;
