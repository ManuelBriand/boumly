"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Coords {
  lat: number;
  lng: number;
}

export interface AddressDetail {
  coords: Coords | null;     // null en saisie libre (non vérifiable)
  countryCode: string | null; // ISO alpha-2 minuscule de la destination
}

interface Suggestion {
  id: string;
  label: string;       // full address line
  context: string;     // ville / pays
  coords?: Coords;     // geometry Mapbox (pour le rayon de livraison)
  countryCode?: string; // pays de la destination (pour les zones d'expédition)
}

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  // Détail de la suggestion choisie, ou {null,null} en saisie libre.
  onSelect?: (value: string, detail: AddressDetail) => void;
  placeholder?: string;
  className?: string;
  ariaInvalid?: boolean;
  country?: string;   // ISO alpha-2 (ex: "fr"). Absent → recherche mondiale
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder = "Commencez à taper une adresse...",
  className,
  ariaInvalid,
  country,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextFetch = useRef(false);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (!MAPBOX_TOKEN) return; // graceful: plain input behaviour
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) return; // suggestions vidées dans onChange
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url =
          `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}` +
          `&access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&language=fr&types=address,street` +
          (country ? `&country=${country}` : "");
        const res = await fetch(url);
        const data = await res.json();
        const list: Suggestion[] = (data.features ?? []).map((f: {
          id?: string;
          properties?: {
            full_address?: string;
            name?: string;
            place_formatted?: string;
            context?: { country?: { country_code?: string } };
          };
          geometry?: { coordinates?: [number, number] };
        }) => {
          const c = f.geometry?.coordinates;
          const cc = f.properties?.context?.country?.country_code;
          return {
            id: f.id ?? Math.random().toString(36),
            label: f.properties?.full_address ?? f.properties?.name ?? "",
            context: f.properties?.place_formatted ?? "",
            ...(Array.isArray(c) && c.length >= 2
              ? { coords: { lat: c[1], lng: c[0] } }
              : {}),
            ...(cc ? { countryCode: cc.toLowerCase() } : {}),
          };
        }).filter((s: Suggestion) => s.label);
        setSuggestions(list);
        setOpen(list.length > 0);
        setActive(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, country]);

  function select(s: Suggestion) {
    skipNextFetch.current = true;
    onChange(s.label);
    onSelect?.(s.label, { coords: s.coords ?? null, countryCode: s.countryCode ?? null });
    setOpen(false);
    setSuggestions([]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      select(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value.trim().length < 3) {
              setSuggestions([]);
              setOpen(false);
            }
            // saisie libre → ni coords ni pays vérifiables
            onSelect?.(e.target.value, { coords: null, countryCode: null });
          }}
          onKeyDown={onKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          aria-invalid={ariaInvalid}
          autoComplete="off"
          className={cn(
            "w-full h-11 rounded-xl border border-border bg-transparent pl-9 pr-9 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors",
            "aria-[invalid=true]:border-destructive",
            className
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(s); }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors",
                  i === active ? "bg-primary/5" : "hover:bg-muted"
                )}
              >
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground leading-snug">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
