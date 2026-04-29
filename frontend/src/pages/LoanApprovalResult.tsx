import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoanApprovalResult, LoanApprovalPayload } from "@/lib/api";

const STORAGE_KEY = "loan_approval_result";

interface Stored { result: LoanApprovalResult; input: LoanApprovalPayload; }

const LoanApprovalResult = () => {
  const [data, setData] = useState<Stored | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) try { setData(JSON.parse(raw)); } catch { /* noop */ }
  }, []);

  if (!data) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">No prediction available</h1>
        <p className="text-muted-foreground mb-6">Run an evaluation first to view the result.</p>
        <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
          <Link to="/loan-approval">Start a Prediction</Link>
        </Button>
      </div>
    );
  }

  const { result, input } = data;
  const approved = result.approved ?? /approve|sanction|yes|1/i.test(String(result.prediction ?? ""));
  const probRaw = result.probability ?? result.confidence;
  const prob = typeof probRaw === "number" ? probRaw * (probRaw <= 1 ? 100 : 1) : undefined;

  return (
    <div className="container py-10 max-w-5xl">
      <Link to="/loan-approval" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to form
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-xs uppercase tracking-[0.25em] text-primary mb-2">Decision · Loan Approval</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-8">Prediction Result</h1>

        {/* Hero verdict */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`relative overflow-hidden rounded-3xl p-8 md:p-10 border ${
            approved ? "bg-success/10 border-success/30 shadow-glow-success" : "bg-destructive/10 border-destructive/30 shadow-glow-danger"
          }`}
        >
          <div className={`absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30 ${approved ? "bg-success" : "bg-destructive"}`} />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={`h-16 w-16 rounded-2xl grid place-items-center ${approved ? "bg-gradient-success" : "bg-gradient-danger"}`}>
                {approved ? <CheckCircle2 className="h-8 w-8 text-success-foreground" /> : <XCircle className="h-8 w-8 text-destructive-foreground" />}
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">Recommendation</div>
                <div className={`text-4xl md:text-5xl font-bold ${approved ? "text-success" : "text-destructive"}`}>
                  {approved ? "Approved" : "Rejected"}
                </div>
              </div>
            </div>

            {typeof prob === "number" && (
              <div className="md:text-right">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">Confidence</div>
                <div className="text-4xl md:text-5xl font-bold font-mono">{prob.toFixed(1)}<span className="text-2xl">%</span></div>
              </div>
            )}
          </div>

          {typeof prob === "number" && (
            <div className="relative mt-6">
              <div className="h-2 rounded-full bg-background/60 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${prob}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  className={`h-full ${approved ? "bg-gradient-success" : "bg-gradient-danger"}`}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Strengths + Concerns */}
        <div className="grid md:grid-cols-2 gap-5 mt-6">
          <ReasonPanel title="Strengths" tone="success" items={result.strengths} icon={<ShieldCheck className="h-5 w-5" />} empty="No standout strengths reported." />
          <ReasonPanel title="Concerns" tone="danger" items={result.concerns} icon={<AlertTriangle className="h-5 w-5" />} empty="No concerns flagged by the model." />
        </div>

        {/* Snapshot */}
        <div className="glass-panel rounded-2xl p-6 mt-6">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Application Snapshot</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              ["Age", input.Age], ["Employment", input.Employment_Status],
              ["Annual Income", `₹${input.Annual_Income.toLocaleString()}`],
              ["CIBIL Score", input.CIBIL_Score], ["Loan Type", input.Loan_Type],
              ["Loan Amount", `₹${input.Loan_Amount.toLocaleString()}`],
              ["Term", `${input.Loan_Term_Months} mo`],
              ["Existing EMI", `₹${input.Existing_EMI.toLocaleString()}`],
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
            <Link to="/loan-approval"><RotateCcw className="h-4 w-4 mr-2" /> Run another prediction</Link>
          </Button>
          <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Link to="/credit-risk">Assess Credit Risk →</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

const ReasonPanel = ({ title, items, tone, icon, empty }: { title: string; items?: string[]; tone: "success" | "danger"; icon: React.ReactNode; empty: string }) => {
  const styles = tone === "success"
    ? { text: "text-success", dot: "bg-success", border: "border-success/20" }
    : { text: "text-destructive", dot: "bg-destructive", border: "border-destructive/20" };
  return (
    <div className={`glass-panel rounded-2xl p-6 border ${styles.border}`}>
      <div className={`flex items-center gap-2 mb-4 ${styles.text}`}>
        {icon}
        <h3 className="font-semibold tracking-wide uppercase text-xs">{title}</h3>
      </div>
      {items && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((s, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 text-sm leading-snug"
            >
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
              <span className="text-foreground/90">{s}</span>
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
};

export default LoanApprovalResult;
