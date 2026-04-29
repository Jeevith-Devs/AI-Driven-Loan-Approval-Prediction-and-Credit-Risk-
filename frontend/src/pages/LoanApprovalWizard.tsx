import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Wallet, FileText, History, Briefcase, Home, Users, Calendar, CreditCard } from "lucide-react";
import { Wizard, type WizardStep } from "@/components/Wizard";
import { BigNumber, BigChoice, BigSelect } from "@/components/BigInputs";
import { PageHeader } from "@/pages/LoanApproval";
import { predictLoanApproval, type LoanApprovalPayload } from "@/lib/api";
import { toast } from "sonner";

const EMPLOYMENT = [
  { value: "Salaried", label: "Salaried" },
  { value: "Self-Employed", label: "Self-Employed" },
  { value: "Business", label: "Business" },
  { value: "Unemployed", label: "Unemployed" },
  { value: "Retired", label: "Retired" },
];
const RESIDENCE = [
  { value: "Owned", label: "Owned" },
  { value: "Rented", label: "Rented" },
  { value: "Mortgaged", label: "Mortgaged" },
  { value: "Family", label: "Family" },
];
const LOAN_TYPES = [
  { value: "Personal", label: "Personal" },
  { value: "Home", label: "Home" },
  { value: "Auto", label: "Auto" },
  { value: "Education", label: "Education" },
  { value: "Business", label: "Business" },
];

const STORAGE_KEY = "loan_approval_result";

const initial: LoanApprovalPayload = {
  Age: 32, Employment_Status: "Salaried", Employment_Years: 6, Residence_Status: "Owned", Dependents: 1,
  Loan_Type: "Personal", Annual_Income: 1200000, Monthly_Expenses: 35000, Savings_Balance: 250000,
  Assets_Value: 1500000, CIBIL_Score: 750, Credit_History_Years: 7, Other_Credit_Count: 1,
  Other_Credit_Amount: 50000, Existing_EMI: 8000, Late_Payment_Count: 0, Missed_Payment_Count: 0,
  Late_Credit_Close_Count: 0, Loan_Amount: 500000, Loan_Term_Months: 36,
};

