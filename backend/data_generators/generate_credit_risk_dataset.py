"""
Synthetic dataset generator for a bank-side credit risk model.

The generated dataset estimates:
1. Default_Probability: probability of borrower default (0 to 100)
2. Credit_Risk_Label: binary high-risk label (1 = high risk, 0 = lower risk)
3. Risk_Band: Low / Medium / High

Run:
    py generate_credit_risk_dataset.py
    py generate_credit_risk_dataset.py --rows 6000 --output synthetic_credit_risk_dataset.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


RANDOM_STATE = 42


def clamp(values: np.ndarray, lower: float, upper: float) -> np.ndarray:
    """Clip numeric values into a realistic range."""
    return np.clip(values, lower, upper)


def monthly_emi(principal: np.ndarray, annual_rate: np.ndarray, term_months: np.ndarray) -> np.ndarray:
    """Calculate EMI using the reducing-balance formula."""
    monthly_rate = annual_rate / 12 / 100
    numerator = principal * monthly_rate * np.power(1 + monthly_rate, term_months)
    denominator = np.power(1 + monthly_rate, term_months) - 1
    return numerator / np.maximum(denominator, 1e-8)


def assign_loan_terms(rng: np.random.Generator, loan_types: np.ndarray) -> np.ndarray:
    """Assign loan terms based on loan type."""
    loan_term_months = np.zeros(len(loan_types), dtype=int)
    term_profiles = {
        "Home": ([60, 84, 120, 180, 240], [0.08, 0.12, 0.20, 0.28, 0.32]),
        "Car": ([24, 36, 48, 60, 84], [0.12, 0.25, 0.28, 0.22, 0.13]),
        "Education": ([24, 36, 48, 60, 84, 120], [0.12, 0.20, 0.24, 0.22, 0.14, 0.08]),
        "Business": ([12, 24, 36, 48, 60, 84], [0.10, 0.20, 0.23, 0.20, 0.17, 0.10]),
        "Personal": ([12, 24, 36, 48, 60], [0.16, 0.24, 0.24, 0.20, 0.16]),
        "Jewellery": ([6, 12, 18, 24, 36], [0.20, 0.28, 0.24, 0.18, 0.10]),
    }

    for loan_type, (terms, probabilities) in term_profiles.items():
        mask = loan_types == loan_type
        loan_term_months[mask] = rng.choice(terms, size=int(mask.sum()), p=probabilities)

    return loan_term_months


def generate_credit_risk_dataset(
    n_rows: int = 6000,
    random_state: int = RANDOM_STATE,
) -> pd.DataFrame:
    """Generate a synthetic credit risk dataset."""
    rng = np.random.default_rng(random_state)

    age = rng.integers(21, 66, size=n_rows)
    employment_status = rng.choice(
        ["Salaried", "Self_Employed", "Business", "Contract"],
        size=n_rows,
        p=[0.49, 0.20, 0.18, 0.13],
    )
    residence_status = rng.choice(
        ["Owned", "Rented", "Family"],
        size=n_rows,
        p=[0.41, 0.40, 0.19],
    )
    loan_type = rng.choice(
        ["Personal", "Business", "Education", "Jewellery", "Home", "Car"],
        size=n_rows,
        p=[0.22, 0.18, 0.13, 0.10, 0.24, 0.13],
    )
    dependents = rng.choice([0, 1, 2, 3, 4], size=n_rows, p=[0.29, 0.25, 0.22, 0.15, 0.09])

    employment_years = clamp(age - 21 + rng.normal(0, 4, size=n_rows), 0, 40).round(1)

    base_income = rng.normal(90000, 32000, size=n_rows)
    base_income += np.where(employment_status == "Business", 20000, 0)
    base_income += np.where(employment_status == "Self_Employed", 12000, 0)
    base_income -= np.where(employment_status == "Contract", 9000, 0)
    annual_income = clamp(base_income + employment_years * 1900, 18000, 360000).round(2)
    monthly_income = (annual_income / 12).round(2)

    monthly_expenses = clamp(
        monthly_income * rng.uniform(0.30, 0.64, size=n_rows) + dependents * rng.normal(240, 90, size=n_rows),
        400,
        monthly_income * 0.84,
    ).round(2)

    savings_balance = clamp(
        annual_income * rng.uniform(0.05, 1.15, size=n_rows),
        500,
        320000,
    ).round(2)
    assets_value = clamp(
        annual_income * rng.uniform(0.8, 9.0, size=n_rows) + savings_balance * rng.uniform(0.2, 1.6, size=n_rows),
        5000,
        1800000,
    ).round(2)

    cibil_score = clamp(
        rng.normal(675, 95, size=n_rows)
        + employment_years * 1.3
        + np.where(residence_status == "Owned", 16, 0)
        - dependents * 4.0,
        300,
        900,
    ).round(0).astype(int)

    credit_history_years = clamp(
        employment_years * rng.uniform(0.30, 0.95, size=n_rows) + rng.normal(2.0, 2.3, size=n_rows),
        0,
        32,
    ).round(1)

    existing_loan_count = rng.choice([0, 1, 2, 3, 4], size=n_rows, p=[0.24, 0.31, 0.24, 0.14, 0.07])
    existing_emi = clamp(
        existing_loan_count * rng.uniform(220, 1800, size=n_rows) + rng.normal(220, 280, size=n_rows),
        0,
        monthly_income * 0.45,
    ).round(2)

    delinquency_count = rng.choice([0, 1, 2, 3, 4, 5], size=n_rows, p=[0.54, 0.18, 0.12, 0.08, 0.05, 0.03])
    missed_payment_count = rng.choice([0, 1, 2, 3], size=n_rows, p=[0.76, 0.15, 0.06, 0.03])
    prior_default_flag = rng.choice([0, 1], size=n_rows, p=[0.91, 0.09])
    recent_credit_inquiries = rng.choice([0, 1, 2, 3, 4, 5], size=n_rows, p=[0.28, 0.25, 0.19, 0.14, 0.09, 0.05])

    credit_utilization_ratio = clamp(
        rng.normal(0.42, 0.20, size=n_rows)
        + 0.08 * delinquency_count
        + 0.10 * prior_default_flag
        - 0.0000006 * savings_balance,
        0.02,
        0.98,
    ).round(4)

    loan_amount = clamp(
        annual_income * rng.uniform(0.28, 1.8, size=n_rows)
        + np.where(loan_type == "Home", 26000, 0)
        + np.where(loan_type == "Business", 17000, 0)
        + np.where(loan_type == "Education", 10000, 0)
        + np.where(loan_type == "Jewellery", -16000, 0)
        + rng.normal(0, 16000, size=n_rows),
        4000,
        650000,
    ).round(2)

    loan_term_months = assign_loan_terms(rng, loan_type)

    interest_rate = clamp(
        7.0
        + (720 - cibil_score) * 0.013
        + np.where(employment_status == "Contract", 1.1, 0)
        + np.where(loan_type == "Personal", 1.0, 0)
        + np.where(loan_type == "Jewellery", -0.7, 0)
        + np.where(prior_default_flag == 1, 1.4, 0)
        + rng.normal(0, 0.7, size=n_rows),
        6.5,
        25.0,
    ).round(2)

    requested_emi = monthly_emi(loan_amount, interest_rate, loan_term_months).round(2)

    collateral_value = clamp(
        loan_amount * rng.uniform(0.0, 1.8, size=n_rows)
        + np.where(loan_type == "Home", loan_amount * rng.uniform(0.4, 1.2, size=n_rows), 0)
        + np.where(loan_type == "Jewellery", loan_amount * rng.uniform(0.6, 1.4, size=n_rows), 0)
        + np.where(loan_type == "Car", loan_amount * rng.uniform(0.2, 0.8, size=n_rows), 0),
        0,
        1400000,
    ).round(2)

    debt_to_income_ratio = ((existing_emi + requested_emi) / np.maximum(monthly_income, 1)).round(4)
    loan_to_income_ratio = (loan_amount / np.maximum(annual_income, 1)).round(4)
    collateral_coverage_ratio = (collateral_value / np.maximum(loan_amount, 1)).round(4)
    emergency_buffer_months = (savings_balance / np.maximum(monthly_expenses, 1)).round(2)

    default_score = (
        2.50 * (1 - ((cibil_score - 300) / 600))
        + 2.10 * credit_utilization_ratio
        + 2.35 * debt_to_income_ratio
        + 1.25 * (loan_to_income_ratio / np.maximum(loan_to_income_ratio + 1, 1e-8))
        - 1.10 * np.minimum(emergency_buffer_months / 12, 1.0)
        - 0.95 * np.minimum(collateral_coverage_ratio / 2, 1.0)
        - 0.75 * np.minimum(credit_history_years / 20, 1.0)
        - 0.50 * np.minimum(employment_years / 15, 1.0)
        + 0.28 * delinquency_count
        + 0.42 * missed_payment_count
        + 1.25 * prior_default_flag
        + 0.13 * recent_credit_inquiries
        + 0.08 * existing_loan_count
        + 0.12 * (employment_status == "Contract").astype(float)
        + 0.08 * (loan_type == "Business").astype(float)
        - 0.10 * (loan_type == "Jewellery").astype(float)
        + rng.normal(0, 0.38, size=n_rows)
    )

    default_probability = 1 / (1 + np.exp(-(default_score - 1.75)))
    default_probability_percent = (default_probability * 100).round(2)
    credit_risk_label = (default_probability_percent >= 50).astype(int)

    risk_band = np.where(
        default_probability_percent >= 65,
        "High",
        np.where(default_probability_percent >= 35, "Medium", "Low"),
    )

    df = pd.DataFrame(
        {
            "Applicant_ID": [f"CR-{100000 + idx}" for idx in range(n_rows)],
            "Age": age,
            "Employment_Status": employment_status,
            "Employment_Years": employment_years,
            "Residence_Status": residence_status,
            "Dependents": dependents,
            "Loan_Type": loan_type,
            "Annual_Income": annual_income,
            "Monthly_Income": monthly_income,
            "Monthly_Expenses": monthly_expenses,
            "Savings_Balance": savings_balance,
            "Assets_Value": assets_value,
            "Collateral_Value": collateral_value,
            "CIBIL_Score": cibil_score,
            "Credit_History_Years": credit_history_years,
            "Credit_Utilization_Ratio": credit_utilization_ratio,
            "Recent_Credit_Inquiries": recent_credit_inquiries,
            "Existing_Loan_Count": existing_loan_count,
            "Existing_EMI": existing_emi,
            "Delinquency_Count": delinquency_count,
            "Missed_Payment_Count": missed_payment_count,
            "Prior_Default_Flag": prior_default_flag,
            "Loan_Amount": loan_amount,
            "Loan_Term_Months": loan_term_months,
            "Interest_Rate": interest_rate,
            "Requested_EMI": requested_emi,
            "Debt_To_Income_Ratio": debt_to_income_ratio,
            "Loan_To_Income_Ratio": loan_to_income_ratio,
            "Collateral_Coverage_Ratio": collateral_coverage_ratio,
            "Emergency_Buffer_Months": emergency_buffer_months,
            "Default_Probability": default_probability_percent,
            "Credit_Risk_Label": credit_risk_label,
            "Risk_Band": risk_band,
        }
    )

    feature_columns_with_missing = [
        "Employment_Status",
        "Employment_Years",
        "Monthly_Expenses",
        "Savings_Balance",
        "Assets_Value",
        "Collateral_Value",
        "CIBIL_Score",
        "Credit_History_Years",
        "Credit_Utilization_Ratio",
        "Existing_EMI",
        "Delinquency_Count",
        "Loan_Amount",
        "Interest_Rate",
    ]

    missing_fraction = 0.03
    missing_count = max(1, int(n_rows * missing_fraction))
    for column in feature_columns_with_missing:
        missing_indices = rng.choice(df.index, size=missing_count, replace=False)
        df.loc[missing_indices, column] = np.nan

    return df


def summarize_dataset(df: pd.DataFrame) -> None:
    """Print a quick summary of the generated credit risk dataset."""
    print(f"Rows: {len(df)}")
    print(f"Columns: {len(df.columns)}")

    print("\nDefault probability summary:")
    print(df["Default_Probability"].describe().round(2))

    print("\nRisk label distribution:")
    print((df["Credit_Risk_Label"].value_counts(normalize=True) * 100).round(2).sort_index())

    print("\nRisk band distribution:")
    print((df["Risk_Band"].value_counts(normalize=True) * 100).round(2))

    print("\nSample rows:")
    print(df.head())


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a synthetic credit risk dataset.")
    parser.add_argument("--rows", type=int, default=6000, help="Number of rows to generate.")
    parser.add_argument(
        "--output",
        type=str,
        default="synthetic_credit_risk_dataset.csv",
        help="CSV output path.",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    dataset = generate_credit_risk_dataset(n_rows=args.rows)
    dataset.to_csv(output_path, index=False)

    print(f"Saved dataset to: {output_path.resolve()}")
    summarize_dataset(dataset)


if __name__ == "__main__":
    main()
