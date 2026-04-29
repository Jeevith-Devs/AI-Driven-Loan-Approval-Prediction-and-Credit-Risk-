import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, TrendingUp, Brain, Database, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="container relative pt-20 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-3 py-1 text-xs mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" />
              <span className="text-muted-foreground">Powered by ML · Real-time inference</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              Decisive credit intelligence,<br />
              <span className="text-gradient">engineered for banks.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              CREDITY fuses applicant profiling with state-of-the-art ML models to deliver
              instant loan approval recommendations and granular credit risk assessments — with
              transparent reason codes your underwriters can trust.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow h-12 px-6">
                <Link to="/loan-approval">Run Approval Prediction <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 border-border hover:border-primary/60 hover:bg-primary/5">
                <Link to="/credit-risk">Assess Credit Risk</Link>
              </Button>
            </div>
          </motion.div>

          {/* Floating stat tiles */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { k: "Inference", v: "<200ms", icon: Zap },
              { k: "Models", v: "Ensemble", icon: Brain },
              { k: "Features", v: "20+", icon: Database },
              { k: "Explainability", v: "SHAP", icon: BarChart3 },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-5">
                <s.icon className="h-5 w-5 text-primary mb-3" />
                <div className="text-2xl font-bold">{s.v}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.k}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* WORKFLOW CARDS */}
      <section className="container py-16">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-[0.25em] text-primary mb-2">Workflows</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Two intelligent pipelines.</h2>
          <p className="text-muted-foreground mt-2">Select the workflow that matches your decisioning need.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <WorkflowCard
            to="/loan-approval"
            icon={<ShieldCheck className="h-6 w-6" />}
            tag="Decisioning"
            tagColor="primary"
            title="Loan Approval Prediction"
            desc="Estimate sanction probability for an applicant. Get an Approve/Reject signal with confidence score and explainable strengths and concerns."
            bullets={["Approval probability", "Top strengths", "Risk concerns", "20 input features"]}
          />
          <WorkflowCard
            to="/credit-risk"
            icon={<TrendingUp className="h-6 w-6" />}
            tag="Risk Modeling"
            tagColor="danger"
            title="Credit Risk Assessment"
            desc="Quantify probability of default and assign a risk band. Detailed reason codes describe the borrower's credit quality and exposure."
            bullets={["PD score", "Risk band (Low/Med/High)", "Reason codes", "22 input features"]}
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-16">
        <div className="text-xs uppercase tracking-[0.25em] text-primary mb-2">How it works</div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10">From application to decision in seconds.</h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", title: "Capture profile", desc: "Bank staff enter the applicant's personal, financial, and credit-history data via grouped intelligent forms." },
            { n: "02", title: "ML inference", desc: "Data is sent to the Python ML backend, which scores the applicant using trained ensemble models." },
            { n: "03", title: "Explainable result", desc: "A clear decision, probability, risk band and human-readable reasons are returned to the underwriter." },
          ].map((s) => (
            <div key={s.n} className="glass-card rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -top-2 -right-2 text-7xl font-bold text-primary/5 select-none">{s.n}</div>
              <div className="text-xs font-mono text-primary mb-3">{s.n}</div>
              <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const WorkflowCard = ({
  to, icon, tag, tagColor, title, desc, bullets,
}: { to: string; icon: React.ReactNode; tag: string; tagColor: "primary" | "danger"; title: string; desc: string; bullets: string[] }) => (
  <Link to={to} className="group block">
    <div className="glass-card rounded-2xl p-7 h-full relative overflow-hidden">
      <div className={`absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl opacity-20 ${tagColor === "primary" ? "bg-primary" : "bg-destructive"}`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div className={`h-12 w-12 rounded-xl grid place-items-center ${tagColor === "primary" ? "bg-gradient-primary shadow-glow" : "bg-gradient-danger shadow-glow-danger"}`}>
            <span className="text-primary-foreground">{icon}</span>
          </div>
          <span className={`text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full ${tagColor === "primary" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{tag}</span>
        </div>
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-5">{desc}</p>
        <ul className="grid grid-cols-2 gap-2 mb-6">
          {bullets.map((b) => (
            <li key={b} className="text-xs text-muted-foreground flex items-center gap-2">
              <span className={`h-1 w-1 rounded-full ${tagColor === "primary" ? "bg-primary" : "bg-destructive"}`} />
              {b}
            </li>
          ))}
        </ul>
        <div className="inline-flex items-center text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          Open workflow <ArrowRight className="ml-1.5 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  </Link>
);

export default Index;
