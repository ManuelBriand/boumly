import type { Order } from "@/types";

/** Regroupe les commandes par date de réception souhaitée (sans date → undated). */
export function groupOrdersByDate(orders: Order[]): {
  byDate: Record<string, Order[]>;
  undated: Order[];
} {
  const byDate: Record<string, Order[]> = {};
  const undated: Order[] = [];
  for (const o of orders) {
    if (o.requestedDate) {
      (byDate[o.requestedDate] ??= []).push(o);
    } else {
      undated.push(o);
    }
  }
  return { byDate, undated };
}

/** Nombre de commandes par date (pour les pastilles du calendrier). */
export function countsByDate(orders: Order[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const o of orders) {
    if (o.requestedDate) counts[o.requestedDate] = (counts[o.requestedDate] ?? 0) + 1;
  }
  return counts;
}

export interface ProductionLine {
  key: string;
  name: string;
  variantLabel?: string;
  quantity: number;
}

/**
 * Agrège les articles par produit + variante.
 * "combien de gâteaux fraise à faire" → somme des quantités, tri décroissant.
 */
export function aggregateProduction(orders: Order[]): ProductionLine[] {
  const map = new Map<string, ProductionLine>();
  for (const o of orders) {
    for (const item of o.items) {
      const key = `${item.name}__${item.variantLabel ?? ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map.set(key, {
          key,
          name: item.name,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity);
}
