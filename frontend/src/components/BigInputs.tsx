import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/* Big, hero-style inputs used inside the Wizard */

export const BigNumber = ({
  value, onChange, suffix, prefix, placeholder,
}: {
  value: number | "";
  onChange: (v: number) => void;
  suffix?: string; prefix?: string; placeholder?: string;
  min?: number; // accepted for API compatibility, not enforced visually
}) => {
  const display = value === 0 || value === "" ? "" : String(value);
  return (
    <div className="relative">
      {prefix && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-light z-10">{prefix}</span>}
      <Input
        type="text"
        inputMode="decimal"
        autoFocus
        autoComplete="off"
        placeholder={placeholder ?? "0"}
        value={display}
        onChange={(e) => {
          // Allow only digits and a single decimal point
          const cleaned = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
          if (cleaned === "" || cleaned === ".") { onChange(0); return; }
          const n = Number(cleaned);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="h-20 text-4xl md:text-5xl font-bold tracking-tight bg-input/40 border-2 border-border/70 focus:border-primary focus:ring-4 focus:ring-primary/15 rounded-xl"
        style={{ paddingLeft: prefix ? "3rem" : undefined, paddingRight: suffix ? "5rem" : undefined }}
      />
      {suffix && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-base text-muted-foreground uppercase tracking-wider">{suffix}</span>}
    </div>
  );
};

export const BigChoice = ({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: ReactNode }[];
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {options.map((o) => {
      const active = value === o.value;
      return (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`relative p-5 rounded-xl border-2 text-left transition-all ${
            active
              ? "border-primary bg-primary/10 shadow-glow"
              : "border-border/60 bg-input/30 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          {o.icon && <div className="mb-2 text-primary">{o.icon}</div>}
          <div className={`font-semibold ${active ? "text-foreground" : "text-foreground/85"}`}>{o.label}</div>
          {active && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />}
        </button>
      );
    })}
  </div>
);

export const BigSelect = ({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="h-16 text-xl bg-input/40 border-2 border-border/70 focus:border-primary rounded-xl px-5">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value} className="text-base py-3">{o.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);
