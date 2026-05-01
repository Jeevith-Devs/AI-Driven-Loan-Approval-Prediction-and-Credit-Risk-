"""
Credit risk model for bank-side underwriting support.

This script:
1. Loads a synthetic credit risk dataset from CSV, or generates one if missing
2. Trains Decision Tree and Random Forest classifiers
3. Reports cross-validation and holdout-set metrics
4. Saves the trained model bundle to credit_risk_model.pkl
5. Exposes predict_credit_risk() for probability-of-default scoring

Run:
    py backend\ml\credit_risk_model.py
    py backend\ml\credit_risk_model.py --csv backend\data\synthetic_credit_risk_dataset.csv
"""

from __future__ import annotations

import argparse
import importlib.util
import pickle
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
DATASET_DIR = BACKEND_DIR / "data"
DATASET_GENERATOR_DIR = BACKEND_DIR / "data_generators"
MODELS_DIR = BACKEND_DIR / "models"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


RANDOM_STATE = 42
TARGET_COLUMN = "Credit_Risk_Label"
DEFAULT_PROBABILITY_COLUMN = "Default_Probability"
RISK_BAND_COLUMN = "Risk_Band"
ID_COLUMN = "Applicant_ID"
DEFAULT_DATASET = "synthetic_credit_risk_dataset.csv"
DEFAULT_MODEL_FILE = str(MODELS_DIR / "credit_risk_model.pkl")


def monthly_emi(principal: np.ndarray, annual_rate: np.ndarray, term_months: np.ndarray) -> np.ndarray:
    """Calculate EMI using the reducing-balance formula."""
    monthly_rate = annual_rate / 12 / 100
    numerator = principal * monthly_rate * np.power(1 + monthly_rate, term_months)
    denominator = np.power(1 + monthly_rate, term_months) - 1
    return numerator / np.maximum(denominator, 1e-8)


