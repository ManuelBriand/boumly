// Pays (ISO 3166-1 alpha-2) — sélecteur boutique + filtre d'autocomplétion d'adresse.
// Triés par ordre alphabétique du libellé français.
export interface Country {
  code: string;   // "fr"
  label: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "af", label: "Afghanistan", flag: "🇦🇫" },
  { code: "za", label: "Afrique du Sud", flag: "🇿🇦" },
  { code: "al", label: "Albanie", flag: "🇦🇱" },
  { code: "dz", label: "Algérie", flag: "🇩🇿" },
  { code: "de", label: "Allemagne", flag: "🇩🇪" },
  { code: "ad", label: "Andorre", flag: "🇦🇩" },
  { code: "ao", label: "Angola", flag: "🇦🇴" },
  { code: "ag", label: "Antigua-et-Barbuda", flag: "🇦🇬" },
  { code: "sa", label: "Arabie saoudite", flag: "🇸🇦" },
  { code: "ar", label: "Argentine", flag: "🇦🇷" },
  { code: "am", label: "Arménie", flag: "🇦🇲" },
  { code: "au", label: "Australie", flag: "🇦🇺" },
  { code: "at", label: "Autriche", flag: "🇦🇹" },
  { code: "az", label: "Azerbaïdjan", flag: "🇦🇿" },
  { code: "bs", label: "Bahamas", flag: "🇧🇸" },
  { code: "bh", label: "Bahreïn", flag: "🇧🇭" },
  { code: "bd", label: "Bangladesh", flag: "🇧🇩" },
  { code: "bb", label: "Barbade", flag: "🇧🇧" },
  { code: "be", label: "Belgique", flag: "🇧🇪" },
  { code: "bz", label: "Belize", flag: "🇧🇿" },
  { code: "bj", label: "Bénin", flag: "🇧🇯" },
  { code: "bt", label: "Bhoutan", flag: "🇧🇹" },
  { code: "by", label: "Biélorussie", flag: "🇧🇾" },
  { code: "mm", label: "Birmanie (Myanmar)", flag: "🇲🇲" },
  { code: "bo", label: "Bolivie", flag: "🇧🇴" },
  { code: "ba", label: "Bosnie-Herzégovine", flag: "🇧🇦" },
  { code: "bw", label: "Botswana", flag: "🇧🇼" },
  { code: "br", label: "Brésil", flag: "🇧🇷" },
  { code: "bn", label: "Brunei", flag: "🇧🇳" },
  { code: "bg", label: "Bulgarie", flag: "🇧🇬" },
  { code: "bf", label: "Burkina Faso", flag: "🇧🇫" },
  { code: "bi", label: "Burundi", flag: "🇧🇮" },
  { code: "kh", label: "Cambodge", flag: "🇰🇭" },
  { code: "cm", label: "Cameroun", flag: "🇨🇲" },
  { code: "ca", label: "Canada", flag: "🇨🇦" },
  { code: "cv", label: "Cap-Vert", flag: "🇨🇻" },
  { code: "cl", label: "Chili", flag: "🇨🇱" },
  { code: "cn", label: "Chine", flag: "🇨🇳" },
  { code: "cy", label: "Chypre", flag: "🇨🇾" },
  { code: "co", label: "Colombie", flag: "🇨🇴" },
  { code: "km", label: "Comores", flag: "🇰🇲" },
  { code: "cg", label: "Congo (Brazzaville)", flag: "🇨🇬" },
  { code: "cd", label: "Congo (RDC)", flag: "🇨🇩" },
  { code: "kp", label: "Corée du Nord", flag: "🇰🇵" },
  { code: "kr", label: "Corée du Sud", flag: "🇰🇷" },
  { code: "cr", label: "Costa Rica", flag: "🇨🇷" },
  { code: "ci", label: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "hr", label: "Croatie", flag: "🇭🇷" },
  { code: "cu", label: "Cuba", flag: "🇨🇺" },
  { code: "dk", label: "Danemark", flag: "🇩🇰" },
  { code: "dj", label: "Djibouti", flag: "🇩🇯" },
  { code: "dm", label: "Dominique", flag: "🇩🇲" },
  { code: "eg", label: "Égypte", flag: "🇪🇬" },
  { code: "ae", label: "Émirats arabes unis", flag: "🇦🇪" },
  { code: "ec", label: "Équateur", flag: "🇪🇨" },
  { code: "er", label: "Érythrée", flag: "🇪🇷" },
  { code: "es", label: "Espagne", flag: "🇪🇸" },
  { code: "ee", label: "Estonie", flag: "🇪🇪" },
  { code: "sz", label: "Eswatini", flag: "🇸🇿" },
  { code: "us", label: "États-Unis", flag: "🇺🇸" },
  { code: "et", label: "Éthiopie", flag: "🇪🇹" },
  { code: "fj", label: "Fidji", flag: "🇫🇯" },
  { code: "fi", label: "Finlande", flag: "🇫🇮" },
  { code: "fr", label: "France", flag: "🇫🇷" },
  { code: "ga", label: "Gabon", flag: "🇬🇦" },
  { code: "gm", label: "Gambie", flag: "🇬🇲" },
  { code: "ge", label: "Géorgie", flag: "🇬🇪" },
  { code: "gh", label: "Ghana", flag: "🇬🇭" },
  { code: "gi", label: "Gibraltar", flag: "🇬🇮" },
  { code: "gr", label: "Grèce", flag: "🇬🇷" },
  { code: "gd", label: "Grenade", flag: "🇬🇩" },
  { code: "gt", label: "Guatemala", flag: "🇬🇹" },
  { code: "gn", label: "Guinée", flag: "🇬🇳" },
  { code: "gq", label: "Guinée équatoriale", flag: "🇬🇶" },
  { code: "gw", label: "Guinée-Bissau", flag: "🇬🇼" },
  { code: "gy", label: "Guyana", flag: "🇬🇾" },
  { code: "ht", label: "Haïti", flag: "🇭🇹" },
  { code: "hn", label: "Honduras", flag: "🇭🇳" },
  { code: "hk", label: "Hong Kong", flag: "🇭🇰" },
  { code: "hu", label: "Hongrie", flag: "🇭🇺" },
  { code: "mh", label: "Îles Marshall", flag: "🇲🇭" },
  { code: "sb", label: "Îles Salomon", flag: "🇸🇧" },
  { code: "in", label: "Inde", flag: "🇮🇳" },
  { code: "id", label: "Indonésie", flag: "🇮🇩" },
  { code: "iq", label: "Irak", flag: "🇮🇶" },
  { code: "ir", label: "Iran", flag: "🇮🇷" },
  { code: "ie", label: "Irlande", flag: "🇮🇪" },
  { code: "is", label: "Islande", flag: "🇮🇸" },
  { code: "il", label: "Israël", flag: "🇮🇱" },
  { code: "it", label: "Italie", flag: "🇮🇹" },
  { code: "jm", label: "Jamaïque", flag: "🇯🇲" },
  { code: "jp", label: "Japon", flag: "🇯🇵" },
  { code: "jo", label: "Jordanie", flag: "🇯🇴" },
  { code: "kz", label: "Kazakhstan", flag: "🇰🇿" },
  { code: "ke", label: "Kenya", flag: "🇰🇪" },
  { code: "kg", label: "Kirghizistan", flag: "🇰🇬" },
  { code: "ki", label: "Kiribati", flag: "🇰🇮" },
  { code: "xk", label: "Kosovo", flag: "🇽🇰" },
  { code: "kw", label: "Koweït", flag: "🇰🇼" },
  { code: "la", label: "Laos", flag: "🇱🇦" },
  { code: "ls", label: "Lesotho", flag: "🇱🇸" },
  { code: "lv", label: "Lettonie", flag: "🇱🇻" },
  { code: "lb", label: "Liban", flag: "🇱🇧" },
  { code: "lr", label: "Liberia", flag: "🇱🇷" },
  { code: "ly", label: "Libye", flag: "🇱🇾" },
  { code: "li", label: "Liechtenstein", flag: "🇱🇮" },
  { code: "lt", label: "Lituanie", flag: "🇱🇹" },
  { code: "lu", label: "Luxembourg", flag: "🇱🇺" },
  { code: "mk", label: "Macédoine du Nord", flag: "🇲🇰" },
  { code: "mg", label: "Madagascar", flag: "🇲🇬" },
  { code: "my", label: "Malaisie", flag: "🇲🇾" },
  { code: "mw", label: "Malawi", flag: "🇲🇼" },
  { code: "mv", label: "Maldives", flag: "🇲🇻" },
  { code: "ml", label: "Mali", flag: "🇲🇱" },
  { code: "mt", label: "Malte", flag: "🇲🇹" },
  { code: "ma", label: "Maroc", flag: "🇲🇦" },
  { code: "mu", label: "Maurice", flag: "🇲🇺" },
  { code: "mr", label: "Mauritanie", flag: "🇲🇷" },
  { code: "mx", label: "Mexique", flag: "🇲🇽" },
  { code: "fm", label: "Micronésie", flag: "🇫🇲" },
  { code: "md", label: "Moldavie", flag: "🇲🇩" },
  { code: "mc", label: "Monaco", flag: "🇲🇨" },
  { code: "mn", label: "Mongolie", flag: "🇲🇳" },
  { code: "me", label: "Monténégro", flag: "🇲🇪" },
  { code: "mz", label: "Mozambique", flag: "🇲🇿" },
  { code: "na", label: "Namibie", flag: "🇳🇦" },
  { code: "nr", label: "Nauru", flag: "🇳🇷" },
  { code: "np", label: "Népal", flag: "🇳🇵" },
  { code: "ni", label: "Nicaragua", flag: "🇳🇮" },
  { code: "ne", label: "Niger", flag: "🇳🇪" },
  { code: "ng", label: "Nigeria", flag: "🇳🇬" },
  { code: "no", label: "Norvège", flag: "🇳🇴" },
  { code: "nz", label: "Nouvelle-Zélande", flag: "🇳🇿" },
  { code: "om", label: "Oman", flag: "🇴🇲" },
  { code: "ug", label: "Ouganda", flag: "🇺🇬" },
  { code: "uz", label: "Ouzbékistan", flag: "🇺🇿" },
  { code: "pk", label: "Pakistan", flag: "🇵🇰" },
  { code: "pw", label: "Palaos", flag: "🇵🇼" },
  { code: "ps", label: "Palestine", flag: "🇵🇸" },
  { code: "pa", label: "Panama", flag: "🇵🇦" },
  { code: "pg", label: "Papouasie-Nouvelle-Guinée", flag: "🇵🇬" },
  { code: "py", label: "Paraguay", flag: "🇵🇾" },
  { code: "nl", label: "Pays-Bas", flag: "🇳🇱" },
  { code: "pe", label: "Pérou", flag: "🇵🇪" },
  { code: "ph", label: "Philippines", flag: "🇵🇭" },
  { code: "pl", label: "Pologne", flag: "🇵🇱" },
  { code: "pt", label: "Portugal", flag: "🇵🇹" },
  { code: "qa", label: "Qatar", flag: "🇶🇦" },
  { code: "do", label: "République dominicaine", flag: "🇩🇴" },
  { code: "cz", label: "République tchèque", flag: "🇨🇿" },
  { code: "ro", label: "Roumanie", flag: "🇷🇴" },
  { code: "gb", label: "Royaume-Uni", flag: "🇬🇧" },
  { code: "ru", label: "Russie", flag: "🇷🇺" },
  { code: "rw", label: "Rwanda", flag: "🇷🇼" },
  { code: "kn", label: "Saint-Kitts-et-Nevis", flag: "🇰🇳" },
  { code: "sm", label: "Saint-Marin", flag: "🇸🇲" },
  { code: "vc", label: "Saint-Vincent-et-les-Grenadines", flag: "🇻🇨" },
  { code: "lc", label: "Sainte-Lucie", flag: "🇱🇨" },
  { code: "sv", label: "Salvador", flag: "🇸🇻" },
  { code: "ws", label: "Samoa", flag: "🇼🇸" },
  { code: "st", label: "Sao Tomé-et-Principe", flag: "🇸🇹" },
  { code: "sn", label: "Sénégal", flag: "🇸🇳" },
  { code: "rs", label: "Serbie", flag: "🇷🇸" },
  { code: "sc", label: "Seychelles", flag: "🇸🇨" },
  { code: "sl", label: "Sierra Leone", flag: "🇸🇱" },
  { code: "sg", label: "Singapour", flag: "🇸🇬" },
  { code: "sk", label: "Slovaquie", flag: "🇸🇰" },
  { code: "si", label: "Slovénie", flag: "🇸🇮" },
  { code: "so", label: "Somalie", flag: "🇸🇴" },
  { code: "sd", label: "Soudan", flag: "🇸🇩" },
  { code: "ss", label: "Soudan du Sud", flag: "🇸🇸" },
  { code: "lk", label: "Sri Lanka", flag: "🇱🇰" },
  { code: "se", label: "Suède", flag: "🇸🇪" },
  { code: "ch", label: "Suisse", flag: "🇨🇭" },
  { code: "sr", label: "Suriname", flag: "🇸🇷" },
  { code: "sy", label: "Syrie", flag: "🇸🇾" },
  { code: "tj", label: "Tadjikistan", flag: "🇹🇯" },
  { code: "tz", label: "Tanzanie", flag: "🇹🇿" },
  { code: "td", label: "Tchad", flag: "🇹🇩" },
  { code: "th", label: "Thaïlande", flag: "🇹🇭" },
  { code: "tl", label: "Timor oriental", flag: "🇹🇱" },
  { code: "tg", label: "Togo", flag: "🇹🇬" },
  { code: "to", label: "Tonga", flag: "🇹🇴" },
  { code: "tt", label: "Trinité-et-Tobago", flag: "🇹🇹" },
  { code: "tn", label: "Tunisie", flag: "🇹🇳" },
  { code: "tm", label: "Turkménistan", flag: "🇹🇲" },
  { code: "tr", label: "Turquie", flag: "🇹🇷" },
  { code: "tv", label: "Tuvalu", flag: "🇹🇻" },
  { code: "ua", label: "Ukraine", flag: "🇺🇦" },
  { code: "uy", label: "Uruguay", flag: "🇺🇾" },
  { code: "vu", label: "Vanuatu", flag: "🇻🇺" },
  { code: "va", label: "Vatican", flag: "🇻🇦" },
  { code: "ve", label: "Venezuela", flag: "🇻🇪" },
  { code: "vn", label: "Vietnam", flag: "🇻🇳" },
  { code: "ye", label: "Yémen", flag: "🇾🇪" },
  { code: "zm", label: "Zambie", flag: "🇿🇲" },
  { code: "zw", label: "Zimbabwe", flag: "🇿🇼" },
];

