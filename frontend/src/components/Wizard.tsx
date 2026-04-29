import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WizardStep {
  key: string;
  label: string;
  group: string;
  hint?: string;
  render: () => ReactNode;
  isValid?: () => boolean;
}

interface WizardProps {
  steps: WizardStep[];
  onSubmit: () => Promise<void> | void;
  submitting: boolean;
  submitLabel?: string;
}

export const Wizard = ({ steps, onSubmit, submitting, submitLabel = "Run Prediction" }: WizardProps) => {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const step = steps[i];
  const isLast = i === steps.length - 1;
  const progress = ((i + 1) / steps.length) * 100;
  const valid = step.isValid ? step.isValid() : true;

  const next = () => { if (!valid) return; setDir(1); setI((x) => Math.min(x + 1, steps.length - 1)); };
  const prev = () => { setDir(-1); setI((x) => Math.max(x - 1, 0)); };

  return (
    <div className="glass-panel rounded-2xl p-6 md:p-10 max-w-3xl mx-auto">
      {/* Progress header */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          <span className="text-primary">{step.group}</span>
          <span className="font-mono">Step {i + 1} / {steps.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Field */}
      <div className="min-h-[260px] flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step.key}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{step.label}</h2>
            {step.hint && <p className="text-sm text-muted-foreground mb-6">{step.hint}</p>}
            <div className="mt-4">{step.render()}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/50">
        <Button variant="ghost" onClick={prev} disabled={i === 0 || submitting} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-1">
          {steps.map((s, idx) => (
            <button
              key={s.key}
              onClick={() => { setDir(idx > i ? 1 : -1); setI(idx); }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === i ? "w-6 bg-primary" : idx < i ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"
              )}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>
        {isLast ? (
          <Button onClick={() => onSubmit()} disabled={!valid || submitting} className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Sparkles className="h-4 w-4" /> {submitLabel}</>}
          </Button>
        ) : (
          <Button onClick={next} disabled={!valid} className="bg-gradient-primary text-primary-foreground hover:opacity-90 gap-2">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const StepIndicator = ({ done }: { done?: boolean }) => (
  <span className={cn("inline-flex items-center gap-1 text-xs", done ? "text-success" : "text-muted-foreground")}>
    {done && <Check className="h-3 w-3" />}
  </span>
);
