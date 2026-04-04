export type FieldOption = {
  label: string;
  value: string;
};

export type FieldConfig = {
  name: string;
  label: string;
  widget: "number" | "select";
  section: string;
  defaultValue: string;
  step?: string;
  helper?: string;
  options?: FieldOption[];
};

function selectOptions(values: Array<[string, string]>): FieldOption[] {
  return values.map(([label, value]) => ({ label, value }));
}

export const loanFields: FieldConfig[] = [
  { name: "Age", label: "Age", widget: "number", section: "Applicant Profile", defaultValue: "32", step: "1" },
  {
    name: "Employment_Status",
    label: "Employment Status",
    widget: "select",
    section: "Applicant Profile",
    defaultValue: "Salaried",
    options: selectOptions([
      ["Salaried", "Salaried"],
      ["Self Employed", "Self_Employed"],
      ["Business", "Business"],
      ["Contract", "Contract"],
    ]),
  },
  { name: "Employment_Years", label: "Employment Years", widget: "number", section: "Applicant Profile", defaultValue: "8", step: "0.1" },
  {
    name: "Residence_Status",
    label: "Residence Status",
    widget: "select",
    section: "Applicant Profile",
    defaultValue: "Rented",
    options: selectOptions([
      ["Owned", "Owned"],
      ["Rented", "Rented"],
      ["Family", "Family"],
    ]),
  },
  { name: "Dependents", label: "Dependents", widget: "number", section: "Applicant Profile", defaultValue: "1", step: "1" },
  {
    name: "Annual_Income",
    label: "Annual Income",
    widget: "number",
    section: "Income and Assets",
    defaultValue: "120000",
    step: "0.01",
    helper: "Use the latest verified annual income.",
  },
  { name: "Monthly_Expenses", label: "Monthly Expenses", widget: "number", section: "Income and Assets", defaultValue: "2500", step: "0.01" },
  { name: "Savings_Balance", label: "Savings Balance", widget: "number", section: "Income and Assets", defaultValue: "18000", step: "0.01" },
  { name: "Assets_Value", label: "Assets Value", widget: "number", section: "Income and Assets", defaultValue: "240000", step: "0.01" },
  {
    name: "CIBIL_Score",
    label: "CIBIL Score",
    widget: "number",
    section: "Credit Behaviour",
    defaultValue: "760",
    step: "1",
    helper: "CIBIL is a major driver for both approval and pricing.",
  },
  { name: "Credit_History_Years", label: "Credit History Years", widget: "number", section: "Credit Behaviour", defaultValue: "9", step: "0.1" },
  { name: "Other_Credit_Count", label: "Other Credit Count", widget: "number", section: "Credit Behaviour", defaultValue: "1", step: "1" },
  { name: "Other_Credit_Amount", label: "Other Credit Amount", widget: "number", section: "Credit Behaviour", defaultValue: "12000", step: "0.01" },
  { name: "Existing_EMI", label: "Existing EMI", widget: "number", section: "Credit Behaviour", defaultValue: "320", step: "0.01" },
  { name: "Late_Payment_Count", label: "Late Payment Count", widget: "number", section: "Credit Behaviour", defaultValue: "0", step: "1" },
  { name: "Missed_Payment_Count", label: "Missed Payment Count", widget: "number", section: "Credit Behaviour", defaultValue: "0", step: "1" },
  { name: "Late_Credit_Close_Count", label: "Late Credit Close Count", widget: "number", section: "Credit Behaviour", defaultValue: "0", step: "1" },
  {
    name: "Loan_Type",
    label: "Loan Type",
    widget: "select",
    section: "Loan Request",
    defaultValue: "Home",
    options: selectOptions([
      ["Personal", "Personal"],
      ["Business", "Business"],
      ["Education", "Education"],
      ["Jewellery", "Jewellery"],
      ["Home", "Home"],
      ["Car", "Car"],
    ]),
  },
  { name: "Loan_Amount", label: "Loan Amount", widget: "number", section: "Loan Request", defaultValue: "85000", step: "0.01" },
  { name: "Loan_Term_Months", label: "Loan Term (Months)", widget: "number", section: "Loan Request", defaultValue: "60", step: "1" },
];

