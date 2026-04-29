import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Wallet, FileText, History, Loader2, CheckCircle2, XCircle, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldGroup, NumberField, SelectField } from "@/components/Field";
import { predictLoanApproval, type LoanApprovalPayload, type LoanApprovalResult } from "@/lib/api";
import { toast } from "sonner";
import Loader from "@/components/kokonutui/loader";

const EMPLOYMENT = ["Salaried", "Self-Employed", "Business", "Unemployed", "Retired"].map(v => ({ value: v, label: v }));
const RESIDENCE = ["Owned", "Rented", "Mortgaged", "Family"].map(v => ({ value: v, label: v }));
const LOAN_TYPES = ["Personal", "Home", "Auto", "Education", "Business"].map(v => ({ value: v, label: v }));

const initial: LoanApprovalPayload = {
  Age: 32, Employment_Status: "Salaried", Employment_Years: 6, Residence_Status: "Owned", Dependents: 1,
  Loan_Type: "Personal", Annual_Income: 1200000, Monthly_Expenses: 35000, Savings_Balance: 250000,
  Assets_Value: 1500000, CIBIL_Score: 750, Credit_History_Years: 7, Other_Credit_Count: 1,
  Other_Credit_Amount: 50000, Existing_EMI: 8000, Late_Payment_Count: 0, Missed_Payment_Count: 0,
  Late_Credit_Close_Count: 0, Loan_Amount: 500000, Loan_Term_Months: 36,
};

