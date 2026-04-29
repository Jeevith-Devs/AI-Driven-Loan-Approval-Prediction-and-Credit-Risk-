import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, Home, FileText } from "lucide-react";
import { Wizard, type WizardStep } from "@/components/Wizard";
import { BigNumber, BigChoice } from "@/components/BigInputs";
import { PageHeader } from "@/pages/LoanApproval";
import { predictCreditRisk, type CreditRiskPayload } from "@/lib/api";
import { toast } from "sonner";

const EMPLOYMENT = ["Salaried", "Self-Employed", "Business", "Unemployed", "Retired"].map(v => ({ value: v, label: v }));
const RESIDENCE = ["Owned", "Rented", "Mortgaged", "Family"].map(v => ({ value: v, label: v }));
const LOAN_TYPES = ["Personal", "Home", "Auto", "Education", "Business"].map(v => ({ value: v, label: v }));
const PRIOR = [{ value: "0", label: "No" }, { value: "1", label: "Yes" }];

const STORAGE_KEY = "credit_risk_result";

const initial: CreditRiskPayload = {
  Age: 35, Employment_Status: "Salaried", Employment_Years: 8, Residence_Status: "Owned", Dependents: 2,
  Loan_Type: "Home", Annual_Income: 1500000, Monthly_Expenses: 45000, Savings_Balance: 300000,
  Assets_Value: 4000000, Collateral_Value: 3000000, CIBIL_Score: 720, Credit_History_Years: 9,
  Credit_Utilization_Ratio: 0.32, Recent_Credit_Inquiries: 1, Existing_Loan_Count: 1, Existing_EMI: 12000,
  Delinquency_Count: 0, Missed_Payment_Count: 0, Prior_Default_Flag: 0, Loan_Amount: 2500000, Loan_Term_Months: 120,
};

