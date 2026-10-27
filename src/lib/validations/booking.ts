import { z } from "zod";

// Prestation (atelier) — terme technique générique. Prix en centimes (unité
// mineure). Le wording visible côté UI reste « Atelier ».
// Champs communs à tous les modes de récurrence.
const BaseFields = {
  nom: z.string().min(2, { message: "nomRequired" }),
  description: z.string().default(""),
  photoUrl: z.string().optional(),
  dureeMinutes: z.number().int().min(1),
  capaciteMax: z.number().int().min(1),
  prix: z.number().int().min(0),
  modePaiement: z.enum(["immediat", "sur_place"]),
  actif: z.boolean().default(true),
};

// Récurrent : horaires hebdomadaires (jour 0–6 + heure). Plusieurs entrées par
// jour possibles + heures différentes selon les jours.
const HeureRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const RecurrentSchema = z.object({
  ...BaseFields,
  modeRecurrence: z.literal("recurrent"),
  horairesRecurrence: z
    .array(
      z.object({
        jour: z.number().int().min(0).max(6),
        heure: z.string().regex(HeureRegex, { message: "heureInvalide" }),
      })
    )
    .min(1),
});

// Ponctuel : une ou plusieurs dates précises ISO "yyyy-mm-ddTHH:mm".
const PonctuelSchema = z.object({
  ...BaseFields,
  modeRecurrence: z.literal("ponctuel"),
  datesPonctuelles: z
    .array(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, {
          message: "dateInvalide",
        })
    )
    .min(1),
});

export const PrestationSchema = z.discriminatedUnion("modeRecurrence", [
  RecurrentSchema,
  PonctuelSchema,
]);

export type PrestationInput = z.infer<typeof PrestationSchema>;
