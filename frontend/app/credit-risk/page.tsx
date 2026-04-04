import { PredictionWorkbench } from "@/components/PredictionWorkbench";
import { creditFields } from "@/lib/forms";

export default function CreditRiskPage() {
  return (
    <PredictionWorkbench
      endpoint="/api/credit-risk"
      fields={creditFields}
      eyebrow="Credit Risk"
      title="Measure default risk before the bank lends."
      description="Estimate default probability, risk band, and the key strengths and warning signals in the borrower's profile."
      mode="credit"
    />
  );
}
