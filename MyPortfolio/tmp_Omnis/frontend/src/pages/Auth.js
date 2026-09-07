import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Globe2, ArrowRight, Loader2 } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { authenticate } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const { data } = await api.post(path, body);
      authenticate(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative omnis-scanlines">
      {/* Left visual */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden border-r border-border"
        style={{
          backgroundImage:
            "linear-gradient(180deg, hsla(240,11%,4%,0.55), hsla(240,11%,4%,0.9)), url(https://images.pexels.com/photos/30596239/pexels-photo-30596239.jpeg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-center gap-3">
          <Globe2 className="w-7 h-7 text-secondary" strokeWidth={1.5} />
          <span className="font-heading text-2xl font-black tracking-tighter">OMNIS</span>
        </div>
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-4">Earth Intelligence</p>
          <h1 className="font-heading text-4xl xl:text-5xl font-black tracking-tighter leading-[1.05] mb-6">
            Turn the world's data into understandable decisions.
          </h1>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Search, understand and predict the environment around any point on Earth — with evidence,
            confidence scores, timestamps and cited sources.
          </p>
        </div>
        <div className="text-xs text-muted-foreground/70 tracking-wide">
          OPEN MULTI-SOURCE INTELLIGENCE SYSTEM · v1.0
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12 omnis-grid-bg">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <Globe2 className="w-6 h-6 text-secondary" strokeWidth={1.5} />
            <span className="font-heading text-xl font-black tracking-tighter">OMNIS</span>
          </div>

          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
            {mode === "login" ? "Access Console" : "Create Access"}
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight mb-8">
            {mode === "login" ? "Sign in" : "Register"}
          </h2>

          <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
            {mode === "register" && (
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Name</label>
                <Input
                  data-testid="auth-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 bg-card border-border rounded-sm font-mono"
                  placeholder="Ada Lovelace"
                />
              </div>
            )}
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</label>
              <Input
                data-testid="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 bg-card border-border rounded-sm font-mono"
                placeholder="you@earth.io"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</label>
              <Input
                data-testid="auth-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 bg-card border-border rounded-sm font-mono"
                placeholder="min 6 characters"
              />
            </div>

            {error && (
              <p data-testid="auth-error" className="text-xs text-destructive border border-destructive/40 bg-destructive/10 px-3 py-2 rounded-sm">
                {error}
              </p>
            )}

            <Button
              data-testid="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase tracking-wider h-11"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <span className="flex items-center gap-2">{mode === "login" ? "Enter" : "Create account"} <ArrowRight className="w-4 h-4" /></span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-xs text-muted-foreground flex items-center justify-between">
            <button
              data-testid="auth-toggle-btn"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="hover:text-secondary transition-colors"
            >
              {mode === "login" ? "No access? Register →" : "Have access? Sign in →"}
            </button>
            <Link to="/" className="hover:text-secondary transition-colors" data-testid="auth-skip-link">
              Continue as guest →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
