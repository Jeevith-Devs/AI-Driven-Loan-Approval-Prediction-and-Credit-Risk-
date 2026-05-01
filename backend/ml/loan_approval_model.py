"""
Loan approval model built on the synthetic dataset.

What this script does:
1. Loads the synthetic loan dataset from CSV, or generates one if missing
2. Trains Decision Tree and Random Forest classifiers
3. Evaluates both models and selects the best one
4. Saves the trained model bundle to loan_approval_model.pkl
5. Exposes a predict_loan_approval function that returns:
   - Approved or Rejected
   - approval probability percentage

Run:
    py backend\ml\loan_approval_model.py
    py backend\ml\loan_approval_model.py --csv backend\data\synthetic_loan_approval_dataset.csv
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
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
DATASET_DIR = BACKEND_DIR / "data"
DATASET_GENERATOR_DIR = BACKEND_DIR / "data_generators"
MODELS_DIR = BACKEND_DIR / "models"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


RANDOM_STATE = 42
TARGET_COLUMN = "Loan_Approval_Label"
SCORE_REFERENCE_COLUMN = "Repayment_Probability"
ID_COLUMN = "Applicant_ID"
DEFAULT_DATASET = "synthetic_loan_approval_dataset.csv"
DEFAULT_MODEL_FILE = str(MODELS_DIR / "loan_approval_model.pkl")


def monthly_emi(principal: np.ndarray, annual_rate: np.ndarray, term_months: np.ndarray) -> np.ndarray:
    """Calculate EMI using the reducing-balance formula."""
    monthly_rate = annual_rate / 12 / 100
    numerator = principal * monthly_rate * np.power(1 + monthly_rate, term_months)
    denominator = np.power(1 + monthly_rate, term_months) - 1
    return numerator / np.maximum(denominator, 1e-8)


def load_dataset_generator() -> Any:
    """Load the synthetic loan dataset generator lazily."""
    module_path = DATASET_GENERATOR_DIR / "generate_loan_dataset.py"
    spec = importlib.util.spec_from_file_location("generate_loan_dataset", module_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load dataset generator from {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.generate_synthetic_loan_dataset


def estimate_interest_rate(cibil_score: float, employment_status: str, loan_purpose: str) -> float:
    """Estimate a reasonable interest rate when one is not supplied."""
    rate = 6.5 + max(0.0, (720 - float(cibil_score)) * 0.012)

    if employment_status == "Contract":
        rate += 1.2
    elif employment_status == "Business":
        rate += 0.4

    if loan_purpose == "Personal":
        rate += 1.1
    elif loan_purpose == "Jewellery":
        rate -= 0.6

    return float(np.clip(rate, 6.5, 24.0))


def normalize_loan_type_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    """Allow either Loan_Type or Loan_Purpose in API input."""
    if "Loan_Type" in record and "Loan_Purpose" not in record:
        record["Loan_Purpose"] = record["Loan_Type"]
    elif "Loan_Purpose" in record and "Loan_Type" not in record:
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
    """Ensure annual and monthly income are both available."""
    annual_income = record.get("Annual_Income")
    monthly_income = record.get("Monthly_Income")

    if annual_income is None and monthly_income is None:
        raise ValueError("Provide at least one of 'Annual_Income' or 'Monthly_Income'.")

    if annual_income is None and monthly_income is not None:
        record["Annual_Income"] = round(float(monthly_income) * 12, 2)
    elif monthly_income is None and annual_income is not None:
        record["Monthly_Income"] = round(float(annual_income) / 12, 2)

    return record


def engineer_features(record: Dict[str, Any]) -> Dict[str, Any]:
    """Create any missing derived features needed by the model."""
    prepared = dict(record)
    prepared = normalize_loan_type_fields(prepared)
    prepared = normalize_credit_score_fields(prepared)
    prepared = align_income_fields(prepared)

    prepared.setdefault("Employment_Status", "Salaried")
    prepared.setdefault("Residence_Status", "Rented")
    prepared.setdefault("Dependents", 0)
    prepared.setdefault("Loan_Purpose", "Personal")
    prepared.setdefault("Savings_Balance", 0.0)
    prepared.setdefault("Assets_Value", 0.0)
    prepared.setdefault("Credit_History_Years", 0.0)
    prepared.setdefault("Other_Credit_Count", 0)
    prepared.setdefault("Other_Credit_Amount", 0.0)
    prepared.setdefault("Existing_EMI", 0.0)
    prepared.setdefault("Late_Payment_Count", 0)
    prepared.setdefault("Missed_Payment_Count", 0)
    prepared.setdefault("Late_Credit_Close_Count", 0)
    prepared.setdefault("Employment_Years", max(float(prepared.get("Age", 21)) - 21, 0))

    if prepared.get("Interest_Rate") is None:
        prepared["Interest_Rate"] = round(
            estimate_interest_rate(
                cibil_score=float(prepared["CIBIL_Score"]),
                employment_status=str(prepared["Employment_Status"]),
                loan_purpose=str(prepared["Loan_Purpose"]),
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
    loan_amount = float(prepared["Loan_Amount"])
    assets_value = float(prepared.get("Assets_Value", 0.0))

    total_monthly_obligations = monthly_expenses + existing_emi + requested_emi

    if prepared.get("Debt_To_Income_Ratio") is None:
        prepared["Debt_To_Income_Ratio"] = round(
            (existing_emi + requested_emi) / max(monthly_income, 1.0),
            4,
        )

    if prepared.get("Obligation_To_Income_Ratio") is None:
        prepared["Obligation_To_Income_Ratio"] = round(
            total_monthly_obligations / max(monthly_income, 1.0),
            4,
        )

    if prepared.get("Asset_To_Loan_Ratio") is None:
        prepared["Asset_To_Loan_Ratio"] = round(
            assets_value / max(loan_amount, 1.0),
            4,
        )

    if prepared.get("Disposable_Income") is None:
        prepared["Disposable_Income"] = round(monthly_income - total_monthly_obligations, 2)

    return prepared


def get_bank_recommendation(approval_probability_percent: float) -> Tuple[str, str]:
    """Convert raw probability into a bank-friendly recommendation and risk band."""
    if approval_probability_percent >= 80:
        return "Recommend Approval", "Low Risk"
    if approval_probability_percent >= 60:
        return "Approve With Conditions", "Moderate Risk"
    if approval_probability_percent >= 45:
        return "Manual Review", "Elevated Risk"
    return "Recommend Rejection", "High Risk"


def build_decision_explanation(
    engineered_record: Dict[str, Any],
    approval_probability_percent: float,
    decision: str,
) -> Dict[str, Any]:
    """Build a bank-side explanation for why the model approved or rejected the case."""
    strengths: List[str] = []
    concerns: List[str] = []

    cibil_score = float(engineered_record["CIBIL_Score"])
    debt_to_income_ratio = float(engineered_record["Debt_To_Income_Ratio"])
    obligation_to_income_ratio = float(engineered_record["Obligation_To_Income_Ratio"])
    asset_to_loan_ratio = float(engineered_record["Asset_To_Loan_Ratio"])
    disposable_income = float(engineered_record["Disposable_Income"])
    credit_history_years = float(engineered_record["Credit_History_Years"])
    employment_years = float(engineered_record["Employment_Years"])
    late_payment_count = int(engineered_record["Late_Payment_Count"])
    missed_payment_count = int(engineered_record["Missed_Payment_Count"])
    late_credit_close_count = int(engineered_record["Late_Credit_Close_Count"])
    other_credit_count = int(engineered_record["Other_Credit_Count"])
    requested_emi = float(engineered_record["Requested_EMI"])
    loan_type = str(engineered_record.get("Loan_Purpose", "Unknown"))

    total_payment_issues = late_payment_count + missed_payment_count + late_credit_close_count

    if cibil_score >= 750:
        strengths.append(f"Strong CIBIL score of {int(cibil_score)} supports repayment confidence.")
    elif cibil_score >= 680:
        strengths.append(f"CIBIL score of {int(cibil_score)} is within an acceptable lending range.")
    elif cibil_score < 650:
        concerns.append(f"CIBIL score of {int(cibil_score)} is below the preferred lending range.")

    if debt_to_income_ratio <= 0.30:
        strengths.append(f"Debt-to-income ratio is healthy at {debt_to_income_ratio * 100:.1f}%.")
    elif debt_to_income_ratio >= 0.45:
        concerns.append(f"Debt-to-income ratio is high at {debt_to_income_ratio * 100:.1f}%.")

    if obligation_to_income_ratio <= 0.65:
        strengths.append(f"Total monthly obligations consume {obligation_to_income_ratio * 100:.1f}% of income, which is manageable.")
    elif obligation_to_income_ratio >= 0.80:
        concerns.append(f"Total monthly obligations consume {obligation_to_income_ratio * 100:.1f}% of income, leaving limited repayment buffer.")

    if asset_to_loan_ratio >= 2.0:
        strengths.append(f"Assets cover the requested loan about {asset_to_loan_ratio:.2f}x over.")
    elif asset_to_loan_ratio < 1.0:
        concerns.append(f"Assets cover only {asset_to_loan_ratio:.2f}x of the requested loan amount.")

    if disposable_income > 1500:
        strengths.append(f"Estimated disposable income after obligations is {disposable_income:.2f} per month.")
    elif disposable_income <= 0:
        concerns.append("Disposable income turns negative after projected obligations.")

    if credit_history_years >= 5:
        strengths.append(f"Credit history length of {credit_history_years:.1f} years adds stability.")
    elif credit_history_years < 2:
        concerns.append(f"Credit history is limited at {credit_history_years:.1f} years.")

    if employment_years >= 3:
        strengths.append(f"Employment stability is reasonable with {employment_years:.1f} years of work history.")
    elif employment_years < 1.5:
        concerns.append(f"Employment history is short at {employment_years:.1f} years.")

    if total_payment_issues == 0:
        strengths.append("No recent late-payment or credit-close issues were reported.")
    elif total_payment_issues >= 3:
        concerns.append(f"Payment behavior shows {total_payment_issues} late or missed credit events.")

    if other_credit_count >= 3:
        concerns.append(f"The applicant already manages {other_credit_count} other credit lines.")

    if loan_type == "Jewellery":
        strengths.append("Jewellery loan requests are usually shorter tenor and can be easier to structure conservatively.")
    elif loan_type == "Business" and debt_to_income_ratio >= 0.40:
        concerns.append("Business loan exposure combined with a high repayment ratio increases underwriting risk.")
    elif loan_type == "Education" and credit_history_years < 2:
        concerns.append("Education loan request comes with a relatively thin credit history.")

    bank_recommendation, risk_level = get_bank_recommendation(approval_probability_percent)

    if decision == "Approved":
        summary = (
            f"The applicant is more likely than not to repay on time for this {loan_type.lower()} loan. "
            f"The strongest positives are repayment capacity, credit profile, and balance-sheet support."
        )
    else:
        summary = (
            f"The applicant currently shows a weaker repayment profile for this {loan_type.lower()} loan. "
            f"The main pressure points are debt burden, credit quality, or limited repayment buffer."
        )

    if not strengths:
        strengths.append("No standout strength was identified beyond the overall model score.")
    if not concerns:
        concerns.append("No major risk flag was identified from the supplied application fields.")

    return {
        "summary": summary,
        "bank_recommendation": bank_recommendation,
        "risk_level": risk_level,
        "strengths": strengths[:5],
        "concerns": concerns[:5],
        "key_metrics": {
            "loan_type": loan_type,
            "cibil_score": int(round(cibil_score)),
            "debt_to_income_ratio_percent": round(debt_to_income_ratio * 100, 2),
            "obligation_to_income_ratio_percent": round(obligation_to_income_ratio * 100, 2),
            "asset_to_loan_ratio": round(asset_to_loan_ratio, 2),
            "disposable_income": round(disposable_income, 2),
            "requested_emi": round(requested_emi, 2),
            "credit_history_years": round(credit_history_years, 1),
        },
    }


def load_dataset(csv_path: Optional[str] = None) -> Tuple[pd.DataFrame, str]:
    """Load a CSV dataset or generate one if it does not exist."""
    dataset_path = Path(csv_path) if csv_path else DATASET_DIR / DEFAULT_DATASET
    if dataset_path.exists():
        dataset = pd.read_csv(dataset_path)
        return dataset, f"Loaded dataset from: {dataset_path.resolve()}"

    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    dataset = load_dataset_generator()()
    dataset.to_csv(dataset_path, index=False)
    return dataset, f"Dataset not found. Generated new synthetic dataset at: {dataset_path.resolve()}"


def build_preprocessor(X: pd.DataFrame) -> Tuple[ColumnTransformer, List[str], List[str]]:
    """Build preprocessing for numeric and categorical columns."""
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


def prepare_training_data(dataset: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Select features and target while avoiding target leakage."""
    working = dataset.copy()

    if TARGET_COLUMN not in working.columns:
        raise ValueError(f"Missing target column: {TARGET_COLUMN}")

    drop_columns = [column for column in [ID_COLUMN, TARGET_COLUMN, SCORE_REFERENCE_COLUMN] if column in working.columns]
    X = working.drop(columns=drop_columns)
    y = working[TARGET_COLUMN].astype(int)
    return X, y