def load_dataset_generator() -> Any:
    """Load the synthetic credit risk dataset generator lazily."""
    module_path = DATASET_GENERATOR_DIR / "generate_credit_risk_dataset.py"
    spec = importlib.util.spec_from_file_location("generate_credit_risk_dataset", module_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load dataset generator from {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.generate_credit_risk_dataset


def estimate_interest_rate(cibil_score: float, employment_status: str, loan_type: str, prior_default_flag: int) -> float:
    """Estimate a reasonable loan rate when it is not provided."""
    rate = 7.0 + max(0.0, (720 - float(cibil_score)) * 0.013)

    if employment_status == "Contract":
        rate += 1.1
    if loan_type == "Personal":
        rate += 1.0
    elif loan_type == "Jewellery":
        rate -= 0.7
    if int(prior_default_flag) == 1:
        rate += 1.4

    return float(np.clip(rate, 6.5, 25.0))


def normalize_loan_type(record: Dict[str, Any]) -> Dict[str, Any]:
    """Allow Loan_Purpose as an alias for Loan_Type."""
    if "Loan_Purpose" in record and "Loan_Type" not in record:
        record["Loan_Type"] = record["Loan_Purpose"]
    return record


def normalize_credit_score_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    """Allow either CIBIL_Score or Credit_Score in input payloads."""
    if "Credit_Score" in record and "CIBIL_Score" not in record:
        record["CIBIL_Score"] = record["Credit_Score"]
    elif "CIBIL_Score" in record and "Credit_Score" not in record:
        record["Credit_Score"] = record["CIBIL_Score"]
    return record


def align_income_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure both Annual_Income and Monthly_Income are available."""
    annual_income = record.get("Annual_Income")
    monthly_income = record.get("Monthly_Income")

    if annual_income is None and monthly_income is None:
        raise ValueError("Provide at least one of 'Annual_Income' or 'Monthly_Income'.")

    if annual_income is None and monthly_income is not None:
        record["Annual_Income"] = round(float(monthly_income) * 12, 2)
    elif monthly_income is None and annual_income is not None:
        record["Monthly_Income"] = round(float(annual_income) / 12, 2)

    return record


def engineer_credit_risk_features(record: Dict[str, Any]) -> Dict[str, Any]:
    """Create missing derived features needed by the credit risk model."""
    prepared = dict(record)
    prepared = normalize_loan_type(prepared)
    prepared = normalize_credit_score_fields(prepared)
    prepared = align_income_fields(prepared)

    prepared.setdefault("Employment_Status", "Salaried")
    prepared.setdefault("Residence_Status", "Rented")
    prepared.setdefault("Dependents", 0)
    prepared.setdefault("Loan_Type", "Personal")
    prepared.setdefault("Savings_Balance", 0.0)
    prepared.setdefault("Assets_Value", 0.0)
    prepared.setdefault("Collateral_Value", 0.0)
    prepared.setdefault("Credit_History_Years", 0.0)
    prepared.setdefault("Credit_Utilization_Ratio", 0.30)
    prepared.setdefault("Recent_Credit_Inquiries", 0)
    prepared.setdefault("Existing_Loan_Count", 0)
    prepared.setdefault("Existing_EMI", 0.0)
    prepared.setdefault("Delinquency_Count", 0)
    prepared.setdefault("Missed_Payment_Count", 0)
    prepared.setdefault("Prior_Default_Flag", 0)
    prepared.setdefault("Employment_Years", max(float(prepared.get("Age", 21)) - 21, 0))

    if prepared.get("Interest_Rate") is None:
        prepared["Interest_Rate"] = round(
            estimate_interest_rate(
                cibil_score=float(prepared["CIBIL_Score"]),
                employment_status=str(prepared["Employment_Status"]),
                loan_type=str(prepared["Loan_Type"]),
                prior_default_flag=int(prepared["Prior_Default_Flag"]),
            ),
            2,
        )

    if prepared.get("Requested_EMI") is None:
        emi = monthly_emi(
            np.array([float(prepared["Loan_Amount"])]),
            np.array([float(prepared["Interest_Rate"])]),
            np.array([int(prepared["Loan_Term_Months"])]),
        )[0]
        prepared["Requested_EMI"] = round(float(emi), 2)

    monthly_income = float(prepared["Monthly_Income"])
    monthly_expenses = float(prepared.get("Monthly_Expenses", 0.0))
    existing_emi = float(prepared.get("Existing_EMI", 0.0))
    requested_emi = float(prepared["Requested_EMI"])
    annual_income = float(prepared["Annual_Income"])
    loan_amount = float(prepared["Loan_Amount"])
    savings_balance = float(prepared.get("Savings_Balance", 0.0))
    collateral_value = float(prepared.get("Collateral_Value", 0.0))

    if prepared.get("Debt_To_Income_Ratio") is None:
        prepared["Debt_To_Income_Ratio"] = round(
            (existing_emi + requested_emi) / max(monthly_income, 1.0),
            4,
        )

    if prepared.get("Loan_To_Income_Ratio") is None:
        prepared["Loan_To_Income_Ratio"] = round(
            loan_amount / max(annual_income, 1.0),
            4,
        )

    if prepared.get("Collateral_Coverage_Ratio") is None:
        prepared["Collateral_Coverage_Ratio"] = round(
            collateral_value / max(loan_amount, 1.0),
            4,
        )

    if prepared.get("Emergency_Buffer_Months") is None:
        prepared["Emergency_Buffer_Months"] = round(
            savings_balance / max(monthly_expenses, 1.0),
            2,
        )

    return prepared


def load_dataset(csv_path: Optional[str] = None) -> Tuple[pd.DataFrame, str]:
    """Load or generate the credit risk dataset."""
    dataset_path = Path(csv_path) if csv_path else DATASET_DIR / DEFAULT_DATASET
    if dataset_path.exists():
        dataset = pd.read_csv(dataset_path)
        return dataset, f"Loaded dataset from: {dataset_path.resolve()}"

    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    dataset = load_dataset_generator()()
    dataset.to_csv(dataset_path, index=False)
    return dataset, f"Dataset not found. Generated new synthetic dataset at: {dataset_path.resolve()}"


def prepare_training_data(dataset: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Select feature columns and target without leakage."""
    working = dataset.copy()
    if TARGET_COLUMN not in working.columns:
        raise ValueError(f"Missing target column: {TARGET_COLUMN}")

    drop_columns = [
        column
        for column in [ID_COLUMN, TARGET_COLUMN, DEFAULT_PROBABILITY_COLUMN, RISK_BAND_COLUMN]
        if column in working.columns
    ]
    X = working.drop(columns=drop_columns)
    y = working[TARGET_COLUMN].astype(int)
    return X, y


def build_preprocessor(X: pd.DataFrame) -> Tuple[ColumnTransformer, List[str], List[str]]:
    """Build preprocessing pipelines."""
    numeric_columns = X.select_dtypes(include=["number"]).columns.tolist()
    categorical_columns = X.select_dtypes(exclude=["number"]).columns.tolist()

    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, numeric_columns),
            ("cat", categorical_pipeline, categorical_columns),
        ]
    )

    return preprocessor, numeric_columns, categorical_columns


