import { PredictionWorkbench } from "@/components/PredictionWorkbench";
import { loanFields } from "@/lib/forms";

export default function LoanApprovalPage() {
  return (
    <PredictionWorkbench
      endpoint="/api/loan-approval"
      fields={loanFields}
      eyebrow="Loan Approval"
      title="Decide whether the bank should approve this loan."
      description="Use the applicant's salary, assets, CIBIL score, liabilities, and loan details to estimate repayment success and bank recommendation."
      mode="loan"
    />
  );
}
