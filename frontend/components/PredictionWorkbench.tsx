"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  API_BASE_URL,
  postPrediction,
  type CreditPrediction,
  type LoanPrediction,
  type PredictionEnvelope,
} from "@/lib/api";
import { buildInitialValues, type FieldConfig } from "@/lib/forms";

type PredictionMode = "loan" | "credit";

type PredictionWorkbenchProps = {
  endpoint: string;
  fields: FieldConfig[];
  eyebrow: string;
  title: string;
  description: string;
  mode: PredictionMode;
};

type DisplayCard = {
  label: string;
  value: string;
};

type DisplayModel = {
  badge: string;
  tone: "tone-approve" | "tone-review" | "tone-reject";
  headline: string;
  headlineLabel: string;
  progress: number;
  summary: string;
  summaryCards: DisplayCard[];
  metricCards: DisplayCard[];
  strengthsTitle: string;
  concernsTitle: string;
  strengths: string[];
  concerns: string[];
};

function buildSections(fields: FieldConfig[]) {
  const sections = new Map<string, FieldConfig[]>();
  for (const field of fields) {
    const bucket = sections.get(field.section) ?? [];
    bucket.push(field);
    sections.set(field.section, bucket);
  }
  return Array.from(sections.entries());
}

function buildLoanDisplay(prediction: LoanPrediction): DisplayModel {
  const tone =
    prediction.decision === "Rejected"
      ? "tone-reject"
      : prediction.bank_recommendation === "Approve With Conditions" ||
          prediction.bank_recommendation === "Manual Review"
        ? "tone-review"
        : "tone-approve";

  return {
    badge: prediction.decision,
    tone,
    headline: `${prediction.approval_probability_percent}%`,
    headlineLabel: "Estimated probability that the applicant can close the loan on time.",
    progress: prediction.approval_probability_percent,
    summary: prediction.summary,
    summaryCards: [
      { label: "Recommendation", value: prediction.bank_recommendation },
      { label: "Risk level", value: prediction.risk_level },
      { label: "Approval chance", value: `${prediction.approval_probability_percent}%` },
      { label: "Rejection chance", value: `${prediction.rejection_probability_percent}%` },
    ],
    metricCards: [
      { label: "Loan type", value: prediction.key_metrics.loan_type },
      { label: "CIBIL score", value: String(prediction.key_metrics.cibil_score) },
      {
        label: "Debt to income",
        value: `${prediction.key_metrics.debt_to_income_ratio_percent}%`,
      },
      {
        label: "Disposable income",
        value: String(prediction.key_metrics.disposable_income),
      },
    ],
    strengthsTitle: "Approval Drivers",
    concernsTitle: "Risk Flags",
    strengths: prediction.strengths,
    concerns: prediction.concerns,
  };
}

function buildCreditDisplay(prediction: CreditPrediction): DisplayModel {
  const tone =
    prediction.risk_band === "High"
      ? "tone-reject"
      : prediction.risk_band === "Medium"
        ? "tone-review"
        : "tone-approve";

  return {
    badge: `${prediction.risk_band} Risk`,
    tone,
    headline: `${prediction.default_probability_percent}%`,
    headlineLabel: "Estimated probability that the borrower could default.",
    progress: Math.min(prediction.default_probability_percent, 100),
    summary: prediction.summary,
    summaryCards: [
      { label: "Recommendation", value: prediction.bank_recommendation },
      { label: "Risk band", value: prediction.risk_band },
      { label: "Default probability", value: `${prediction.default_probability_percent}%` },
      { label: "Creditworthiness", value: `${prediction.creditworthiness_percent}%` },
    ],
    metricCards: [
      { label: "Loan type", value: prediction.key_metrics.loan_type },
      { label: "CIBIL score", value: String(prediction.key_metrics.cibil_score) },
      {
        label: "Utilization",
        value: `${prediction.key_metrics.credit_utilization_percent}%`,
      },
      { label: "Debt to income", value: `${prediction.key_metrics.debt_to_income_percent}%` },
    ],
    strengthsTitle: "Stabilizing Factors",
    concernsTitle: "Risk Factors",
    strengths: prediction.strengths,
    concerns: prediction.concerns,
  };
}