const LoanApproval = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LoanApprovalPayload>(initial);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof LoanApprovalPayload>(k: K) => (v: LoanApprovalPayload[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  useEffect(() => { sessionStorage.removeItem(STORAGE_KEY); }, []);

  const steps: WizardStep[] = [
    // Personal Details
    { key: "Age", group: "Personal Details", label: "What is the applicant's age?", hint: "Must be 18 or older.",
      render: () => <BigNumber value={data.Age} onChange={set("Age")} suffix="years" min={18} />,
      isValid: () => data.Age >= 18 },
    { key: "Employment_Status", group: "Personal Details", label: "Employment status?",
      render: () => <BigChoice value={data.Employment_Status} onChange={set("Employment_Status")} options={EMPLOYMENT.map(o => ({ ...o, icon: <Briefcase className="h-5 w-5" /> }))} /> },
    { key: "Employment_Years", group: "Personal Details", label: "Years of employment?",
      render: () => <BigNumber value={data.Employment_Years} onChange={set("Employment_Years")} suffix="years" min={0} /> },
    { key: "Residence_Status", group: "Personal Details", label: "Residence status?",
      render: () => <BigChoice value={data.Residence_Status} onChange={set("Residence_Status")} options={RESIDENCE.map(o => ({ ...o, icon: <Home className="h-5 w-5" /> }))} /> },
    { key: "Dependents", group: "Personal Details", label: "Number of dependents?",
      render: () => <BigNumber value={data.Dependents} onChange={set("Dependents")} suffix="people" min={0} /> },
    { key: "Loan_Type", group: "Personal Details", label: "Type of loan?",
      render: () => <BigChoice value={data.Loan_Type} onChange={set("Loan_Type")} options={LOAN_TYPES.map(o => ({ ...o, icon: <FileText className="h-5 w-5" /> }))} /> },

    // Financial
    { key: "Annual_Income", group: "Financial Profile", label: "Annual income?", hint: "Gross annual income in ₹.",
      render: () => <BigNumber value={data.Annual_Income} onChange={set("Annual_Income")} prefix="₹" min={0} /> },
    { key: "Monthly_Expenses", group: "Financial Profile", label: "Monthly expenses?",
      render: () => <BigNumber value={data.Monthly_Expenses} onChange={set("Monthly_Expenses")} prefix="₹" min={0} /> },
    { key: "Savings_Balance", group: "Financial Profile", label: "Savings balance?",
      render: () => <BigNumber value={data.Savings_Balance} onChange={set("Savings_Balance")} prefix="₹" min={0} /> },
    { key: "Assets_Value", group: "Financial Profile", label: "Total assets value?",
      render: () => <BigNumber value={data.Assets_Value} onChange={set("Assets_Value")} prefix="₹" min={0} /> },

    // Credit History
    { key: "CIBIL_Score", group: "Credit History", label: "CIBIL score?", hint: "Range 300 – 900.",
      render: () => <BigNumber value={data.CIBIL_Score} onChange={set("CIBIL_Score")} min={300} />,
      isValid: () => data.CIBIL_Score >= 300 && data.CIBIL_Score <= 900 },
    { key: "Credit_History_Years", group: "Credit History", label: "Credit history length?",
      render: () => <BigNumber value={data.Credit_History_Years} onChange={set("Credit_History_Years")} suffix="years" min={0} /> },
    { key: "Other_Credit_Count", group: "Credit History", label: "Other active credit accounts?",
      render: () => <BigNumber value={data.Other_Credit_Count} onChange={set("Other_Credit_Count")} min={0} /> },
    { key: "Other_Credit_Amount", group: "Credit History", label: "Total other credit amount?",
      render: () => <BigNumber value={data.Other_Credit_Amount} onChange={set("Other_Credit_Amount")} prefix="₹" min={0} /> },
    { key: "Existing_EMI", group: "Credit History", label: "Existing monthly EMI?",
      render: () => <BigNumber value={data.Existing_EMI} onChange={set("Existing_EMI")} prefix="₹" min={0} /> },
    { key: "Late_Payment_Count", group: "Credit History", label: "Late payments in last 12 months?",
      render: () => <BigNumber value={data.Late_Payment_Count} onChange={set("Late_Payment_Count")} min={0} /> },
    { key: "Missed_Payment_Count", group: "Credit History", label: "Missed payments?",
      render: () => <BigNumber value={data.Missed_Payment_Count} onChange={set("Missed_Payment_Count")} min={0} /> },
    { key: "Late_Credit_Close_Count", group: "Credit History", label: "Late credit closures?",
      render: () => <BigNumber value={data.Late_Credit_Close_Count} onChange={set("Late_Credit_Close_Count")} min={0} /> },

    // Loan
    { key: "Loan_Amount", group: "Loan Details", label: "Requested loan amount?",
      render: () => <BigNumber value={data.Loan_Amount} onChange={set("Loan_Amount")} prefix="₹" min={1} />,
      isValid: () => data.Loan_Amount > 0 },
    { key: "Loan_Term_Months", group: "Loan Details", label: "Loan term?", hint: "Repayment term in months.",
      render: () => <BigNumber value={data.Loan_Term_Months} onChange={set("Loan_Term_Months")} suffix="months" min={1} />,
      isValid: () => data.Loan_Term_Months >= 1 },
  ];

  const submit = async () => {
    setLoading(true);
    try {
      const r = await predictLoanApproval(data);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ result: r, input: data }));
      toast.success("Prediction complete");
      navigate("/loan-approval/result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prediction failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="container py-10">
      <PageHeader
        eyebrow="Workflow · Decisioning"
        title="Loan Approval Prediction"
        subtitle="Answer one question at a time. We'll generate an approve/reject recommendation with explainable drivers."
      />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
        <Wizard steps={steps} onSubmit={submit} submitting={loading} submitLabel="Predict Approval" />
      </motion.div>
    </div>
  );
};

export default LoanApproval;
