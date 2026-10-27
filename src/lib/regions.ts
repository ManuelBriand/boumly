// Régions du monde + paliers d'expédition (national / régional / international).
// Clés ISO 3166-1 alpha-2 en minuscules (format Mapbox country_code).

export type Region =
  | "europe"
  | "north_america"
  | "latin_america"
  | "africa"
  | "asia"
  | "oceania"
  | "middle_east";

export type ShippingZone = "national" | "regional" | "international";

export const REGION_LABEL: Record<Region, string> = {
  europe: "Europe",
  north_america: "Amérique du Nord",
  latin_america: "Amérique latine",
  africa: "Afrique",
  asia: "Asie",
  oceania: "Océanie",
  middle_east: "Moyen-Orient",
};

export const SHIPPING_ZONE_LABEL: Record<ShippingZone, string> = {
  national: "Mon pays",
  regional: "Ma région",
  international: "International",
};

// Listes par région (alpha-2 minuscules).
const EUROPE = [
  "al", "ad", "at", "by", "be", "ba", "bg", "hr", "cy", "cz", "dk", "ee", "fo",
  "fi", "fr", "de", "gi", "gr", "gg", "hu", "is", "ie", "im", "it", "je", "xk",
  "lv", "li", "lt", "lu", "mt", "md", "mc", "me", "nl", "mk", "no", "pl", "pt",
  "ro", "ru", "sm", "rs", "sk", "si", "es", "se", "ch", "ua", "gb", "va",
];

const NORTH_AMERICA = ["us", "ca", "bm", "gl", "pm"];

const LATIN_AMERICA = [
  "mx", "gt", "bz", "sv", "hn", "ni", "cr", "pa", "co", "ve", "ec", "pe", "bo",
  "br", "py", "uy", "ar", "cl", "gy", "sr", "gf",
  // Caraïbes
  "cu", "do", "ht", "jm", "tt", "bs", "bb", "ag", "dm", "gd", "kn", "lc", "vc",
  "pr", "aw", "cw", "ky", "tc", "vg", "vi", "ai", "ms", "bq", "sx", "mf", "bl",
  "gp", "mq",
];

const AFRICA = [
  "dz", "ao", "bj", "bw", "bf", "bi", "cm", "cv", "cf", "td", "km", "cg", "cd",
  "ci", "dj", "eg", "gq", "er", "sz", "et", "ga", "gm", "gh", "gn", "gw", "ke",
  "ls", "lr", "ly", "mg", "mw", "ml", "mr", "mu", "yt", "ma", "mz", "na", "ne",
  "ng", "re", "rw", "st", "sn", "sc", "sl", "so", "za", "ss", "sd", "tz", "tg",
  "tn", "ug", "eh", "zm", "zw",
];

const MIDDLE_EAST = [
  "bh", "ir", "iq", "il", "jo", "kw", "lb", "om", "ps", "qa", "sa", "sy", "tr",
  "ae", "ye",
];

const ASIA = [
  "af", "am", "az", "bd", "bt", "bn", "kh", "cn", "ge", "hk", "in", "id", "jp",
  "kz", "kg", "la", "mo", "my", "mv", "mn", "mm", "np", "kp", "pk", "ph", "sg",
  "kr", "lk", "tw", "tj", "th", "tl", "tm", "uz", "vn",
];

const OCEANIA = [
  "au", "nz", "fj", "pg", "sb", "vu", "nc", "pf", "ws", "to", "ki", "fm", "mh",
  "nr", "pw", "tv", "ck", "nu", "gu", "as",
];

function buildMap(): Record<string, Region> {
  const map: Record<string, Region> = {};
  const add = (codes: string[], region: Region) => {
    for (const c of codes) map[c] = region;
  };
  add(EUROPE, "europe");
  add(NORTH_AMERICA, "north_america");
  add(LATIN_AMERICA, "latin_america");
  add(AFRICA, "africa");
  add(MIDDLE_EAST, "middle_east");
  add(ASIA, "asia");
  add(OCEANIA, "oceania");
  return map;
}

export const COUNTRY_REGION: Record<string, Region> = buildMap();

export function regionOf(country: string | undefined | null): Region | undefined {
  if (!country) return undefined;
  return COUNTRY_REGION[country.toLowerCase()];
}

/** Libellé de la région du vendeur (UI réglages). */
export function regionalLabel(sellerCountry: string | undefined | null): string {
  const r = regionOf(sellerCountry);
  return r ? REGION_LABEL[r] : "Ma région";
}

/** Classe une destination dans un palier relatif au pays du vendeur. */
export function zoneForDestination(
  seller: string | undefined | null,
  dest: string | undefined | null
): ShippingZone {
  const s = seller?.toLowerCase();
  const d = dest?.toLowerCase();
  if (s && d && s === d) return "national";
  const sr = regionOf(s);
  const dr = regionOf(d);
  if (sr && dr && sr === dr) return "regional";
  return "international";
}
