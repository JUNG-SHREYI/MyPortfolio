import { useEffect, useRef, useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";

const PRESETS = [
  { name: "Tenali", latitude: 16.2428, longitude: 80.64, country: "India" },
  { name: "Guntur", latitude: 16.3067, longitude: 80.4365, country: "India" },
  { name: "Mumbai", latitude: 19.076, longitude: 72.8777, country: "India" },
  { name: "Dhaka", latitude: 23.8103, longitude: 90.4125, country: "Bangladesh" },
  { name: "Jakarta", latitude: -6.2088, longitude: 106.8456, country: "Indonesia" },
  { name: "New Orleans", latitude: 29.9511, longitude: -90.0715, country: "USA" },
];

export default function LocationSearch({ onSelect }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/geocode", { params: { q } });
        setResults(data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [q]);

  const pick = (r) => {
    onSelect(r);
    setQ(r.name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="location-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search any place on Earth…"
          className="pl-9 pr-9 bg-card border-border rounded-sm font-mono h-11"
        />
        {loading && <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-secondary animate-spin" />}
      </div>

      {open && results.length > 0 && (
        <div
          data-testid="location-search-results"
          className="absolute z-30 mt-1 w-full bg-popover border border-border rounded-sm shadow-2xl max-h-72 overflow-auto"
        >
          {results.map((r, i) => (
            <button
              key={i}
              data-testid={`search-result-${i}`}
              onClick={() => pick(r)}
              className="w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-border/40 hover:bg-accent transition-colors last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-secondary shrink-0" />
              <span className="text-sm">
                <span className="text-foreground">{r.name}</span>
                <span className="text-muted-foreground text-xs">
                  {" "}· {[r.admin1, r.country].filter(Boolean).join(", ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            data-testid={`preset-${p.name.toLowerCase().replace(/\s/g, "-")}`}
            onClick={() => pick(p)}
            className="text-xs uppercase tracking-wider px-3 py-1.5 border border-border rounded-full text-muted-foreground hover:border-secondary hover:text-secondary transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
