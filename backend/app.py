"""
Flask API backend for loan approval prediction and credit risk assessment.
"""

from __future__ import annotations

from pathlib import Path
import sys
from typing import Any, Callable, Dict, List, Optional, Tuple

from flask import Flask, jsonify, request

APP_DIR = Path(__file__).resolve().parent
if str(APP_DIR) not in sys.path:
    sys.path.insert(0, str(APP_DIR))

from ml.credit_risk_model import (
    DEFAULT_MODEL_FILE as CREDIT_MODEL_FILE,
    load_model_bundle as load_credit_bundle,
    predict_credit_risk,
)
from ml.loan_approval_model import (
    DEFAULT_MODEL_FILE as LOAN_MODEL_FILE,
    load_model_bundle as load_loan_bundle,
    predict_loan_approval,
)


app = Flask(__name__)


def select_options(values: List[Tuple[str, str]]) -> List[Dict[str, str]]:
    return [{"label": label, "value": value} for label, value in values]


LOAN_FIELDS: List[Dict[str, Any]] = [
    {"name": "Age", "label": "Age", "widget": "number", "step": "1", "default": 32, "cast": "int"},
    {"name": "Employment_Status", "label": "Employment Status", "widget": "select", "options": select_options([("Salaried", "Salaried"), ("Self Employed", "Self_Employed"), ("Business", "Business"), ("Contract", "Contract")]), "default": "Salaried", "cast": "str"},
    {"name": "Employment_Years", "label": "Employment Years", "widget": "number", "step": "0.1", "default": 8, "cast": "float"},
    {"name": "Residence_Status", "label": "Residence Status", "widget": "select", "options": select_options([("Owned", "Owned"), ("Rented", "Rented"), ("Family", "Family")]), "default": "Rented", "cast": "str"},
    {"name": "Dependents", "label": "Dependents", "widget": "number", "step": "1", "default": 1, "cast": "int"},
    {"name": "Loan_Type", "label": "Loan Type", "widget": "select", "options": select_options([("Personal", "Personal"), ("Business", "Business"), ("Education", "Education"), ("Jewellery", "Jewellery"), ("Home", "Home"), ("Car", "Car")]), "default": "Home", "cast": "str", "aliases": ["Loan_Purpose"]},
    {"name": "Annual_Income", "label": "Annual Income", "widget": "number", "step": "0.01", "default": 120000, "cast": "float"},
    {"name": "Monthly_Expenses", "label": "Monthly Expenses", "widget": "number", "step": "0.01", "default": 2500, "cast": "float"},
    {"name": "Savings_Balance", "label": "Savings Balance", "widget": "number", "step": "0.01", "default": 18000, "cast": "float"},
    {"name": "Assets_Value", "label": "Assets Value", "widget": "number", "step": "0.01", "default": 240000, "cast": "float"},
    {"name": "CIBIL_Score", "label": "CIBIL Score", "widget": "number", "step": "1", "default": 760, "cast": "int", "aliases": ["Credit_Score"]},
    {"name": "Credit_History_Years", "label": "Credit History Years", "widget": "number", "step": "0.1", "default": 9, "cast": "float"},
    {"name": "Other_Credit_Count", "label": "Other Credit Count", "widget": "number", "step": "1", "default": 1, "cast": "int"},
    {"name": "Other_Credit_Amount", "label": "Other Credit Amount", "widget": "number", "step": "0.01", "default": 12000, "cast": "float"},
    {"name": "Existing_EMI", "label": "Existing EMI", "widget": "number", "step": "0.01", "default": 320, "cast": "float"},
    {"name": "Late_Payment_Count", "label": "Late Payment Count", "widget": "number", "step": "1", "default": 0, "cast": "int"},
    {"name": "Missed_Payment_Count", "label": "Missed Payment Count", "widget": "number", "step": "1", "default": 0, "cast": "int"},
    {"name": "Late_Credit_Close_Count", "label": "Late Credit Close Count", "widget": "number", "step": "1", "default": 0, "cast": "int"},
    {"name": "Loan_Amount", "label": "Loan Amount", "widget": "number", "step": "0.01", "default": 85000, "cast": "float"},
    {"name": "Loan_Term_Months", "label": "Loan Term (Months)", "widget": "number", "step": "1", "default": 60, "cast": "int"},
]