def build_decision_tree_pipeline(X: pd.DataFrame) -> Pipeline:
    """Build the Decision Tree baseline."""
    preprocessor, _, _ = build_preprocessor(X)
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "model",
                DecisionTreeClassifier(
                    max_depth=7,
                    min_samples_split=12,
                    min_samples_leaf=6,
                    class_weight="balanced",
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )


def build_random_forest_pipeline(X: pd.DataFrame) -> Pipeline:
    """Build the Random Forest baseline."""
    preprocessor, _, _ = build_preprocessor(X)
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=300,
                    max_depth=14,
                    min_samples_split=6,
                    min_samples_leaf=3,
                    class_weight="balanced_subsample",
                    random_state=RANDOM_STATE,
                    n_jobs=-1,
                ),
            ),
        ]
    )


def run_cross_validation(X_train: pd.DataFrame, y_train: pd.Series, cv_folds: int = 5) -> None:
    """Run stratified cross-validation for both baseline models."""
    scoring = {
        "accuracy": "accuracy",
        "precision": "precision",
        "recall": "recall",
        "f1": "f1",
        "roc_auc": "roc_auc",
    }
    splitter = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=RANDOM_STATE)
    models = {
        "Decision Tree": build_decision_tree_pipeline(X_train),
        "Random Forest": build_random_forest_pipeline(X_train),
    }

    print(f"\nRunning {cv_folds}-fold stratified cross-validation on the training set...")

    for model_name, model in models.items():
        scores = cross_validate(
            estimator=model,
            X=X_train,
            y=y_train,
            cv=splitter,
            scoring=scoring,
            n_jobs=-1,
            return_train_score=False,
        )
        print(f"\n{'-' * 70}")
        print(f"{model_name} Cross-Validation Summary")
        print(f"{'-' * 70}")
        print(f"Accuracy : {scores['test_accuracy'].mean():.4f} (+/- {scores['test_accuracy'].std():.4f})")
        print(f"Precision: {scores['test_precision'].mean():.4f} (+/- {scores['test_precision'].std():.4f})")
        print(f"Recall   : {scores['test_recall'].mean():.4f} (+/- {scores['test_recall'].std():.4f})")
        print(f"F1 Score : {scores['test_f1'].mean():.4f} (+/- {scores['test_f1'].std():.4f})")
        print(f"ROC AUC  : {scores['test_roc_auc'].mean():.4f} (+/- {scores['test_roc_auc'].std():.4f})")


def evaluate_classifier(model: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, Any]:
    """Return evaluation metrics for a trained classifier."""
    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)[:, 1]
    return {
        "accuracy": accuracy_score(y_test, predictions),
        "precision": precision_score(y_test, predictions, zero_division=0),
        "recall": recall_score(y_test, predictions, zero_division=0),
        "f1_score": f1_score(y_test, predictions, zero_division=0),
        "roc_auc": roc_auc_score(y_test, probabilities),
        "confusion_matrix": confusion_matrix(y_test, predictions),
        "classification_report": classification_report(y_test, predictions, zero_division=0),
    }


def print_metrics(model_name: str, metrics: Dict[str, Any]) -> None:
    """Display evaluation metrics."""
    print(f"\n{'=' * 70}")
    print(model_name)
    print(f"{'=' * 70}")
    print(f"Accuracy : {metrics['accuracy']:.4f}")
    print(f"Precision: {metrics['precision']:.4f}")
    print(f"Recall   : {metrics['recall']:.4f}")
    print(f"F1 Score : {metrics['f1_score']:.4f}")
    print(f"ROC AUC  : {metrics['roc_auc']:.4f}")
    print("\nConfusion Matrix:")
    print(metrics["confusion_matrix"])
    print("\nClassification Report:")
    print(metrics["classification_report"])


