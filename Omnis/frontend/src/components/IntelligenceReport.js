import {
  Activity, AlertTriangle, Droplets, Wind, Thermometer, Gauge,
  Clock, FileCheck2, TrendingUp, HelpCircle, Radio,
} from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

const RISK_COLOR = {
  Low: "hsl(184 100% 50%)",
  Moderate: "hsl(53 93% 50%)",
  High: "hsl(28 100% 55%)",
  Severe: "hsl(0 100% 60%)",
};

const BAND_COLOR = {
  Good: "hsl(150 80% 45%)",
  Moderate: "hsl(53 93% 50%)",
  Poor: "hsl(28 100% 55%)",
  Severe: "hsl(0 100% 60%)",
};

function Metric({ icon: Icon, label, value, unit }) {
  return (
    <div className="corner-ticks border border-border/60 bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-3.5 h-3.5 text-secondary" />
        <span className="text-[10px] uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="font-mono text-2xl font-semibold text-foreground leading-none">
        {value ?? "—"}
        {value != null && unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function Narrative({ icon: Icon, label, text }) {
  if (!text) return null;
  return (
    <div className="p-5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-secondary" />
        <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{text}</p>
    </div>
  );
}

export default function IntelligenceReport({ data }) {
  const { report, fusion, environmental_score, data_timestamp, sources } = data;
  const cur = fusion.current;
  const rain = fusion.rainfall;

  const chartData = (rain.daily_dates || []).map((d, i) => ({
    day: d.slice(5),
    mm: rain.daily_precip_mm?.[i] ?? 0,
    idx: i,
  }));
  const todayIdx = (rain.daily_dates || []).indexOf((data_timestamp || "").slice(0, 10));

  return (
    <div className="space-y-6" data-testid="intelligence-report">
      {/* Headline + score */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 corner-ticks border border-border bg-card p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-4 h-4 text-primary live-dot" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary">Live Intelligence</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight leading-tight" data-testid="report-headline">
            {report.headline || "Environmental analysis"}
          </h2>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Data · {data_timestamp || "n/a"}
            </span>
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" /> {(sources || []).length} sources
            </span>
          </div>
        </div>

        <div className="corner-ticks border border-border bg-card p-6 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Environmental Score</span>
          <div className="flex items-end gap-3 mt-2">
            <span
              className="font-mono text-5xl font-bold leading-none"
              style={{ color: BAND_COLOR[environmental_score.band] }}
              data-testid="env-score"
            >
              {environmental_score.score}
            </span>
            <span className="text-xs uppercase tracking-widest mb-1" style={{ color: BAND_COLOR[environmental_score.band] }}>
              {environmental_score.band}
            </span>
          </div>
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${environmental_score.score}%`, backgroundColor: BAND_COLOR[environmental_score.band] }}
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Metric icon={Thermometer} label="Feels like" value={cur.apparent_temperature_c} unit="°C" />
        <Metric icon={Droplets} label="Humidity" value={cur.humidity_pct} unit="%" />
        <Metric icon={Wind} label="Wind" value={cur.wind_speed_kmh} unit="km/h" />
        <Metric icon={Gauge} label="US AQI" value={fusion.air_quality.us_aqi} unit="" />
        <Metric icon={Droplets} label="Rain 7d past" value={rain.past_7d_total_mm} unit="mm" />
        <Metric icon={TrendingUp} label="Rain 7d next" value={rain.next_7d_total_mm} unit="mm" />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Narrative */}
        <div className="lg:col-span-3 border border-border bg-card">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Reasoning Layer</span>
          </div>
          <Narrative icon={Activity} label="What is happening" text={report.what_is_happening} />
          <Narrative icon={TrendingUp} label="What changed" text={report.what_changed} />
          <Narrative icon={HelpCircle} label="Why it changed" text={report.why_changed} />
        </div>

        {/* Rainfall chart */}
        <div className="lg:col-span-2 border border-border bg-card flex flex-col">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Droplets className="w-4 h-4 text-secondary" />
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Rainfall · 14 day</span>
          </div>
          <div className="p-4 flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(240 4% 55%)" }} interval={1} axisLine={{ stroke: "hsl(240 4% 16%)" }} tickLine={false} />
                <Bar dataKey="mm" radius={[2, 2, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={i === todayIdx ? "hsl(53 93% 50%)" : i < todayIdx ? "hsl(240 4% 30%)" : "hsl(184 100% 50%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1"><i className="w-2 h-2 inline-block" style={{ background: "hsl(240 4% 30%)" }} /> past</span>
              <span className="flex items-center gap-1"><i className="w-2 h-2 inline-block" style={{ background: "hsl(53 93% 50%)" }} /> today</span>
              <span className="flex items-center gap-1"><i className="w-2 h-2 inline-block" style={{ background: "hsl(184 100% 50%)" }} /> forecast</span>
            </div>
          </div>
        </div>
      </div>

      {/* Predictions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-primary" />
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Predictions · What could happen next</span>
        </div>
        <div className="grid md:grid-cols-2 gap-4" data-testid="predictions">
          {(report.predictions || []).map((p, i) => {
            const color = RISK_COLOR[p.risk_level] || "hsl(184 100% 50%)";
            return (
              <div key={i} data-testid={`prediction-${i}`} className="corner-ticks border border-border bg-card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading text-lg font-bold tracking-tight">{p.title}</h3>
                  <span
                    className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm shrink-0"
                    style={{ color, border: `1px solid ${color}`, background: `${color.replace(")", " / 0.08)").replace("hsl", "hsla")}` }}
                  >
                    {p.risk_level}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{p.outlook}</p>

                <div>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    <span>Confidence</span>
                    <span className="font-mono" style={{ color }}>{p.confidence}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${p.confidence}%`, backgroundColor: color }} />
                  </div>
                </div>

                {p.evidence?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Evidence</p>
                    <ul className="space-y-1">
                      {p.evidence.map((e, j) => (
                        <li key={j} className="text-xs text-foreground/80 flex gap-2">
                          <span className="text-secondary">▸</span> {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {p.sources?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40 mt-1">
                    {p.sources.map((s, j) => (
                      <span key={j} className="text-[9px] uppercase tracking-wider text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded-sm">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* sources footer */}
      <div className="border border-border/50 bg-card/50 p-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Sources</span>
        {(sources || []).map((s, i) => (
          <span key={i} className="text-xs text-secondary font-mono">{s}{i < sources.length - 1 ? " ·" : ""}</span>
        ))}
      </div>
    </div>
  );
}
