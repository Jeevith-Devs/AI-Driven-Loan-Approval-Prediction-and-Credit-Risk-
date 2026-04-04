"""
Synthetic dataset generator for a loan approval and credit risk assessment model.

This script creates realistic applicant, credit, and loan features, then derives:
1. Repayment_Probability: chance of closing the loan on time (0 to 100)
2. Loan_Approval_Label: binary approval label based on repayment probability

Usage:
    py generate_loan_dataset.py
    py generate_loan_dataset.py --rows 10000 --output synthetic_loan_data.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


RANDOM_STATE = 42


def monthly_emi(principal: np.ndarray, annual_rate: np.ndarray, term_months: np.ndarray) -> np.ndarray:
    """Calculate EMI for a loan using the standard reducing-balance formula."""
    monthly_rate = annual_rate / 12 / 100
    numerator = principal * monthly_rate * np.power(1 + monthly_rate, term_months)
    denominator = np.power(1 + monthly_rate, term_months) - 1
    return numerator / np.maximum(denominator, 1e-8)


def clamp(values: np.ndarray, lower: float, upper: float) -> np.ndarray:
    """Limit values to a realistic numeric range."""
    return np.clip(values, lower, upper)


def generate_synthetic_loan_dataset(
    n_rows: int = 5000,
    random_state: int = RANDOM_STATE,
) -> pd.DataFrame:
    """Create a realistic synthetic loan approval dataset."""
    rng = np.random.default_rng(random_state)

    age = rng.integers(21, 61, size=n_rows)
    employment_status = rng.choice(
        ["Salaried", "Self_Employed", "Business", "Contract"],
        size=n_rows,
        p=[0.50, 0.20, 0.18, 0.12],
    )
    residence_status = rng.choice(
        ["Owned", "Rented", "Family"],
        size=n_rows,
        p=[0.40, 0.42, 0.18],
    )
    loan_purpose = rng.choice(
        ["Home", "Car", "Education", "Business", "Personal", "Jewellery"],
        size=n_rows,
        p=[0.24, 0.14, 0.14, 0.18, 0.19, 0.11],
    )
    dependents = rng.choice([0, 1, 2, 3, 4], size=n_rows, p=[0.28, 0.24, 0.22, 0.16, 0.10])

    employment_years = clamp(age - 20 + rng.normal(0, 3, size=n_rows), 0, 38).round(1)

    base_income = rng.normal(85000, 28000, size=n_rows)
    base_income += np.where(employment_status == "Business", 18000, 0)
    base_income += np.where(employment_status == "Self_Employed", 12000, 0)
    base_income -= np.where(employment_status == "Contract", 7000, 0)
    annual_income = clamp(base_income + employment_years * 1800, 18000, 320000).round(2)
    monthly_income = (annual_income / 12).round(2)

    monthly_expenses = clamp(
        monthly_income * rng.uniform(0.28, 0.62, size=n_rows) + dependents * rng.normal(220, 85, size=n_rows),
        350,
        monthly_income * 0.82,
    ).round(2)

    savings_balance = clamp(
        annual_income * rng.uniform(0.08, 1.10, size=n_rows),
        1000,
        280000,
    ).round(2)
    assets_value = clamp(
        annual_income * rng.uniform(0.8, 8.5, size=n_rows) + savings_balance * rng.uniform(0.2, 1.5, size=n_rows),
        5000,
        1500000,
    ).round(2)

    cibil_score = clamp(
        rng.normal(680, 85, size=n_rows)
        + employment_years * 1.4
        + np.where(residence_status == "Owned", 18, 0)
        - dependents * 4.5,
        300,
        900,
    ).round(0).astype(int)

    credit_history_years = clamp(
        employment_years * rng.uniform(0.35, 0.9, size=n_rows) + rng.normal(2.5, 2.0, size=n_rows),
        0,
        30,
    ).round(1)

    other_credit_count = rng.choice([0, 1, 2, 3, 4], size=n_rows, p=[0.30, 0.28, 0.22, 0.14, 0.06])
    other_credit_amount = clamp(
        other_credit_count * rng.uniform(1500, 22000, size=n_rows) + rng.normal(2500, 3500, size=n_rows),
        0,
        85000,
    ).round(2)
    existing_emi = clamp(
        other_credit_amount * rng.uniform(0.03, 0.08, size=n_rows),
        0,
        monthly_income * 0.40,
    ).round(2)

    late_payment_count = rng.choice([0, 1, 2, 3, 4, 5], size=n_rows, p=[0.50, 0.21, 0.14, 0.08, 0.05, 0.02])
    missed_payment_count = rng.choice([0, 1, 2, 3], size=n_rows, p=[0.74, 0.16, 0.07, 0.03])
    late_credit_close_count = rng.choice([0, 1, 2, 3], size=n_rows, p=[0.76, 0.15, 0.07, 0.02])

    loan_amount = clamp(
        annual_income * rng.uniform(0.35, 1.9, size=n_rows)
        + np.where(loan_purpose == "Home", 25000, 0)
        + np.where(loan_purpose == "Business", 18000, 0)
        + np.where(loan_purpose == "Education", 9000, 0)
        + np.where(loan_purpose == "Jewellery", -14000, 0)
        + rng.normal(0, 18000, size=n_rows),
        5000,
        600000,
    ).round(2)

    loan_term_months = np.zeros(n_rows, dtype=int)
    term_profiles = {
        "Home": ([60, 84, 120, 180, 240], [0.08, 0.12, 0.20, 0.28, 0.32]),
        "Car": ([24, 36, 48, 60, 84], [0.12, 0.25, 0.28, 0.22, 0.13]),
        "Education": ([24, 36, 48, 60, 84, 120], [0.12, 0.20, 0.24, 0.22, 0.14, 0.08]),
        "Business": ([12, 24, 36, 48, 60, 84], [0.10, 0.20, 0.23, 0.20, 0.17, 0.10]),
        "Personal": ([12, 24, 36, 48, 60], [0.16, 0.24, 0.24, 0.20, 0.16]),
        "Jewellery": ([6, 12, 18, 24, 36], [0.20, 0.28, 0.24, 0.18, 0.10]),
    }
    for purpose, (terms, probabilities) in term_profiles.items():
        purpose_mask = loan_purpose == purpose
        loan_term_months[purpose_mask] = rng.choice(terms, size=int(purpose_mask.sum()), p=probabilities)

    interest_rate = clamp(
        6.5
        + (720 - cibil_score) * 0.012
        + np.where(employment_status == "Contract", 1.2, 0)
        + np.where(employment_status == "Business", 0.4, 0)
        + np.where(loan_purpose == "Personal", 1.1, 0)
        + np.where(loan_purpose == "Jewellery", -0.6, 0)
        + rng.normal(0, 0.6, size=n_rows),
        6.5,
        24.0,
    ).round(2)

    requested_emi = monthly_emi(loan_amount, interest_rate, loan_term_months).round(2)

    total_monthly_obligations = (monthly_expenses + existing_emi + requested_emi).round(2)
    disposable_income = (monthly_income - total_monthly_obligations).round(2)
    debt_to_income_ratio = ((existing_emi + requested_emi) / np.maximum(monthly_income, 1)).round(4)
    obligation_to_income_ratio = (total_monthly_obligations / np.maximum(monthly_income, 1)).round(4)
    asset_to_loan_ratio = (assets_value / np.maximum(loan_amount, 1)).round(4)

    repayment_score = (
        2.10 * ((cibil_score - 300) / 600)
        + 1.20 * (asset_to_loan_ratio / np.maximum(asset_to_loan_ratio + 1, 1e-8))
        + 1.35 * ((credit_history_years / 30).clip(0, 1))
        + 0.80 * ((disposable_income / np.maximum(monthly_income, 1)) + 0.5)
        - 2.75 * debt_to_income_ratio
        - 1.60 * obligation_to_income_ratio
        - 0.22 * late_payment_count
        - 0.34 * missed_payment_count
        - 0.42 * late_credit_close_count
        - 0.12 * other_credit_count
        + 0.18 * (employment_status == "Salaried").astype(float)
        + 0.10 * (residence_status == "Owned").astype(float)
        + rng.normal(0, 0.35, size=n_rows)
    )

    repayment_probability = 1 / (1 + np.exp(-(repayment_score - 0.25)))
    repayment_probability_percent = (repayment_probability * 100).round(2)
    loan_approval_label = (repayment_probability_percent >= 62).astype(int)

    df = pd.DataFrame(
        {
            "Applicant_ID": [f"APP-{100000 + idx}" for idx in range(n_rows)],
            "Age": age,
            "Employment_Status": employment_status,
            "Employment_Years": employment_years,
            "Residence_Status": residence_status,
            "Dependents": dependents,
            "Loan_Purpose": loan_purpose,
            "Annual_Income": annual_income,
            "Monthly_Income": monthly_income,
            "Monthly_Expenses": monthly_expenses,
            "Savings_Balance": savings_balance,
            "Assets_Value": assets_value,
            "CIBIL_Score": cibil_score,
            "Credit_History_Years": credit_history_years,
            "Other_Credit_Count": other_credit_count,
            "Other_Credit_Amount": other_credit_amount,
            "Existing_EMI": existing_emi,
            "Late_Payment_Count": late_payment_count,
            "Missed_Payment_Count": missed_payment_count,
            "Late_Credit_Close_Count": late_credit_close_count,
            "Loan_Amount": loan_amount,
            "Loan_Term_Months": loan_term_months,
            "Interest_Rate": interest_rate,
            "Requested_EMI": requested_emi,
            "Debt_To_Income_Ratio": debt_to_income_ratio,
            "Obligation_To_Income_Ratio": obligation_to_income_ratio,
            "Asset_To_Loan_Ratio": asset_to_loan_ratio,
            "Disposable_Income": disposable_income,
            "Repayment_Probability": repayment_probability_percent,
            "Loan_Approval_Label": loan_approval_label,
        }
    )

    # Add a small number of missing values so preprocessing can be tested later.
    feature_columns_with_missing = [
        "Employment_Status",
        "Residence_Status",
        "Employment_Years",
        "Monthly_Expenses",
        "Savings_Balance",
        "Assets_Value",
        "CIBIL_Score",
        "Credit_History_Years",
        "Other_Credit_Amount",
        "Existing_EMI",
        "Late_Payment_Count",
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
    """Print a compact summary of the generated dataset."""
    print(f"Rows: {len(df)}")
    print(f"Columns: {len(df.columns)}")
    print("\nColumn list:")
    for column in df.columns:
        print(f"- {column}")

    print("\nTarget summary:")
    print(df["Repayment_Probability"].describe().round(2))
    print("\nApproval rate:")
    print((df["Loan_Approval_Label"].value_counts(normalize=True) * 100).round(2).sort_index())

    print("\nSample rows:")
    print(df.head())


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a synthetic loan approval dataset.")
    parser.add_argument("--rows", type=int, default=5000, help="Number of rows to generate.")
    parser.add_argument(
        "--output",
        type=str,
        default="synthetic_loan_approval_dataset.csv",
        help="CSV output file path.",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    dataset = generate_synthetic_loan_dataset(n_rows=args.rows)
    dataset.to_csv(output_path, index=False)

    print(f"Saved dataset to: {output_path.resolve()}")
    summarize_dataset(dataset)


if __name__ == "__main__":
    main()