def get_feature_names(
    preprocessor: ColumnTransformer,
    numeric_columns: List[str],
    categorical_columns: List[str],
) -> List[str]:
    """Return transformed feature names."""
    feature_names: List[str] = list(numeric_columns)
    if categorical_columns:
        encoder = preprocessor.named_transformers_["cat"].named_steps["encoder"]
        feature_names.extend(encoder.get_feature_names_out(categorical_columns).tolist())
    return feature_names


def train_models(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    numeric_columns: List[str],
    categorical_columns: List[str],
) -> Dict[str, Any]:
    """Train baseline credit risk models and return the best one."""
    decision_tree_model = build_decision_tree_pipeline(X_train)
    random_forest_model = build_random_forest_pipeline(X_train)

    decision_tree_model.fit(X_train, y_train)
    random_forest_model.fit(X_train, y_train)

    decision_tree_metrics = evaluate_classifier(decision_tree_model, X_test, y_test)
    random_forest_metrics = evaluate_classifier(random_forest_model, X_test, y_test)

    print_metrics("Decision Tree Classifier", decision_tree_metrics)
    print_metrics("Random Forest Classifier", random_forest_metrics)

    candidates = [
        ("Decision Tree", decision_tree_model, decision_tree_metrics),
        ("Random Forest", random_forest_model, random_forest_metrics),
    ]
    best_name, best_model, best_metrics = max(
        candidates,
        key=lambda item: (item[2]["f1_score"], item[2]["roc_auc"], item[2]["accuracy"]),
    )

    fitted_model = random_forest_model.named_steps["model"]
    fitted_preprocessor = random_forest_model.named_steps["preprocessor"]
    feature_names = get_feature_names(fitted_preprocessor, numeric_columns, categorical_columns)
    feature_importance = (
        pd.DataFrame(
            {
                "Feature": feature_names,
                "Importance": fitted_model.feature_importances_,
            }
        )
        .sort_values(by="Importance", ascending=False)
        .reset_index(drop=True)
    )

    print("\nTop 12 feature importances from the Random Forest model:")
    print(feature_importance.head(12).to_string(index=False))

    return {
        "best_model_name": best_name,
        "best_model": best_model,
        "best_metrics": best_metrics,
        "feature_importance": feature_importance,
    }


def get_risk_band(default_probability_percent: float) -> Tuple[str, str]:
    """Translate default probability into a risk band and bank recommendation."""
    if default_probability_percent >= 65:
        return "High", "High risk: decline or require strong collateral"
    if default_probability_percent >= 35:
        return "Medium", "Medium risk: manual review or risk-based pricing"
    return "Low", "Low risk: eligible for standard underwriting"


