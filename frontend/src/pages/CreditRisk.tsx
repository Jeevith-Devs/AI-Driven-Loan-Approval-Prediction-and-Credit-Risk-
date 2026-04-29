import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Wallet, FileText, History, Loader2, Sparkles, ShieldAlert, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldGroup, NumberField, SelectField } from "@/components/Field";
import { predictCreditRisk, type CreditRiskPayload, type CreditRiskResult } from "@/lib/api";
import { PageHeader, ReasonList } from "./LoanApproval";
import { toast } from "sonner";
import Loader from "@/components/kokonutui/loader";

const EMPLOYMENT = ["Salaried", "Self-Employed", "Business", "Unemployed", "Retired"].map(v => ({ value: v, label: v }));
const RESIDENCE = ["Owned", "Rented", "Mortgaged", "Family"].map(v => ({ value: v, label: v }));
const LOAN_TYPES = ["Personal", "Home", "Auto", "Education", "Business"].map(v => ({ value: v, label: v }));
const PRIOR = [{ value: "0", label: "No" }, { value: "1", label: "Yes" }];

const initial: CreditRiskPayload = {
  Age: 35, Employment_Status: "Salaried", Employment_Years: 8, Residence_Status: "Owned", Dependents: 2,
  Loan_Type: "Home", Annual_Income: 1500000, Monthly_Expenses: 45000, Savings_Balance: 300000,
  Assets_Value: 4000000, Collateral_Value: 3000000, CIBIL_Score: 720, Credit_History_Years: 9,
  Credit_Utilization_Ratio: 0.32, Recent_Credit_Inquiries: 1, Existing_Loan_Count: 1, Existing_EMI: 12000,
  Delinquency_Count: 0, Missed_Payment_Count: 0, Prior_Default_Flag: 0, Loan_Amount: 2500000, Loan_Term_Months: 120,
};