export const DEFAULT_COUNTRY = "fr";

// Devise (ISO 4217 minuscule) par pays (ISO alpha-2). La devise de présentation
// du paiement suit le pays de la boutique pour éviter une conversion FX côté
// compte connecté (charge destination). Couvre tous les pays Stripe Connect.
// Tout pays absent retombe sur DEFAULT_CURRENCY (eur).
export const DEFAULT_CURRENCY = "eur";
export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  // Zone euro (Stripe Connect)
  at: "eur", be: "eur", hr: "eur", cy: "eur", ee: "eur", fi: "eur", fr: "eur",
  de: "eur", gr: "eur", ie: "eur", it: "eur", lv: "eur", lt: "eur", lu: "eur",
  mt: "eur", nl: "eur", pt: "eur", sk: "eur", si: "eur", es: "eur",
  // Europe hors zone euro
  gb: "gbp", gi: "gbp", ch: "chf", li: "chf", no: "nok", se: "sek", dk: "dkk",
  pl: "pln", cz: "czk", ro: "ron", hu: "huf", bg: "bgn",
  // Amériques
  us: "usd", ca: "cad", mx: "mxn", br: "brl",
  // Océanie
  au: "aud", nz: "nzd",
  // Asie / Moyen-Orient
  jp: "jpy", hk: "hkd", sg: "sgd", th: "thb", my: "myr", id: "idr",
  in: "inr", ae: "aed", sa: "sar",
  // Afrique
  za: "zar",
};