const CreditRisk = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<CreditRiskPayload>(initial);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof CreditRiskPayload>(k: K) => (v: CreditRiskPayload[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  useEffect(() => { sessionStorage.removeItem(STORAGE_KEY); }, []);

  const steps: WizardStep[] = [
    { key: "Age", group: "Personal Details", label: "Applicant age?", render: () => <BigNumber value={data.Age} onChange={set("Age")} suffix="years" min={18} />, isValid: () => data.Age >= 18 },
    { key: "Employment_Status", group: "Personal Details", label: "Employment status?", render: () => <BigChoice value={data.Employment_Status} onChange={set("Employment_Status")} options={EMPLOYMENT.map(o => ({ ...o, icon: <Briefcase className="h-5 w-5" /> }))} /> },
    { key: "Employment_Years", group: "Personal Details", label: "Years of employment?", render: () => <BigNumber value={data.Employment_Years} onChange={set("Employment_Years")} suffix="years" min={0} /> },
    { key: "Residence_Status", group: "Personal Details", label: "Residence status?", render: () => <BigChoice value={data.Residence_Status} onChange={set("Residence_Status")} options={RESIDENCE.map(o => ({ ...o, icon: <Home className="h-5 w-5" /> }))} /> },
    { key: "Dependents", group: "Personal Details", label: "Dependents?", render: () => <BigNumber value={data.Dependents} onChange={set("Dependents")} suffix="people" min={0} /> },
    { key: "Loan_Type", group: "Personal Details", label: "Loan type?", render: () => <BigChoice value={data.Loan_Type} onChange={set("Loan_Type")} options={LOAN_TYPES.map(o => ({ ...o, icon: <FileText className="h-5 w-5" /> }))} /> },

    { key: "Annual_Income", group: "Financial Profile", label: "Annual income?", render: () => <BigNumber value={data.Annual_Income} onChange={set("Annual_Income")} prefix="₹" min={0} /> },
    { key: "Monthly_Expenses", group: "Financial Profile", label: "Monthly expenses?", render: () => <BigNumber value={data.Monthly_Expenses} onChange={set("Monthly_Expenses")} prefix="₹" min={0} /> },
    { key: "Savings_Balance", group: "Financial Profile", label: "Savings balance?", render: () => <BigNumber value={data.Savings_Balance} onChange={set("Savings_Balance")} prefix="₹" min={0} /> },
    { key: "Assets_Value", group: "Financial Profile", label: "Assets value?", render: () => <BigNumber value={data.Assets_Value} onChange={set("Assets_Value")} prefix="₹" min={0} /> },
    { key: "Collateral_Value", group: "Financial Profile", label: "Collateral value?", hint: "Value pledged as collateral.", render: () => <BigNumber value={data.Collateral_Value} onChange={set("Collateral_Value")} prefix="₹" min={0} /> },
    { key: "Existing_EMI", group: "Financial Profile", label: "Existing monthly EMI?", render: () => <BigNumber value={data.Existing_EMI} onChange={set("Existing_EMI")} prefix="₹" min={0} /> },

    { key: "CIBIL_Score", group: "Credit History", label: "CIBIL score?", hint: "Range 300 – 900.", render: () => <BigNumber value={data.CIBIL_Score} onChange={set("CIBIL_Score")} min={300} />, isValid: () => data.CIBIL_Score >= 300 && data.CIBIL_Score <= 900 },
    { key: "Credit_History_Years", group: "Credit History", label: "Credit history length?", render: () => <BigNumber value={data.Credit_History_Years} onChange={set("Credit_History_Years")} suffix="years" min={0} /> },
    { key: "Credit_Utilization_Ratio", group: "Credit History", label: "Credit utilization ratio?", hint: "Decimal between 0.0 and 1.0.", render: () => <BigNumber value={data.Credit_Utilization_Ratio} onChange={set("Credit_Utilization_Ratio")} min={0} />, isValid: () => data.Credit_Utilization_Ratio >= 0 && data.Credit_Utilization_Ratio <= 1 },
    { key: "Recent_Credit_Inquiries", group: "Credit History", label: "Recent credit inquiries?", render: () => <BigNumber value={data.Recent_Credit_Inquiries} onChange={set("Recent_Credit_Inquiries")} min={0} /> },
    { key: "Existing_Loan_Count", group: "Credit History", label: "Existing loans?", render: () => <BigNumber value={data.Existing_Loan_Count} onChange={set("Existing_Loan_Count")} min={0} /> },
    { key: "Delinquency_Count", group: "Credit History", label: "Delinquency count?", render: () => <BigNumber value={data.Delinquency_Count} onChange={set("Delinquency_Count")} min={0} /> },
    { key: "Missed_Payment_Count", group: "Credit History", label: "Missed payments?", render: () => <BigNumber value={data.Missed_Payment_Count} onChange={set("Missed_Payment_Count")} min={0} /> },
    { key: "Prior_Default_Flag", group: "Credit History", label: "Prior default on record?", render: () => <BigChoice value={String(data.Prior_Default_Flag)} onChange={(v) => set("Prior_Default_Flag")(Number(v))} options={PRIOR} /> },

    { key: "Loan_Amount", group: "Loan Details", label: "Loan amount requested?", render: () => <BigNumber value={data.Loan_Amount} onChange={set("Loan_Amount")} prefix="₹" min={1} />, isValid: () => data.Loan_Amount > 0 },
    { key: "Loan_Term_Months", group: "Loan Details", label: "Loan term?", render: () => <BigNumber value={data.Loan_Term_Months} onChange={set("Loan_Term_Months")} suffix="months" min={1} />, isValid: () => data.Loan_Term_Months >= 1 },
  ];

  const submit = async () => {
    setLoading(true);
    try {
      const r = await predictCreditRisk(data);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ result: r, input: data }));
      toast.success("Risk assessment complete");
      navigate("/credit-risk/result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assessment failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="container py-10">
      <PageHeader
        eyebrow="Workflow · Risk Modeling"
        title="Credit Risk Assessment"
        subtitle="Answer one question at a time. We'll quantify probability of default and assign a risk band."
      />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
        <Wizard steps={steps} onSubmit={submit} submitting={loading} submitLabel="Assess Risk" />
      </motion.div>
    </div>
  );
};

export default CreditRisk;