def build_risk_explanation(engineered_record: Dict[str, Any], default_probability_percent: float) -> Dict[str, Any]:
    """Explain why the borrower appears low, medium, or high risk."""
    strengths: List[str] = []
    concerns: List[str] = []

    cibil_score = float(engineered_record["CIBIL_Score"])
    utilization = float(engineered_record["Credit_Utilization_Ratio"])
    debt_to_income_ratio = float(engineered_record["Debt_To_Income_Ratio"])
    loan_to_income_ratio = float(engineered_record["Loan_To_Income_Ratio"])
    collateral_ratio = float(engineered_record["Collateral_Coverage_Ratio"])
    emergency_buffer = float(engineered_record["Emergency_Buffer_Months"])
    credit_history_years = float(engineered_record["Credit_History_Years"])
    delinquency_count = int(engineered_record["Delinquency_Count"])
    missed_payment_count = int(engineered_record["Missed_Payment_Count"])
    prior_default_flag = int(engineered_record["Prior_Default_Flag"])
    recent_inquiries = int(engineered_record["Recent_Credit_Inquiries"])
    loan_type = str(engineered_record["Loan_Type"])

    if cibil_score >= 750:
        strengths.append(f"CIBIL score of {int(cibil_score)} is strong.")
    elif cibil_score >= 680:
        strengths.append(f"CIBIL score of {int(cibil_score)} is acceptable for bank underwriting.")
    else:
        concerns.append(f"CIBIL score of {int(cibil_score)} increases default risk.")

    if utilization <= 0.35:
        strengths.append(f"Credit utilization is controlled at {utilization * 100:.1f}%.")
    elif utilization >= 0.70:
        concerns.append(f"Credit utilization is high at {utilization * 100:.1f}%.")

    if debt_to_income_ratio <= 0.30:
        strengths.append(f"Debt-to-income ratio is healthy at {debt_to_income_ratio * 100:.1f}%.")
    elif debt_to_income_ratio >= 0.45:
        concerns.append(f"Debt-to-income ratio is elevated at {debt_to_income_ratio * 100:.1f}%.")

    if loan_to_income_ratio <= 0.60:
        strengths.append(f"Loan-to-income ratio is manageable at {loan_to_income_ratio:.2f}x.")
    elif loan_to_income_ratio >= 1.20:
        concerns.append(f"Loan-to-income ratio is heavy at {loan_to_income_ratio:.2f}x.")

    if collateral_ratio >= 1.20:
        strengths.append(f"Collateral covers the loan at {collateral_ratio:.2f}x.")
    elif collateral_ratio < 0.50 and loan_type in {"Business", "Personal", "Education"}:
        concerns.append(f"Collateral support is limited at {collateral_ratio:.2f}x.")

    if emergency_buffer >= 6:
        strengths.append(f"Savings provide about {emergency_buffer:.1f} months of expense buffer.")
    elif emergency_buffer < 2:
        concerns.append(f"Emergency savings cover only {emergency_buffer:.1f} months of expenses.")

    if credit_history_years >= 5:
        strengths.append(f"Credit history length of {credit_history_years:.1f} years improves reliability.")
    elif credit_history_years < 2:
        concerns.append(f"Credit history is short at {credit_history_years:.1f} years.")

    if delinquency_count + missed_payment_count == 0:
        strengths.append("No recent delinquency or missed-payment pattern is visible.")
    elif delinquency_count + missed_payment_count >= 3:
        concerns.append(f"Repayment history shows {delinquency_count + missed_payment_count} delinquency events.")

    if prior_default_flag == 1:
        concerns.append("A prior default flag is present in the applicant profile.")

    if recent_inquiries >= 4:
        concerns.append(f"Recent credit inquiries are high at {recent_inquiries}, suggesting credit stress.")

    risk_band, bank_recommendation = get_risk_band(default_probability_percent)
    summary = (
        f"This applicant is assessed as {risk_band.lower()} credit risk for a {loan_type.lower()} loan, "
        f"with an estimated default probability of {default_probability_percent:.2f}%."
    )

    if not strengths:
        strengths.append("No major positive factor stands out beyond the overall risk score.")
    if not concerns:
        concerns.append("No major credit-risk warning sign stands out from the submitted profile.")

    return {
        "summary": summary,
        "risk_band": risk_band,
        "bank_recommendation": bank_recommendation,
        "strengths": strengths[:5],
        "concerns": concerns[:5],
        "key_metrics": {
            "loan_type": loan_type,
            "cibil_score": int(round(cibil_score)),
            "credit_utilization_percent": round(utilization * 100, 2),
            "debt_to_income_percent": round(debt_to_income_ratio * 100, 2),
            "loan_to_income_ratio": round(loan_to_income_ratio, 2),
            "collateral_coverage_ratio": round(collateral_ratio, 2),
            "emergency_buffer_months": round(emergency_buffer, 2),
            "credit_history_years": round(credit_history_years, 1),
        },
    }


