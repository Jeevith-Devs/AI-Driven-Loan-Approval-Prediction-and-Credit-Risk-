import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BaseProps {
  label: string;
  hint?: string;
}

interface NumberFieldProps extends BaseProps {
  type?: "number";
  value: number | "";
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  placeholder?: string;
}

export const NumberField = ({ label, hint, value, onChange, min, step, placeholder }: NumberFieldProps) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
    <Input
      type="number"
      min={min}
      step={step ?? "any"}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className="bg-input/60 border-border/70 focus:border-primary focus:ring-primary/20 h-10"
    />
    {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
  </div>
);

interface SelectFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

export const SelectField = ({ label, value, onChange, options, hint }: SelectFieldProps) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-input/60 border-border/70 h-10">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
  </div>
);

export const FieldGroup = ({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) => (
  <div className="field-group">
    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
      {icon && <div className="text-primary">{icon}</div>}
      <h3 className="font-semibold text-sm tracking-wide">{title}</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
  </div>
);
