import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert, TrendingDown, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreditRiskResult, CreditRiskPayload } from "@/lib/api";

const STORAGE_KEY = "credit_risk_result";

interface Stored { result: CreditRiskResult; input: CreditRiskPayload; }

const bandTone = (band: string): "success" | "warning" | "danger" => {
  const b = band.toLowerCase();
  if (/(low|a|prime|excellent|good)/.test(b)) return "success";
  if (/(high|d|e|poor|severe|sub)/.test(b)) return "danger";
  return "warning";
};

const CreditRiskResultPage = () => {
  const [data, setData] = useState<Stored | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) try { setData(JSON.parse(raw)); } catch { /* noop */ }
  }, []);

  if (!data) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">No assessment available</h1>
        <p className="text-muted-foreground mb-6">Run a credit risk assessment first.</p>
        <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Link to="/credit-risk">Start Assessment</Link>
        </Button>
      </div>
    );
  }

  const { result, input } = data;
  const pdRaw = result.probability_of_default ?? result.pd;
  const pd = typeof pdRaw === "number" ? pdRaw * (pdRaw <= 1 ? 100 : 1) : undefined;
  const band = result.risk_band ?? result.risk_level ?? "—";
  const tone = bandTone(band);
  const tones = {
    success: { text: "text-success", bg: "bg-success/10", border: "border-success/30", glow: "shadow-glow-success", grad: "bg-gradient-success", solid: "bg-success" },
    warning: { text: "text-warning", bg: "bg-warning/10", border: "border-warning/30", glow: "", grad: "bg-warning", solid: "bg-warning" },
    danger: { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", glow: "shadow-glow-danger", grad: "bg-gradient-danger", solid: "bg-destructive" },
  }[tone];

  return (
    <div className="container py-10 max-w-5xl">
      <Link to="/credit-risk" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to form
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-xs uppercase tracking-[0.25em] text-primary mb-2">Assessment · Credit Risk</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">Risk Dashboard</h1>

        {/* Hero verdict */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`relative overflow-hidden rounded-3xl p-8 md:p-10 border ${tones.bg} ${tones.border} ${tones.glow}`}
        >
          <div className={`absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30 ${tones.solid}`} />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div className="flex items-center gap-5">
              <div className={`h-16 w-16 rounded-2xl grid place-items-center ${tones.grad}`}>
                <ShieldAlert className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">Risk Band</div>
                <div className={`text-4xl md:text-5xl font-bold ${tones.text}`}>{band}</div>
              </div>
            </div>

            {typeof pd === "number" && (
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  <TrendingDown className="h-3.5 w-3.5" /> Probability of Default
                </div>
                <div className={`text-4xl md:text-5xl font-bold font-mono ${tones.text}`}>
                  {pd.toFixed(2)}<span className="text-2xl">%</span>
                </div>
                <div className="h-2.5 rounded-full bg-background/60 overflow-hidden mt-3">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${Math.min(pd, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className={`h-full ${tones.grad}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Explanation */}
        {result.explanation && (
          <div className="glass-panel rounded-2xl p-6 mt-6">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Borrower Credit Quality</div>
            <p className="text-base leading-relaxed text-foreground/90">{result.explanation}</p>
          </div>
        )}

        {/* Reason codes */}
        {result.reason_codes && result.reason_codes.length > 0 && (
          <div className={`glass-panel rounded-2xl p-6 mt-6 border ${tones.border}`}>
            <div className={`flex items-center gap-2 mb-4 ${tones.text}`}>
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold tracking-wide uppercase text-xs">Reason Codes</h3>
            </div>
            <ul className="space-y-3">
              {result.reason_codes.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 text-sm leading-snug"
                >
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${tones.solid}`} />
                  <span className="text-foreground/90">{s}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {/* Snapshot */}
        <div className="glass-panel rounded-2xl p-6 mt-6">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Application Snapshot</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              ["Age", input.Age], ["Employment", input.Employment_Status],
              ["Annual Income", `₹${input.Annual_Income.toLocaleString()}`],
              ["CIBIL", input.CIBIL_Score], ["Util. Ratio", input.Credit_Utilization_Ratio],
              ["Loan Amount", `₹${input.Loan_Amount.toLocaleString()}`],
              ["Collateral", `₹${input.Collateral_Value.toLocaleString()}`],
              ["Term", `${input.Loan_Term_Months} mo`],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="font-semibold mt-0.5">{String(v)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          <Button asChild variant="outline">
            <Link to="/credit-risk"><RotateCcw className="h-4 w-4 mr-2" /> Run another assessment</Link>
          </Button>
          <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Link to="/loan-approval">Run Loan Approval →</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreditRiskResultPage;
