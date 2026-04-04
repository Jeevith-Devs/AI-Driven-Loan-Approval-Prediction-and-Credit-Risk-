"""
Train the full project pipeline in one command.

What this script does:
1. Generates the synthetic loan approval dataset
2. Generates the synthetic credit risk dataset
3. Trains the loan approval model
4. Trains the credit risk model

Run:
    py backend\train_all_models.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent
DATASET_GENERATOR_DIR = BACKEND_DIR / "data_generators"
ML_DIR = BACKEND_DIR / "ml"
DATA_DIR = BACKEND_DIR / "data"


def run_step(title: str, command: list[str]) -> None:
    """Run one training step and stop on failure."""
    print(f"\n{'=' * 80}")
    print(title)
    print(f"{'=' * 80}")
    subprocess.run(command, cwd=BACKEND_DIR, check=True)


def main() -> None:
    """Run the complete dataset generation and training pipeline."""
    python_executable = sys.executable

    run_step(
        "Generating Loan Approval Dataset",
        [
            python_executable,
            str(DATASET_GENERATOR_DIR / "generate_loan_dataset.py"),
            "--rows",
            "5000",
            "--output",
            str(DATA_DIR / "synthetic_loan_approval_dataset.csv"),
        ],
    )

    run_step(
        "Generating Credit Risk Dataset",
        [
            python_executable,
            str(DATASET_GENERATOR_DIR / "generate_credit_risk_dataset.py"),
            "--rows",
            "6000",
            "--output",
            str(DATA_DIR / "synthetic_credit_risk_dataset.csv"),
        ],
    )

    run_step("Training Loan Approval Model", [python_executable, str(ML_DIR / "loan_approval_model.py")])
    run_step("Training Credit Risk Model", [python_executable, str(ML_DIR / "credit_risk_model.py")])

    print(f"\n{'=' * 80}")
    print("Project Training Completed Successfully")
    print(f"{'=' * 80}")
    print("Loan approval model  -> backend/models/loan_approval_model.pkl")
    print("Credit risk model    -> backend/models/credit_risk_model.pkl")
    print("Backend API          -> backend/app.py")


if __name__ == "__main__":
    main()
