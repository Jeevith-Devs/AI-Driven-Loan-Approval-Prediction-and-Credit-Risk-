"use client";

import { useEffect, useState } from "react";

import { fetchBackendHealth, type BackendHealth } from "@/lib/api";

export function BackendStatus() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const response = await fetchBackendHealth();
        if (!cancelled) {
          setHealth(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to reach the Python backend.",
          );
        }
      }
    }

    void loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="surface-card status-panel">
      <span className="card-kicker">Backend Health</span>
      <h2>Python API connection status</h2>
      <p>
        The Next.js frontend calls the Python service for every prediction request. This status card
        helps you confirm that both trained models are loaded and ready.
      </p>

      {error ? (
        <div className="error-banner">{error}</div>
      ) : !health ? (
        <span className="status-badge status-pending">Checking backend...</span>
      ) : (
        <div className="status-grid">
          <div className="metric-card">
            <span className="metric-label">Overall status</span>
            <span className="metric-value">{health.status}</span>
            <div className={`status-badge ${health.status === "ok" ? "status-ok" : "status-error"}`}>
              {health.status === "ok" ? "Backend reachable" : "Needs attention"}
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Loan approval model</span>
            <span className="metric-value">{health.loan_approval.loaded ? "Loaded" : "Missing"}</span>
            <p>{health.loan_approval.loaded ? "Loan approval model is ready for prediction." : health.loan_approval.error}</p>
          </div>
          <div className="metric-card">
            <span className="metric-label">Credit risk model</span>
            <span className="metric-value">{health.credit_risk.loaded ? "Loaded" : "Missing"}</span>
            <p>{health.credit_risk.loaded ? "Credit risk model is ready for prediction." : health.credit_risk.error}</p>
          </div>
        </div>
      )}
    </section>
  );
}