const LoanApproval = () => {
  const [data, setData] = useState<LoanApprovalPayload>(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoanApprovalResult | null>(null);

  const update = <K extends keyof LoanApprovalPayload>(k: K, v: LoanApprovalPayload[K]) =>
    setData(d => ({ ...d, [k]: v }));

  const submit = async () => {
    setLoading(true); setResult(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const r = await predictLoanApproval(data);
      setResult(r);
      toast.success("Prediction complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prediction failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="container py-10">
      <PageHeader
        eyebrow="Workflow · Decisioning"
        title="Loan Approval Prediction"
        subtitle="Capture the applicant profile to generate an approve/reject recommendation with confidence and explainable drivers."
      />

      <div className="grid lg:grid-cols-[1fr_420px] gap-6 mt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <FieldGroup title="Personal Details" icon={<User className="h-4 w-4" />}>
            <NumberField label="Age" value={data.Age} onChange={v => update("Age", v)} min={18} />
            <SelectField label="Employment Status" value={data.Employment_Status} onChange={v => update("Employment_Status", v)} options={EMPLOYMENT} />
            <NumberField label="Employment Years" value={data.Employment_Years} onChange={v => update("Employment_Years", v)} min={0} />
            <SelectField label="Residence Status" value={data.Residence_Status} onChange={v => update("Residence_Status", v)} options={RESIDENCE} />
            <NumberField label="Dependents" value={data.Dependents} onChange={v => update("Dependents", v)} min={0} />
            <SelectField label="Loan Type" value={data.Loan_Type} onChange={v => update("Loan_Type", v)} options={LOAN_TYPES} />
          </FieldGroup>

          <FieldGroup title="Financial Profile" icon={<Wallet className="h-4 w-4" />}>
            <NumberField label="Annual Income" value={data.Annual_Income} onChange={v => update("Annual_Income", v)} hint="₹ per year" />
            <NumberField label="Monthly Expenses" value={data.Monthly_Expenses} onChange={v => update("Monthly_Expenses", v)} hint="₹ per month" />
            <NumberField label="Savings Balance" value={data.Savings_Balance} onChange={v => update("Savings_Balance", v)} />
            <NumberField label="Assets Value" value={data.Assets_Value} onChange={v => update("Assets_Value", v)} />
            <NumberField label="Existing EMI" value={data.Existing_EMI} onChange={v => update("Existing_EMI", v)} />
          </FieldGroup>

          <FieldGroup title="Credit History" icon={<History className="h-4 w-4" />}>
            <NumberField label="CIBIL Score" value={data.CIBIL_Score} onChange={v => update("CIBIL_Score", v)} min={300} />
            <NumberField label="Credit History Years" value={data.Credit_History_Years} onChange={v => update("Credit_History_Years", v)} min={0} />
            <NumberField label="Other Credit Count" value={data.Other_Credit_Count} onChange={v => update("Other_Credit_Count", v)} min={0} />
            <NumberField label="Other Credit Amount" value={data.Other_Credit_Amount} onChange={v => update("Other_Credit_Amount", v)} min={0} />
            <NumberField label="Late Payment Count" value={data.Late_Payment_Count} onChange={v => update("Late_Payment_Count", v)} min={0} />
            <NumberField label="Missed Payment Count" value={data.Missed_Payment_Count} onChange={v => update("Missed_Payment_Count", v)} min={0} />
            <NumberField label="Late Credit Close Count" value={data.Late_Credit_Close_Count} onChange={v => update("Late_Credit_Close_Count", v)} min={0} />
          </FieldGroup>

          <FieldGroup title="Loan Details" icon={<FileText className="h-4 w-4" />}>
            <NumberField label="Loan Amount" value={data.Loan_Amount} onChange={v => update("Loan_Amount", v)} min={0} />
            <NumberField label="Loan Term (Months)" value={data.Loan_Term_Months} onChange={v => update("Loan_Term_Months", v)} min={1} />
          </FieldGroup>

          <Button onClick={submit} disabled={loading} size="lg" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running model…</> : <><Sparkles className="mr-2 h-4 w-4" /> Predict Approval</>}
          </Button>
        </motion.div>

        <ResultPanel loading={loading} result={result} />
      </div>
    </div>
  );
};

export const PageHeader = ({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) => (
  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
    <div className="text-xs uppercase tracking-[0.25em] text-primary mb-2">{eyebrow}</div>
    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
    <p className="text-muted-foreground mt-2 max-w-3xl">{subtitle}</p>
  </motion.div>
);

const ResultPanel = ({ loading, result }: { loading: boolean; result: LoanApprovalResult | null }) => {
  const approved = result ? (result.approved ?? /approve|sanction|yes|1/i.test(String(result.prediction ?? ""))) : null;
  const prob = result?.probability ?? result?.confidence;

  return (
    <div className="lg:sticky lg:top-24 h-fit">
      <div className="glass-panel rounded-2xl p-6 min-h-[420px]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold tracking-wide">Decision Output</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live</span>
        </div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-10">
              <Loader title="Analyzing Profile..." subtitle="Running machine learning models" size="md" />
            </motion.div>
          )}

          {!loading && !result && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="mx-auto h-14 w-14 rounded-full bg-muted/50 grid place-items-center mb-4">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Submit the form to see the model's prediction here.</p>
            </motion.div>
          )}

          {!loading && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className={`rounded-xl p-5 border ${approved ? "bg-success/10 border-success/30 shadow-glow-success" : "bg-destructive/10 border-destructive/30 shadow-glow-danger"}`}>
                <div className="flex items-center gap-3 mb-2">
                  {approved ? <CheckCircle2 className="h-7 w-7 text-success" /> : <XCircle className="h-7 w-7 text-destructive" />}
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Recommendation</div>
                    <div className={`text-2xl font-bold ${approved ? "text-success" : "text-destructive"}`}>
                      {approved ? "Approved" : "Rejected"}
                    </div>
                  </div>
                </div>
                {typeof prob === "number" && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className="font-mono font-semibold">{(prob * (prob <= 1 ? 100 : 1)).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-background/60 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${prob * (prob <= 1 ? 100 : 1)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full ${approved ? "bg-gradient-success" : "bg-gradient-danger"}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <ReasonList title="Strengths" items={result.strengths} tone="success" />
              <ReasonList title="Concerns" items={result.concerns} tone="danger" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const ReasonList = ({ title, items, tone }: { title: string; items?: string[]; tone: "success" | "danger" | "warning" }) => {
  if (!items || items.length === 0) return null;
  const styles = {
    success: { dot: "bg-success", text: "text-success", icon: CheckCircle2 },
    danger: { dot: "bg-destructive", text: "text-destructive", icon: AlertTriangle },
    warning: { dot: "bg-warning", text: "text-warning", icon: AlertTriangle },
  }[tone];
  const Icon = styles.icon;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${styles.text}`} />
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
            <span className="text-foreground/90">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LoanApproval;