export function PredictionWorkbench({
  endpoint,
  fields,
  eyebrow,
  title,
  description,
  mode,
}: PredictionWorkbenchProps) {
  const [values, setValues] = useState<Record<string, string>>(buildInitialValues(fields));
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionEnvelope<LoanPrediction | CreditPrediction> | null>(null);

  const sections = useMemo(() => buildSections(fields), [fields]);
  const display = result
    ? mode === "loan"
      ? buildLoanDisplay(result.prediction as LoanPrediction)
      : buildCreditDisplay(result.prediction as CreditPrediction)
    : null;

  function handleChange(fieldName: string, fieldValue: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]: fieldValue,
    }));
  }

  function handleReset() {
    setValues(buildInitialValues(fields));
    setError("");
    setResult(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await postPrediction<LoanPrediction | CreditPrediction>(endpoint, values);
      setResult(response);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Prediction request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="site-shell">
      <nav className="top-nav">
        <div className="nav-title">Bank Risk Intelligence</div>
        <div className="nav-links">
          <Link className="nav-link" href="/">
            Dashboard
          </Link>
          <Link className={`nav-link ${mode === "loan" ? "active" : ""}`} href="/loan-approval">
            Loan Approval
          </Link>
          <Link className={`nav-link ${mode === "credit" ? "active" : ""}`} href="/credit-risk">
            Credit Risk
          </Link>
        </div>
      </nav>

      <section className="hero-panel">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="hero-copy">{description}</p>
      </section>

      <section className="workspace-grid">
        <section className="surface-card form-panel">
          <span className="card-kicker">Applicant Input</span>
          <h2>Enter the verified application details</h2>

          <form onSubmit={handleSubmit}>
            <div className="section-stack">
              {sections.map(([sectionName, sectionFields]) => (
                <div className="field-section" key={sectionName}>
                  <h3>{sectionName}</h3>
                  <div className="field-grid">
                    {sectionFields.map((field) => (
                      <div className="field" key={field.name}>
                        <label htmlFor={field.name}>{field.label}</label>
                        {field.widget === "select" ? (
                          <select
                            id={field.name}
                            name={field.name}
                            onChange={(event) => handleChange(field.name, event.target.value)}
                            value={values[field.name]}
                          >
                            {field.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={field.name}
                            name={field.name}
                            onChange={(event) => handleChange(field.name, event.target.value)}
                            step={field.step ?? "any"}
                            type="number"
                            value={values[field.name]}
                          />
                        )}
                        {field.helper ? <span className="field-help">{field.helper}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button className="submit-button" disabled={loading} type="submit">
                {loading ? "Running analysis..." : "Run analysis"}
              </button>
              <button className="reset-button" onClick={handleReset} type="button">
                Reset form
              </button>
            </div>
          </form>

          {error ? <div className="error-banner">{error}</div> : null}

          <div className="api-callout">
            Backend endpoint: <code>{`${API_BASE_URL}${endpoint}`}</code>
          </div>
        </section>

        <aside className="surface-card result-panel">
          {display ? (
            <>
              <div className={`result-badge ${display.tone}`}>{display.badge}</div>
              <div className="result-value">{display.headline}</div>
              <div className="result-label">{display.headlineLabel}</div>
              <div className="progress-rail">
                <span className="progress-fill" style={{ width: `${display.progress}%` }} />
              </div>

              <div className="metric-grid" style={{ marginTop: "18px" }}>
                {display.summaryCards.map((card) => (
                  <div className="metric-card" key={card.label}>
                    <span className="metric-label">{card.label}</span>
                    <span className="metric-value">{card.value}</span>
                  </div>
                ))}
              </div>

              <div className="result-summary">{display.summary}</div>

              <div className="list-section">
                <h3>Key Metrics</h3>
                <div className="metric-grid">
                  {display.metricCards.map((card) => (
                    <div className="metric-card" key={card.label}>
                      <span className="metric-label">{card.label}</span>
                      <span className="metric-value">{card.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="list-section">
                <h3>{display.strengthsTitle}</h3>
                <ul>
                  {display.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="list-section">
                <h3>{display.concernsTitle}</h3>
                <ul>
                  {display.concerns.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <div className="result-badge tone-approve">Ready</div>
              <div className="result-value">{mode === "loan" ? "Approve?" : "Risk?"}</div>
              <div className="empty-panel-copy">
                Submit the applicant profile to get a model decision, explanation summary, key
                metrics, and bank-side recommendation.
              </div>
              <div className="api-callout">
                Make sure your Python backend is running on <code>{API_BASE_URL}</code> before you
                submit the form.
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