// Codes des pays où Stripe Connect peut créer un compte connecté. Le sélecteur de
// pays de la boutique se limite à cette liste (sinon onboarding impossible).
const STRIPE_COUNTRY_CODES = new Set(Object.keys(CURRENCY_BY_COUNTRY));

/** Pays sélectionnables pour une boutique (sous-ensemble Stripe Connect de COUNTRIES). */
export const STRIPE_COUNTRIES: Country[] = COUNTRIES.filter((c) =>
  STRIPE_COUNTRY_CODES.has(c.code)
);

/** Devise ISO 4217 (minuscule) d'une boutique d'après son pays. Défaut: eur. */
export function currencyForCountry(code?: string): string {
  if (!code) return DEFAULT_CURRENCY;
  return CURRENCY_BY_COUNTRY[code.toLowerCase()] ?? DEFAULT_CURRENCY;
}

// Nombre de décimales (unité mineure) par devise — exceptions au défaut de 2.
// Source: ISO 4217 + règles Stripe. Devises sans décimale et à 3 décimales.
export const CURRENCY_DECIMALS: Record<string, number> = {
  // 0 décimale
  bif: 0, clp: 0, djf: 0, gnf: 0, jpy: 0, kmf: 0, krw: 0, mga: 0, pyg: 0,
  rwf: 0, ugx: 0, vnd: 0, vuv: 0, xaf: 0, xof: 0, xpf: 0,
  // 3 décimales
  bhd: 3, iqd: 3, jod: 3, kwd: 3, lyd: 3, omr: 3, tnd: 3,
};

/** Décimales de la devise (défaut 2). */
export const currencyDecimals = (currency: string): number =>
  CURRENCY_DECIMALS[currency.toLowerCase()] ?? 2;

/**
 * Convertit un montant (unité majeure, ex. euros) en unité mineure attendue par
 * Stripe (ex. centimes). Gère 0/2/3 décimales. Pour les devises à 3 décimales,
 * Stripe exige un multiple de 10.
 */
export function toMinorUnits(amount: number, currency: string): number {
  const d = currencyDecimals(currency);
  const minor = Math.round(amount * 10 ** d);
  return d === 3 ? Math.round(minor / 10) * 10 : minor;
}

/** Inverse de toMinorUnits : unité mineure → unité majeure (pour stockage/affichage). */
export const fromMinorUnits = (minor: number, currency: string): number =>
  minor / 10 ** currencyDecimals(currency);