def evaluate_classifier(model: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, Any]:
    """Return evaluation metrics for a trained classifier."""
    predicted_labels = model.predict(X_test)
    predicted_probabilities = model.predict_proba(X_test)[:, 1]

    return {
        "accuracy": accuracy_score(y_test, predicted_labels),
        "precision": precision_score(y_test, predicted_labels, zero_division=0),
        "recall": recall_score(y_test, predicted_labels, zero_division=0),
        "f1_score": f1_score(y_test, predicted_labels, zero_division=0),
        "roc_auc": roc_auc_score(y_test, predicted_probabilities),
        "confusion_matrix": confusion_matrix(y_test, predicted_labels),
        "classification_report": classification_report(y_test, predicted_labels, zero_division=0),
    }


def print_metrics(model_name: str, metrics: Dict[str, Any]) -> None:
    """Display model evaluation output."""
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
    """Get transformed feature names for feature importance output."""
    feature_names: List[str] = list(numeric_columns)

    if categorical_columns:
        encoder = preprocessor.named_transformers_["cat"].named_steps["encoder"]
        feature_names.extend(encoder.get_feature_names_out(categorical_columns).tolist())

    return feature_names


def build_decision_tree_pipeline(X: pd.DataFrame) -> Pipeline:
    """Create the baseline Decision Tree pipeline."""
    preprocessor, _, _ = build_preprocessor(X)
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "model",
                DecisionTreeClassifier(
                    max_depth=7,
                    min_samples_split=12,
                    min_samples_leaf=5,
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )


def build_random_forest_pipeline(X: pd.DataFrame) -> Pipeline:
    """Create the baseline Random Forest pipeline."""
    preprocessor, _, _ = build_preprocessor(X)
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=250,
                    max_depth=12,
                    min_samples_split=6,
                    min_samples_leaf=3,
                    class_weight="balanced_subsample",
                    random_state=RANDOM_STATE,
                    n_jobs=-1,
                ),
            ),
        ]
    )


def print_cross_validation_results(model_name: str, cv_results: Dict[str, np.ndarray]) -> None:
    """Display cross-validation mean and standard deviation for each metric."""
    print(f"\n{'-' * 70}")
    print(f"{model_name} Cross-Validation Summary")
    print(f"{'-' * 70}")
    print(f"Accuracy : {cv_results['test_accuracy'].mean():.4f} (+/- {cv_results['test_accuracy'].std():.4f})")
    print(f"Precision: {cv_results['test_precision'].mean():.4f} (+/- {cv_results['test_precision'].std():.4f})")
    print(f"Recall   : {cv_results['test_recall'].mean():.4f} (+/- {cv_results['test_recall'].std():.4f})")
    print(f"F1 Score : {cv_results['test_f1'].mean():.4f} (+/- {cv_results['test_f1'].std():.4f})")
    print(f"ROC AUC  : {cv_results['test_roc_auc'].mean():.4f} (+/- {cv_results['test_roc_auc'].std():.4f})")