def save_model_bundle(model: Pipeline, feature_columns: List[str], output_path: str = DEFAULT_MODEL_FILE) -> None:
    """Save the trained model bundle."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as file_pointer:
        pickle.dump({"model": model, "feature_columns": feature_columns}, file_pointer)
    print(f"\nSaved trained model bundle to: {Path(output_path).resolve()}")


def load_model_bundle(model_path: str = DEFAULT_MODEL_FILE) -> Dict[str, Any]:
    """Load a saved model bundle."""
    with open(model_path, "rb") as file_pointer:
        return pickle.load(file_pointer)


def build_prediction_frame(applicant_data: Dict[str, Any], feature_columns: List[str]) -> pd.DataFrame:
    """Create a model input frame from a raw applicant dictionary."""
    engineered_record = engineer_credit_risk_features(applicant_data)
    aligned_record = {column: engineered_record.get(column, np.nan) for column in feature_columns}
    return pd.DataFrame([aligned_record], columns=feature_columns)


def predict_credit_risk(
    applicant_data: Dict[str, Any],
    model_bundle: Optional[Dict[str, Any]] = None,
    model_path: str = DEFAULT_MODEL_FILE,
) -> Dict[str, Any]:
    """Predict default probability and bank-side credit risk explanation."""
    active_bundle = model_bundle or load_model_bundle(model_path)
    model = active_bundle["model"]
    feature_columns = active_bundle["feature_columns"]

    engineered_record = engineer_credit_risk_features(applicant_data)
    prediction_input = build_prediction_frame(engineered_record, feature_columns)
    high_risk_probability = float(model.predict_proba(prediction_input)[0][1])
    default_probability_percent = round(high_risk_probability * 100, 2)
    explanation = build_risk_explanation(engineered_record, default_probability_percent)

    return {
        "probability_of_default": default_probability_percent,
        "pd": default_probability_percent,
        "creditworthiness_percent": round((1 - high_risk_probability) * 100, 2),
        "risk_band": explanation["risk_band"],
        "bank_recommendation": explanation["bank_recommendation"],
        "explanation": explanation["summary"],
        "reason_codes": explanation["concerns"],
        "strengths": explanation["strengths"],
        "concerns": explanation["concerns"],
        "key_metrics": explanation["key_metrics"],
    }


def main(csv_path: Optional[str] = None, model_output: str = DEFAULT_MODEL_FILE, cv_folds: int = 5) -> None:
    """Train the credit risk model and print a sample prediction."""
    dataset, dataset_message = load_dataset(csv_path)
    print(dataset_message)
    print(f"Dataset shape: {dataset.shape}")

    X, y = prepare_training_data(dataset)
    _, numeric_columns, categorical_columns = build_preprocessor(X)
    feature_columns = X.columns.tolist()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    run_cross_validation(X_train, y_train, cv_folds=cv_folds)
    results = train_models(
        X_train,
        y_train,
        X_test,
        y_test,
        numeric_columns,
        categorical_columns,
    )

    print(f"\nSelected best model: {results['best_model_name']}")
    print(
        "Best model summary -> "
        f"Accuracy: {results['best_metrics']['accuracy']:.4f}, "
        f"F1 Score: {results['best_metrics']['f1_score']:.4f}, "
        f"ROC AUC: {results['best_metrics']['roc_auc']:.4f}"
    )

    save_model_bundle(results["best_model"], feature_columns, model_output)

    sample_applicant = {
        "Age": 41,
        "Employment_Status": "Business",
        "Employment_Years": 6,
        "Residence_Status": "Owned",
        "Dependents": 2,
        "Loan_Type": "Business",
        "Annual_Income": 140000,
        "Monthly_Expenses": 3600,
        "Savings_Balance": 28000,
        "Assets_Value": 320000,
        "Collateral_Value": 90000,
        "CIBIL_Score": 695,
        "Credit_History_Years": 7,
        "Credit_Utilization_Ratio": 0.42,
        "Recent_Credit_Inquiries": 2,
        "Existing_Loan_Count": 2,
        "Existing_EMI": 1100,
        "Delinquency_Count": 1,
        "Missed_Payment_Count": 0,
        "Prior_Default_Flag": 0,
        "Loan_Amount": 95000,
        "Loan_Term_Months": 48,
    }

    sample_result = predict_credit_risk(
        applicant_data=sample_applicant,
        model_bundle={"model": results["best_model"], "feature_columns": feature_columns},
    )

    print("\nSample applicant:")
    print(sample_applicant)
    print("\nPrediction result:")
    print(sample_result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the credit risk prediction model.")
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Optional path to the credit risk dataset CSV file. If omitted, the script uses backend/data/synthetic_credit_risk_dataset.csv.",
    )
    parser.add_argument(
        "--model-output",
        type=str,
        default=DEFAULT_MODEL_FILE,
        help="Path where the trained model bundle will be saved.",
    )
    parser.add_argument(
        "--cv-folds",
        type=int,
        default=5,
        help="Number of stratified folds for cross-validation.",
    )
    args = parser.parse_args()
    main(csv_path=args.csv, model_output=args.model_output, cv_folds=args.cv_folds)
