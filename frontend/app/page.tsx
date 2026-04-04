import Link from "next/link";

import { BackendStatus } from "@/components/BackendStatus";

const loanTypes = ["Personal", "Business", "Education", "Jewellery", "Home", "Car"];

export default function HomePage() {
  return (
    <main className="site-shell">
      <section className="hero-panel">
        <div className="eyebrow">AI-Driven Banking Intelligence</div>
        <h1>One web app for faster loan approval and sharper credit risk assessment.</h1>
        <p className="hero-copy">
          This Next.js client connects to your Python machine-learning backend and helps bank teams
          analyze an applicant&apos;s profile, estimate repayment confidence, and understand the
          reasons behind approval or rejection.
        </p>
        <div className="hero-actions">
          <Link className="primary-link" href="/loan-approval">
            Open Loan Approval
          </Link>
          <Link className="secondary-link" href="/credit-risk">
            Open Credit Risk
          </Link>
        </div>
      </section>

      <section className="card-grid">
        <article className="surface-card info-card">
          <span className="card-kicker">Workflow 1</span>
          <h2>Loan Approval</h2>
          <p>
            Estimate whether the bank should sanction the loan, show approval probability, and
            explain the strongest approval drivers and risk flags.
          </p>
          <div className="tag-list">
            {loanTypes.map((loanType) => (
              <span className="tag" key={loanType}>
                {loanType}
              </span>
            ))}
          </div>
          <Link className="inline-link" href="/loan-approval">
            Analyze applicant
          </Link>
        </article>

        <article className="surface-card info-card">
          <span className="card-kicker">Workflow 2</span>
          <h2>Credit Risk</h2>
          <p>
            Estimate probability of default, assign a risk band, and give the bank team a clearer
            explanation of the borrower&apos;s credit quality.
          </p>
          <div className="tag-list">
            <span className="tag">Probability of Default</span>
            <span className="tag">Risk Band</span>
            <span className="tag">Reason Codes</span>
          </div>
          <Link className="inline-link" href="/credit-risk">
            Review risk case
          </Link>
        </article>
      </section>

      <section className="surface-card process-strip">
        <div>
          <span className="card-kicker">How It Works</span>
          <h2>Normal bank-side workflow, connected by API.</h2>
        </div>
        <div className="process-grid">
          <div>
            <strong>1. Enter applicant profile</strong>
            <p>Capture salary, assets, CIBIL score, liabilities, loan type, term, and behavior signals.</p>
          </div>
          <div>
            <strong>2. Call Python models</strong>
            <p>The Next.js UI sends the application to your Python backend using JSON API requests.</p>
          </div>
          <div>
            <strong>3. Review prediction and explanation</strong>
            <p>The interface returns approval confidence, default risk, recommendation, and supporting reasons.</p>
          </div>
        </div>
      </section>

      <BackendStatus />
    </main>
  );
}
