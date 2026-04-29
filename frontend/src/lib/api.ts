// API client for the Python ML backend
export const API_BASE = "http://127.0.0.1:5000";

export interface LoanApprovalPayload {
  Age: number;
  Employment_Status: string;
  Employment_Years: number;
  Residence_Status: string;
  Dependents: number;
  Loan_Type: string;
  Annual_Income: number;
  Monthly_Expenses: number;
  Savings_Balance: number;
  Assets_Value: number;
  CIBIL_Score: number;
  Credit_History_Years: number;
  Other_Credit_Count: number;
  Other_Credit_Amount: number;
  Existing_EMI: number;
  Late_Payment_Count: number;
  Missed_Payment_Count: number;
  Late_Credit_Close_Count: number;
  Loan_Amount: number;
  Loan_Term_Months: number;
}

export interface LoanApprovalResult {
  prediction?: string;
  approved?: boolean;
  probability?: number;
  confidence?: number;
  strengths?: string[];
  concerns?: string[];
  [k: string]: unknown;
}

export interface CreditRiskPayload {
  Age: number;
  Employment_Status: string;
  Employment_Years: number;
  Residence_Status: string;
  Dependents: number;
  Loan_Type: string;
  Annual_Income: number;
  Monthly_Expenses: number;
  Savings_Balance: number;
  Assets_Value: number;
  Collateral_Value: number;
  CIBIL_Score: number;
  Credit_History_Years: number;
  Credit_Utilization_Ratio: number;
  Recent_Credit_Inquiries: number;
  Existing_Loan_Count: number;
  Existing_EMI: number;
  Delinquency_Count: number;
  Missed_Payment_Count: number;
  Prior_Default_Flag: number;
  Loan_Amount: number;
  Loan_Term_Months: number;
}

export interface CreditRiskResult {
  risk_level?: string;
  risk_band?: string;
  probability_of_default?: number;
  pd?: number;
  explanation?: string;
  reason_codes?: string[];
  [k: string]: unknown;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${path} failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const checkHealth = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
};

export const predictLoanApproval = (payload: LoanApprovalPayload) =>
  postJSON<LoanApprovalResult>("/api/loan-approval", payload);

export const predictCreditRisk = (payload: CreditRiskPayload) =>
  postJSON<CreditRiskResult>("/api/credit-risk", payload);
