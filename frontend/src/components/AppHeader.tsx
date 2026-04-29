import { Link, useLocation } from "react-router-dom";
import { BackendStatus } from "./BackendStatus";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const nav = [
  { to: "/", label: "Overview" },
  { to: "/loan-approval", label: "Loan Approval" },
  { to: "/credit-risk", label: "Credit Risk" },
];

export const AppHeader = () => {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow group-hover:scale-110 transition-transform">
            <Sparkles className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">CREDITY</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Risk Intelligence</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 glass-panel rounded-full p-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm transition-all",
                pathname === n.to
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <BackendStatus />
      </div>
    </header>
  );
};