const CreditRisk = () => {
  const [data, setData] = useState<CreditRiskPayload>(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreditRiskResult | null>(null);

  const update = <K extends keyof CreditRiskPayload>(k: K, v: CreditRiskPayload[K]) =>
    setData(d => ({ ...d, [k]: v }));

  const submit = async () => {
    setLoading(true); setResult(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const r = await predictCreditRisk(data);
      setResult(r);
      toast.success("Risk assessment complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assessment failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="container py-10">
      <PageHeader
        eyebrow="Workflow · Risk Modeling"
        title="Credit Risk Assessment"
        subtitle="Quantify probability of default, assign a risk band, and surface borrower-quality reason codes."
      />

      <div className="grid lg:grid-cols-[1fr_420px] gap-6 mt-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <FieldGroup title="Personal Details" icon={<User className="h-4 w-4" />}>
            <NumberField label="Age" value={data.Age} onChange={v => update("Age", v)} min={18} />
            <SelectField label="Employment Status" value={data.Employment_Status} onChange={v => update("Employment_Status", v)} options={EMPLOYMENT} />
            <NumberField label="Employment Years" value={data.Employment_Years} onChange={v => update("Employment_Years", v)} />
            <SelectField label="Residence Status" value={data.Residence_Status} onChange={v => update("Residence_Status", v)} options={RESIDENCE} />
            <NumberField label="Dependents" value={data.Dependents} onChange={v => update("Dependents", v)} />
            <SelectField label="Loan Type" value={data.Loan_Type} onChange={v => update("Loan_Type", v)} options={LOAN_TYPES} />
          </FieldGroup>

          <FieldGroup title="Financial Profile" icon={<Wallet className="h-4 w-4" />}>
            <NumberField label="Annual Income" value={data.Annual_Income} onChange={v => update("Annual_Income", v)} />
            <NumberField label="Monthly Expenses" value={data.Monthly_Expenses} onChange={v => update("Monthly_Expenses", v)} />
            <NumberField label="Savings Balance" value={data.Savings_Balance} onChange={v => update("Savings_Balance", v)} />
            <NumberField label="Assets Value" value={data.Assets_Value} onChange={v => update("Assets_Value", v)} />
            <NumberField label="Collateral Value" value={data.Collateral_Value} onChange={v => update("Collateral_Value", v)} />
            <NumberField label="Existing EMI" value={data.Existing_EMI} onChange={v => update("Existing_EMI", v)} />
          </FieldGroup>

          <FieldGroup title="Credit History" icon={<History className="h-4 w-4" />}>
            <NumberField label="CIBIL Score" value={data.CIBIL_Score} onChange={v => update("CIBIL_Score", v)} min={300} />
            <NumberField label="Credit History Years" value={data.Credit_History_Years} onChange={v => update("Credit_History_Years", v)} />
            <NumberField label="Credit Utilization Ratio" value={data.Credit_Utilization_Ratio} onChange={v => update("Credit_Utilization_Ratio", v)} step={0.01} hint="0.0 – 1.0" />
            <NumberField label="Recent Credit Inquiries" value={data.Recent_Credit_Inquiries} onChange={v => update("Recent_Credit_Inquiries", v)} />
            <NumberField label="Existing Loan Count" value={data.Existing_Loan_Count} onChange={v => update("Existing_Loan_Count", v)} />
            <NumberField label="Delinquency Count" value={data.Delinquency_Count} onChange={v => update("Delinquency_Count", v)} />
            <NumberField label="Missed Payment Count" value={data.Missed_Payment_Count} onChange={v => update("Missed_Payment_Count", v)} />
            <SelectField label="Prior Default Flag" value={String(data.Prior_Default_Flag)} onChange={v => update("Prior_Default_Flag", Number(v))} options={PRIOR} />
          </FieldGroup>

          <FieldGroup title="Loan Details" icon={<FileText className="h-4 w-4" />}>
            <NumberField label="Loan Amount" value={data.Loan_Amount} onChange={v => update("Loan_Amount", v)} />
            <NumberField label="Loan Term (Months)" value={data.Loan_Term_Months} onChange={v => update("Loan_Term_Months", v)} />
          </FieldGroup>

          <Button onClick={submit} disabled={loading} size="lg" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scoring risk…</> : <><Sparkles className="mr-2 h-4 w-4" /> Assess Credit Risk</>}
          </Button>
        </motion.div>

        <RiskPanel loading={loading} result={result} />
      </div>
    </div>
  );
};

const bandTone = (band: string): "success" | "warning" | "danger" => {
  const b = band.toLowerCase();
  if (/(low|a|prime|excellent|good)/.test(b)) return "success";
  if (/(high|d|e|poor|severe|sub)/.test(b)) return "danger";
  return "warning";
};

const RiskPanel = ({ loading, result }: { loading: boolean; result: CreditRiskResult | null }) => {
  const pd = result ? (result.probability_of_default ?? result.pd) : undefined;
  const pdPct = typeof pd === "number" ? pd * (pd <= 1 ? 100 : 1) : undefined;
  const band = result?.risk_band ?? result?.risk_level ?? "";
  const tone = band ? bandTone(band) : "warning";
  const toneStyles = {
    success: { bg: "bg-success/10", border: "border-success/30", text: "text-success", glow: "shadow-glow-success", grad: "bg-gradient-success" },
    warning: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", glow: "", grad: "bg-warning" },
    danger: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", glow: "shadow-glow-danger", grad: "bg-gradient-danger" },
  }[tone];

  return (
    <div className="lg:sticky lg:top-24 h-fit">
      <div className="glass-panel rounded-2xl p-6 min-h-[420px]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold tracking-wide">Risk Dashboard</h2>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live</span>
        </div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-10">
              <Loader title="Scoring Risk..." subtitle="Evaluating default probability" size="md" />
            </motion.div>
          )}

          {!loading && !result && (
            <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="mx-auto h-14 w-14 rounded-full bg-muted/50 grid place-items-center mb-4">
                <ShieldAlert className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Run the assessment to view risk metrics.</p>
            </motion.div>
          )}

          {!loading && result && (
            <motion.div key="r" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className={`rounded-xl p-5 border ${toneStyles.bg} ${toneStyles.border} ${toneStyles.glow}`}>
                <div className="flex items-center gap-3">
                  <ShieldAlert className={`h-7 w-7 ${toneStyles.text}`} />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Risk Band</div>
                    <div className={`text-2xl font-bold ${toneStyles.text}`}>{band || "—"}</div>
                  </div>
                </div>
              </div>

              {typeof pdPct === "number" && (
                <div className="rounded-xl p-5 glass-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Probability of Default</span>
                    </div>
                    <span className={`text-xl font-bold font-mono ${toneStyles.text}`}>{pdPct.toFixed(2)}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-background/70 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pdPct, 100)}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                      className={`h-full ${toneStyles.grad}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>
              )}

              {result.explanation && (
                <div className="rounded-xl p-4 bg-muted/30 border border-border/60">
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Explanation</div>
                  <p className="text-sm leading-relaxed text-foreground/90">{result.explanation}</p>
                </div>
              )}

              <ReasonList title="Reason Codes" items={result.reason_codes} tone={tone} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CreditRisk;