export const creditFields: FieldConfig[] = [
  { name: "Age", label: "Age", widget: "number", section: "Applicant Profile", defaultValue: "41", step: "1" },
  {
    name: "Employment_Status",
    label: "Employment Status",
    widget: "select",
    section: "Applicant Profile",
    defaultValue: "Business",
    options: selectOptions([
      ["Salaried", "Salaried"],
      ["Self Employed", "Self_Employed"],
      ["Business", "Business"],
      ["Contract", "Contract"],
    ]),
  },
  { name: "Employment_Years", label: "Employment Years", widget: "number", section: "Applicant Profile", defaultValue: "6", step: "0.1" },
  {
    name: "Residence_Status",
    label: "Residence Status",
    widget: "select",
    section: "Applicant Profile",
    defaultValue: "Owned",
    options: selectOptions([
      ["Owned", "Owned"],
      ["Rented", "Rented"],
      ["Family", "Family"],
    ]),
  },
  { name: "Dependents", label: "Dependents", widget: "number", section: "Applicant Profile", defaultValue: "2", step: "1" },
  { name: "Annual_Income", label: "Annual Income", widget: "number", section: "Income and Security", defaultValue: "140000", step: "0.01" },
  { name: "Monthly_Expenses", label: "Monthly Expenses", widget: "number", section: "Income and Security", defaultValue: "3600", step: "0.01" },
  { name: "Savings_Balance", label: "Savings Balance", widget: "number", section: "Income and Security", defaultValue: "28000", step: "0.01" },
  { name: "Assets_Value", label: "Assets Value", widget: "number", section: "Income and Security", defaultValue: "320000", step: "0.01" },
  { name: "Collateral_Value", label: "Collateral Value", widget: "number", section: "Income and Security", defaultValue: "90000", step: "0.01" },
  { name: "CIBIL_Score", label: "CIBIL Score", widget: "number", section: "Credit Behaviour", defaultValue: "695", step: "1" },
  { name: "Credit_History_Years", label: "Credit History Years", widget: "number", section: "Credit Behaviour", defaultValue: "7", step: "0.1" },
  { name: "Credit_Utilization_Ratio", label: "Credit Utilization Ratio", widget: "number", section: "Credit Behaviour", defaultValue: "0.42", step: "0.01" },
  { name: "Recent_Credit_Inquiries", label: "Recent Credit Inquiries", widget: "number", section: "Credit Behaviour", defaultValue: "2", step: "1" },
  { name: "Existing_Loan_Count", label: "Existing Loan Count", widget: "number", section: "Credit Behaviour", defaultValue: "2", step: "1" },
  { name: "Existing_EMI", label: "Existing EMI", widget: "number", section: "Credit Behaviour", defaultValue: "1100", step: "0.01" },
  { name: "Delinquency_Count", label: "Delinquency Count", widget: "number", section: "Credit Behaviour", defaultValue: "1", step: "1" },
  { name: "Missed_Payment_Count", label: "Missed Payment Count", widget: "number", section: "Credit Behaviour", defaultValue: "0", step: "1" },
  {
    name: "Prior_Default_Flag",
    label: "Prior Default History",
    widget: "select",
    section: "Credit Behaviour",
    defaultValue: "0",
    options: selectOptions([
      ["No", "0"],
      ["Yes", "1"],
    ]),
  },
  {
    name: "Loan_Type",
    label: "Loan Type",
    widget: "select",
    section: "Loan Request",
    defaultValue: "Business",
    options: selectOptions([
      ["Personal", "Personal"],
      ["Business", "Business"],
      ["Education", "Education"],
      ["Jewellery", "Jewellery"],
      ["Home", "Home"],
      ["Car", "Car"],
    ]),
  },
  { name: "Loan_Amount", label: "Loan Amount", widget: "number", section: "Loan Request", defaultValue: "95000", step: "0.01" },
  { name: "Loan_Term_Months", label: "Loan Term (Months)", widget: "number", section: "Loan Request", defaultValue: "48", step: "1" },
];

export function buildInitialValues(fields: FieldConfig[]): Record<string, string> {
  return fields.reduce<Record<string, string>>((values, field) => {
    values[field.name] = field.defaultValue;
    return values;
  }, {});
}
