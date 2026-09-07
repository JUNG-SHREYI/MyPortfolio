import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe2, Zap, Bookmark, Trash2, LogOut, User, Loader2, Satellite } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import LocationSearch from "@/components/LocationSearch";
import MapPicker from "@/components/MapPicker";
import IntelligenceReport from "@/components/IntelligenceReport";

export default function Dashboard() {
  const { user, ready, logout } = useAuth();
  const [selected, setSelected] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState([]);

  const loadSaved = () => {
    if (!user) return;
    api.get("/locations").then((r) => setSaved(r.data)).catch(() => {});
  };

  useEffect(() => { if (user) loadSaved(); }, [user]);

  const analyze = async (loc) => {
    const target = loc || selected;
    if (!target) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const { data } = await api.post("/analyze", target);
      setResult(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!user) { toast.error("Sign in to save locations"); return; }
    if (!selected) return;
    try {
      await api.post("/locations", selected);
      toast.success(`Saved ${selected.name}`);
      loadSaved();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Could not save");
    }
  };

  const removeSaved = async (id) => {
    await api.delete(`/locations/${id}`);
    loadSaved();
  };

  const pickAndAnalyze = (loc) => { setSelected(loc); analyze(loc); };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe2 className="w-6 h-6 text-secondary" strokeWidth={1.5} />
            <div className="leading-none">
              <span className="font-heading text-xl font-black tracking-tighter">OMNIS</span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-[0.3em] text-muted-foreground ml-3">Earth Intelligence</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ready && user ? (
              <>
                <span className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3.5 h-3.5 text-secondary" /> {user.name || user.email}
                </span>
                <Button data-testid="logout-btn" onClick={logout} variant="ghost" size="sm" className="rounded-sm text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button data-testid="signin-btn" size="sm" className="rounded-sm bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold uppercase tracking-wider text-xs">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] w-full mx-auto grid lg:grid-cols-[380px_1fr]">
        {/* Sidebar */}
        <aside className="border-r border-border p-4 sm:p-6 space-y-6 omnis-grid-bg">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Target Location</p>
            <LocationSearch onSelect={(l) => setSelected(l)} />
          </div>

          <div className="border border-border corner-ticks h-[280px] overflow-hidden relative">
            <MapPicker selected={selected} onPick={(l) => setSelected(l)} />
            <div className="absolute bottom-2 left-2 z-10 text-[9px] uppercase tracking-widest text-muted-foreground bg-card/80 px-2 py-1 border border-border/60">
              Click map to drop a pin
            </div>
          </div>

          {selected && (
            <div className="border border-border bg-card p-4 space-y-3" data-testid="selected-panel">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Selected</p>
                <p className="font-heading text-lg font-bold tracking-tight">{selected.name}</p>
                <p className="font-mono text-xs text-secondary">
                  {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
                  {selected.country ? ` · ${selected.country}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  data-testid="analyze-btn"
                  onClick={() => analyze()}
                  disabled={analyzing}
                  className="flex-1 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase tracking-wider text-xs h-10"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Analyze</span>}
                </Button>
                <Button data-testid="save-location-btn" onClick={save} variant="outline" className="rounded-sm border-border hover:border-secondary hover:text-secondary h-10">
                  <Bookmark className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Saved locations */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Saved Locations</p>
            {!user ? (
              <p className="text-xs text-muted-foreground border border-border/50 border-dashed p-3">
                <Link to="/login" className="text-secondary hover:underline">Sign in</Link> to save & revisit locations.
              </p>
            ) : saved.length === 0 ? (
              <p className="text-xs text-muted-foreground border border-border/50 border-dashed p-3">No saved locations yet.</p>
            ) : (
              <div className="space-y-1.5" data-testid="saved-list">
                {saved.map((s) => (
                  <div key={s.id} className="group flex items-center justify-between border border-border/60 bg-card px-3 py-2 hover:border-secondary transition-colors">
                    <button data-testid={`saved-${s.id}`} onClick={() => pickAndAnalyze(s)} className="text-left flex-1">
                      <span className="text-sm">{s.name}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground">{s.latitude.toFixed(2)}, {s.longitude.toFixed(2)}</span>
                    </button>
                    <button data-testid={`delete-saved-${s.id}`} onClick={() => removeSaved(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="p-4 sm:p-6 lg:p-8 min-h-[70vh]">
          {analyzing && (
            <div className="h-full flex flex-col items-center justify-center gap-4 py-32" data-testid="analyzing-state">
              <div className="relative w-40 h-1 bg-muted overflow-hidden">
                <div className="scan-bar absolute inset-y-0 w-1/4 bg-secondary" />
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Fusing data · Reasoning</p>
            </div>
          )}

          {!analyzing && result && <IntelligenceReport data={result} />}

          {!analyzing && !result && (
            <div className="h-full flex flex-col items-center justify-center text-center py-24" data-testid="empty-state">
              <Satellite className="w-14 h-14 text-secondary/50 mb-6" strokeWidth={1} />
              <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tighter max-w-xl">
                Search, understand & predict the world around you.
              </h1>
              <p className="text-sm text-muted-foreground mt-4 max-w-md leading-relaxed">
                Pick a location — search, tap a preset city, or drop a pin on the map — and OMNIS fuses
                open environmental data into an evidence-backed report: what's happening, what changed,
                why, and what could happen next.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
