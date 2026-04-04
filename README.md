# AI-Driven Loan Approval Prediction and Credit Risk Assessment Using Ensemble Machine Learning and Predictive Analytics

This project is now organized as a clean full-stack application:

- `frontend/` contains the Next.js web app
- `backend/` contains the Python API, model training scripts, datasets, and saved models
- `docs/` contains the project report

The system supports two bank-side workflows:

- `Loan Approval Prediction`
- `Credit Risk Assessment`

Both workflows use applicant financial details such as income, assets, CIBIL score, liabilities, repayment history, and loan details to help banking teams make faster and more consistent lending decisions.

## Final Structure

```text
New project/
|-- backend/
|   |-- app.py
|   |-- train_all_models.py
|   |-- requirements.txt
|   |-- data/
|   |   |-- synthetic_loan_approval_dataset.csv
|   |   `-- synthetic_credit_risk_dataset.csv
|   |-- data_generators/
|   |   |-- generate_loan_dataset.py
|   |   `-- generate_credit_risk_dataset.py
|   |-- ml/
|   |   |-- loan_approval_model.py
|   |   `-- credit_risk_model.py
|   `-- models/
|       |-- loan_approval_model.pkl
|       `-- credit_risk_model.pkl
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- lib/
|   |-- package.json
|   `-- next.config.js
|-- docs/
|   `-- PROJECT_REPORT.md
|-- .gitignore
`-- README.md
```

## What the Backend Does

The Python backend exposes JSON APIs for:

- `/health`
- `/api/forms`
- `/api/forms/loan-approval`
- `/api/forms/credit-risk`
- `/api/loan-approval`
- `/api/credit-risk`

The backend loads the trained Random Forest based model bundles and returns:

- prediction decision
- approval or default probability
- recommendation
- risk level or risk band
- strengths
- concerns
- key metrics

## What the Frontend Does

The Next.js frontend provides:

- dashboard page
- loan approval analysis page
- credit risk analysis page
- API-driven result cards
- backend health status

## Current Best Scores

### Loan Approval

- Decision Tree accuracy:
  - cross-validation: `85.92%`
  - test set: `85.10%`
- Random Forest accuracy:
  - cross-validation: `89.00%`
  - test set: `88.20%`
- Best model: `Random Forest`

### Credit Risk

- Decision Tree accuracy:
  - cross-validation: `79.00%`
  - test set: `79.67%`
- Random Forest accuracy:
  - cross-validation: `87.62%`
  - test set: `86.42%`
- Best model: `Random Forest`

## Backend Setup

Install Python dependencies:

```powershell
py -m pip install -r backend/requirements.txt
```

Train or retrain all backend assets:

```powershell
py backend/train_all_models.py
```

Start the backend API:

```powershell
py backend/app.py
```

Backend URL:

```text
http://127.0.0.1:5000
```

## Frontend Setup

Open another terminal:

```powershell
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Frontend URL:

```text
http://127.0.0.1:3000
```

## Example Loan Approval Payload

```json
{
  "Age": 32,
  "Employment_Status": "Salaried",
  "Employment_Years": 8,
  "Residence_Status": "Rented",
  "Dependents": 1,
  "Loan_Type": "Home",
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
  "Loan_Term_Months": 60
}
```

## Example Credit Risk Payload

```json
{
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
  "Loan_Term_Months": 48
}
```

## Notes

- `CIBIL_Score` is included across the full pipeline.
- The project currently uses synthetic data for safe experimentation and academic demonstration.
- The backend is now API-only because the UI is handled by Next.js.
- For real banking deployment, add compliance checks, audit logging, security controls, bias review, document verification, and human underwriting review.
