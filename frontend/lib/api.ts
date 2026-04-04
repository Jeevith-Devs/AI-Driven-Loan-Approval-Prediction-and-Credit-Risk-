export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";

type ModelHealth = {
  loaded: boolean;
  model_path: string;
  error: string | null;
};

export type BackendHealth = {
  status: string;
  loan_approval: ModelHealth;
  credit_risk: ModelHealth;
};

export type LoanPrediction = {
  decision: string;
  approval_probability_percent: number;
  rejection_probability_percent: number;
  bank_recommendation: string;
  risk_level: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  key_metrics: {
    loan_type: string;
    cibil_score: number;
    debt_to_income_ratio_percent: number;
    obligation_to_income_ratio_percent: number;
    asset_to_loan_ratio: number;
    disposable_income: number;
    requested_emi: number;
    credit_history_years: number;
  };
};

export type CreditPrediction = {
  default_probability_percent: number;
  creditworthiness_percent: number;
  risk_band: string;
  bank_recommendation: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  key_metrics: {
    loan_type: string;
    cibil_score: number;
    credit_utilization_percent: number;
    debt_to_income_percent: number;
    loan_to_income_ratio: number;
    collateral_coverage_ratio: number;
    emergency_buffer_months: number;
    credit_history_years: number;
  };
};

export type PredictionEnvelope<TPrediction> = {
  input: Record<string, unknown>;
  prediction: TPrediction;
};

async function readJson(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function postPrediction<TPrediction>(
  endpoint: string,
  payload: Record<string, string>,
): Promise<PredictionEnvelope<TPrediction>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await readJson(response);

  if (!response.ok) {
    const message =
      typeof body.error === "string" ? body.error : "Python backend rejected the request.";
    throw new Error(message);
  }

  return body as PredictionEnvelope<TPrediction>;
}

export async function fetchBackendHealth(): Promise<BackendHealth> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: "GET",
  });

  const body = await readJson(response);
  if (!response.ok) {
    const message =
      typeof body.error === "string" ? body.error : "Unable to read backend health status.";
    throw new Error(message);
  }

  return body as BackendHealth;
}
