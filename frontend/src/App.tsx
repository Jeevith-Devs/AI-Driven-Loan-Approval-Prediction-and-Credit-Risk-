import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index.tsx";
import LoanApprovalWizard from "./pages/LoanApprovalWizard.tsx";
import LoanApprovalResult from "./pages/LoanApprovalResult.tsx";
import CreditRiskWizard from "./pages/CreditRiskWizard.tsx";
import CreditRiskResultPage from "./pages/CreditRiskResult.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/loan-approval" element={<LoanApprovalWizard />} />
            <Route path="/loan-approval/result" element={<LoanApprovalResult />} />
            <Route path="/credit-risk" element={<CreditRiskWizard />} />
            <Route path="/credit-risk/result" element={<CreditRiskResultPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