def run_cross_validation(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    cv_folds: int = 5,
) -> Dict[str, Dict[str, np.ndarray]]:
    """Run stratified cross-validation on the training split for both baseline models."""
    scoring = {
        "accuracy": "accuracy",
        "precision": "precision",
        "recall": "recall",
        "f1": "f1",
        "roc_auc": "roc_auc",
    }
    splitter = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=RANDOM_STATE)

    candidate_models = {
        "Decision Tree": build_decision_tree_pipeline(X_train),
        "Random Forest": build_random_forest_pipeline(X_train),
    }

    print(f"\nRunning {cv_folds}-fold stratified cross-validation on the training set...")

    cv_summaries: Dict[str, Dict[str, np.ndarray]] = {}
    for model_name, model in candidate_models.items():
        cv_results = cross_validate(
            estimator=model,
            X=X_train,
            y=y_train,
            cv=splitter,
            scoring=scoring,
            n_jobs=-1,
            return_train_score=False,
        )
        cv_summaries[model_name] = cv_results
        print_cross_validation_results(model_name, cv_results)

    return cv_summaries


def train_models(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    numeric_columns: List[str],
    categorical_columns: List[str],
    tune_random_forest: bool = False,
) -> Dict[str, Any]:
    """Train, evaluate, and compare loan approval classifiers."""
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

    feature_importance_source = random_forest_model

    if tune_random_forest:
        tuned_rf_preprocessor, _, _ = build_preprocessor(X_train)
        tuned_random_forest = Pipeline(
            steps=[
                ("preprocessor", tuned_rf_preprocessor),
                (
                    "model",
                    RandomForestClassifier(
                        class_weight="balanced_subsample",
                        random_state=RANDOM_STATE,
                        n_jobs=-1,
                    ),
                ),
            ]
        )

        grid_search = GridSearchCV(
            estimator=tuned_random_forest,
            param_grid={
                "model__n_estimators": [150, 250],
                "model__max_depth": [10, None],
                "model__min_samples_split": [2, 6],
                "model__min_samples_leaf": [1, 3],
            },
            scoring="f1",
            cv=3,
            n_jobs=-1,
            verbose=0,
        )
        grid_search.fit(X_train, y_train)
        tuned_random_forest_metrics = evaluate_classifier(grid_search.best_estimator_, X_test, y_test)

        print_metrics("Tuned Random Forest Classifier", tuned_random_forest_metrics)
        print(f"\nBest Random Forest Parameters: {grid_search.best_params_}")

        candidates.append(
            ("Tuned Random Forest", grid_search.best_estimator_, tuned_random_forest_metrics)
        )
        feature_importance_source = grid_search.best_estimator_

    best_name, best_model, best_metrics = max(
        candidates,
        key=lambda item: (item[2]["f1_score"], item[2]["roc_auc"], item[2]["accuracy"]),
    )

    final_rf_model = feature_importance_source.named_steps["model"]
    final_preprocessor = feature_importance_source.named_steps["preprocessor"]
    transformed_feature_names = get_feature_names(final_preprocessor, numeric_columns, categorical_columns)

    feature_importance = (
        pd.DataFrame(
            {
                "Feature": transformed_feature_names,
                "Importance": final_rf_model.feature_importances_,
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


def save_model_bundle(
    model: Pipeline,
    feature_columns: List[str],
    output_path: str = DEFAULT_MODEL_FILE,
) -> None:
    """Persist the trained model and its feature order."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    model_bundle = {
        "model": model,
        "feature_columns": feature_columns,
    }
    with open(output_path, "wb") as file_pointer:
        pickle.dump(model_bundle, file_pointer)
    print(f"\nSaved trained model bundle to: {Path(output_path).resolve()}")


def load_model_bundle(model_path: str = DEFAULT_MODEL_FILE) -> Dict[str, Any]:
    """Load the saved model bundle."""
    with open(model_path, "rb") as file_pointer:
        return pickle.load(file_pointer)


def build_prediction_frame(applicant_data: Dict[str, Any], feature_columns: List[str]) -> pd.DataFrame:
    """Convert a raw applicant dictionary into a model-ready DataFrame row."""
    engineered_record = engineer_features(applicant_data)
    aligned_record = {column: engineered_record.get(column, np.nan) for column in feature_columns}
    return pd.DataFrame([aligned_record], columns=feature_columns)


def predict_loan_approval(
    applicant_data: Dict[str, Any],
    model_bundle: Optional[Dict[str, Any]] = None,
    model_path: str = DEFAULT_MODEL_FILE,
) -> Dict[str, Any]:
    """
    Predict loan approval and return probability-based confidence.

    Required applicant fields for realistic use:
    - Age
    - Annual_Income or Monthly_Income
    - Monthly_Expenses
    - Assets_Value
    - CIBIL_Score
    - Credit_History_Years
    - Loan_Amount
    - Loan_Term_Months
    """
    active_bundle = model_bundle or load_model_bundle(model_path)
    model = active_bundle["model"]
    feature_columns = active_bundle["feature_columns"]

    engineered_record = engineer_features(applicant_data)
    prediction_input = build_prediction_frame(engineered_record, feature_columns)
    approval_probability = float(model.predict_proba(prediction_input)[0][1])
    approval_label = int(model.predict(prediction_input)[0])
    approval_probability_percent = round(approval_probability * 100, 2)
    decision = "Approved" if approval_label == 1 else "Rejected"
    explanation = build_decision_explanation(
        engineered_record=engineered_record,
        approval_probability_percent=approval_probability_percent,
        decision=decision,
    )

    return {
        "decision": decision,
        "approved": decision == "Approved",
        "prediction": decision,
        "probability": approval_probability_percent,
        "confidence": approval_probability_percent,
        "approval_probability_percent": approval_probability_percent,
        "rejection_probability_percent": round((1 - approval_probability) * 100, 2),
        "bank_recommendation": explanation["bank_recommendation"],
        "risk_level": explanation["risk_level"],
        "summary": explanation["summary"],
        "strengths": explanation["strengths"],
        "concerns": explanation["concerns"],
        "key_metrics": explanation["key_metrics"],
    }


def main(
    csv_path: Optional[str] = None,
    model_output: str = DEFAULT_MODEL_FILE,
    tune_random_forest: bool = False,
    cv_folds: int = 5,
) -> None:
    """Train the loan approval model and print a sample prediction."""
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
        tune_random_forest=tune_random_forest,
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
        "Age": 32,
        "Employment_Status": "Salaried",
        "Employment_Years": 8,
        "Residence_Status": "Rented",
        "Dependents": 1,
        "Loan_Purpose": "Home",
        "Annual_Income": 120000,
        "Monthly_Expenses": 2500,
        "Savings_Balance": 18000,
        "Assets_Value": 240000,
        "CIBIL_Score": 760,
        "Credit_History_Years": 9,
        "Other_Credit_Count": 1,
        "Other_Credit_Amount": 12000,
        "Existing_EMI": 320,
        "Late_Payment_Count": 0,
        "Missed_Payment_Count": 0,
        "Late_Credit_Close_Count": 0,
        "Loan_Amount": 85000,
        "Loan_Term_Months": 60,
    }

    sample_result = predict_loan_approval(
        applicant_data=sample_applicant,
        model_bundle={"model": results["best_model"], "feature_columns": feature_columns},
    )

    print("\nSample applicant:")
    print(sample_applicant)
    print("\nPrediction result:")
    print(sample_result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the loan approval prediction model.")
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Optional path to the dataset CSV file. If omitted, the script uses backend/data/synthetic_loan_approval_dataset.csv.",
    )
    parser.add_argument(
        "--model-output",
        type=str,
        default=DEFAULT_MODEL_FILE,
        help="Path where the trained model bundle will be saved.",
    )
    parser.add_argument(
        "--tune",
        action="store_true",
        help="Run GridSearchCV to tune the Random Forest. Default run skips tuning for speed.",
    )
    parser.add_argument(
        "--cv-folds",
        type=int,
        default=5,
        help="Number of stratified folds to use for cross-validation on the training split.",
    )
    args = parser.parse_args()
    main(
        csv_path=args.csv,
        model_output=args.model_output,
        tune_random_forest=args.tune,
        cv_folds=args.cv_folds,
    )