CREDIT_FIELDS: List[Dict[str, Any]] = [
    {"name": "Age", "label": "Age", "widget": "number", "step": "1", "default": 41, "cast": "int"},
    {"name": "Employment_Status", "label": "Employment Status", "widget": "select", "options": select_options([("Salaried", "Salaried"), ("Self Employed", "Self_Employed"), ("Business", "Business"), ("Contract", "Contract")]), "default": "Business", "cast": "str"},
    {"name": "Employment_Years", "label": "Employment Years", "widget": "number", "step": "0.1", "default": 6, "cast": "float"},
    {"name": "Residence_Status", "label": "Residence Status", "widget": "select", "options": select_options([("Owned", "Owned"), ("Rented", "Rented"), ("Family", "Family")]), "default": "Owned", "cast": "str"},
    {"name": "Dependents", "label": "Dependents", "widget": "number", "step": "1", "default": 2, "cast": "int"},
    {"name": "Loan_Type", "label": "Loan Type", "widget": "select", "options": select_options([("Personal", "Personal"), ("Business", "Business"), ("Education", "Education"), ("Jewellery", "Jewellery"), ("Home", "Home"), ("Car", "Car")]), "default": "Business", "cast": "str", "aliases": ["Loan_Purpose"]},
    {"name": "Annual_Income", "label": "Annual Income", "widget": "number", "step": "0.01", "default": 140000, "cast": "float"},
    {"name": "Monthly_Expenses", "label": "Monthly Expenses", "widget": "number", "step": "0.01", "default": 3600, "cast": "float"},
    {"name": "Savings_Balance", "label": "Savings Balance", "widget": "number", "step": "0.01", "default": 28000, "cast": "float"},
    {"name": "Assets_Value", "label": "Assets Value", "widget": "number", "step": "0.01", "default": 320000, "cast": "float"},
    {"name": "Collateral_Value", "label": "Collateral Value", "widget": "number", "step": "0.01", "default": 90000, "cast": "float"},
    {"name": "CIBIL_Score", "label": "CIBIL Score", "widget": "number", "step": "1", "default": 695, "cast": "int", "aliases": ["Credit_Score"]},
    {"name": "Credit_History_Years", "label": "Credit History Years", "widget": "number", "step": "0.1", "default": 7, "cast": "float"},
    {"name": "Credit_Utilization_Ratio", "label": "Credit Utilization Ratio", "widget": "number", "step": "0.01", "default": 0.42, "cast": "float"},
    {"name": "Recent_Credit_Inquiries", "label": "Recent Credit Inquiries", "widget": "number", "step": "1", "default": 2, "cast": "int"},
    {"name": "Existing_Loan_Count", "label": "Existing Loan Count", "widget": "number", "step": "1", "default": 2, "cast": "int"},
    {"name": "Existing_EMI", "label": "Existing EMI", "widget": "number", "step": "0.01", "default": 1100, "cast": "float"},
    {"name": "Delinquency_Count", "label": "Delinquency Count", "widget": "number", "step": "1", "default": 1, "cast": "int"},
    {"name": "Missed_Payment_Count", "label": "Missed Payment Count", "widget": "number", "step": "1", "default": 0, "cast": "int"},
    {"name": "Prior_Default_Flag", "label": "Prior Default History", "widget": "select", "options": select_options([("No", "0"), ("Yes", "1")]), "default": "0", "cast": "int"},
    {"name": "Loan_Amount", "label": "Loan Amount", "widget": "number", "step": "0.01", "default": 95000, "cast": "float"},
    {"name": "Loan_Term_Months", "label": "Loan Term (Months)", "widget": "number", "step": "1", "default": 48, "cast": "int"},
]


def safe_load_bundle(loader: Callable[[str], Dict[str, Any]], model_path: Path) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    try:
        if not model_path.exists():
            return None, f"Model file not found: {model_path.name}"
        return loader(str(model_path)), None
    except Exception as exc:
        return None, str(exc)


def parse_field_value(field: Dict[str, Any], raw_value: Any) -> Any:
    if raw_value in (None, ""):
        raise ValueError(f"Missing value for {field['label']}.")

    if field["cast"] == "str":
        return str(raw_value)
    if field["cast"] == "int":
        return int(round(float(raw_value)))
    return float(raw_value)


def default_form_values(fields: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {field["name"]: field["default"] for field in fields}


def collect_input_data(fields: List[Dict[str, Any]], source: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    applicant_data: Dict[str, Any] = {}
    form_values = default_form_values(fields)

    for field in fields:
        raw_value = source.get(field["name"])
        if raw_value is None:
            for alias in field.get("aliases", []):
                if alias in source:
                    raw_value = source[alias]
                    break

        if raw_value is None:
            raw_value = form_values[field["name"]]

        parsed_value = parse_field_value(field, raw_value)
        applicant_data[field["name"]] = parsed_value
        form_values[field["name"]] = parsed_value

    return applicant_data, form_values


def ensure_model_ready(bundle: Optional[Dict[str, Any]], error: Optional[str], label: str) -> Dict[str, Any]:
    if bundle is None:
        raise RuntimeError(f"{label} model is not ready. {error or 'Train the model first.'}")
    return bundle


def serialize_fields(fields: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    response_fields: List[Dict[str, Any]] = []
    for field in fields:
        response_field = {
            "name": field["name"],
            "label": field["label"],
            "widget": field["widget"],
            "default": field["default"],
            "cast": field["cast"],
        }
        if "step" in field:
            response_field["step"] = field["step"]
        if "options" in field:
            response_field["options"] = field["options"]
        if "aliases" in field:
            response_field["aliases"] = field["aliases"]
        response_fields.append(response_field)
    return response_fields


@app.after_request
def add_cors_headers(response: Any) -> Any:
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


LOAN_MODEL_PATH = Path(LOAN_MODEL_FILE)
CREDIT_MODEL_PATH = Path(CREDIT_MODEL_FILE)
LOAN_MODEL_BUNDLE, LOAN_MODEL_ERROR = safe_load_bundle(load_loan_bundle, LOAN_MODEL_PATH)
CREDIT_MODEL_BUNDLE, CREDIT_MODEL_ERROR = safe_load_bundle(load_credit_bundle, CREDIT_MODEL_PATH)


@app.get("/")
def home() -> Any:
    return jsonify(
        {
            "service": "bank-risk-backend",
            "message": "Backend API for loan approval prediction and credit risk assessment.",
            "routes": {
                "health": "/health",
                "forms": "/api/forms",
                "loan_approval": "/api/loan-approval",
                "credit_risk": "/api/credit-risk",
            },
        }
    )


@app.get("/health")
def health() -> Any:
    return jsonify(
        {
            "status": "ok",
            "loan_approval": {
                "loaded": LOAN_MODEL_BUNDLE is not None,
                "model_path": str(LOAN_MODEL_PATH),
                "error": LOAN_MODEL_ERROR,
            },
            "credit_risk": {
                "loaded": CREDIT_MODEL_BUNDLE is not None,
                "model_path": str(CREDIT_MODEL_PATH),
                "error": CREDIT_MODEL_ERROR,
            },
        }
    )


@app.get("/api/forms")
def api_forms() -> Any:
    return jsonify(
        {
            "loan_approval": serialize_fields(LOAN_FIELDS),
            "credit_risk": serialize_fields(CREDIT_FIELDS),
        }
    )


@app.get("/api/forms/loan-approval")
def api_loan_fields() -> Any:
    return jsonify({"fields": serialize_fields(LOAN_FIELDS)})


@app.get("/api/forms/credit-risk")
def api_credit_fields() -> Any:
    return jsonify({"fields": serialize_fields(CREDIT_FIELDS)})


@app.post("/api/loan-approval")
def api_loan_approval() -> Any:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Send a JSON object in the request body."}), 400

    try:
        bundle = ensure_model_ready(LOAN_MODEL_BUNDLE, LOAN_MODEL_ERROR, "Loan approval")
        applicant_data, _ = collect_input_data(LOAN_FIELDS, payload)
        prediction = predict_loan_approval(applicant_data, model_bundle=bundle)
        return jsonify(prediction)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/credit-risk")
def api_credit_risk() -> Any:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Send a JSON object in the request body."}), 400

    try:
        bundle = ensure_model_ready(CREDIT_MODEL_BUNDLE, CREDIT_MODEL_ERROR, "Credit risk")
        applicant_data, _ = collect_input_data(CREDIT_FIELDS, payload)
        prediction = predict_credit_risk(applicant_data, model_bundle=bundle)
        return jsonify(prediction)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/predict")
def legacy_loan_route() -> Any:
    return api_loan_approval()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
