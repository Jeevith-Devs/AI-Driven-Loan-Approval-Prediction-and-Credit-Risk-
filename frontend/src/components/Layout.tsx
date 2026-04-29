import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";

export const Layout = () => (
  <div className="min-h-screen flex flex-col">
    <AppHeader />
    <main className="flex-1">
      <Outlet />
    </main>
    <footer className="border-t border-border/60 mt-16">
      <div className="container py-6 text-xs text-muted-foreground flex items-center justify-between">
        <span>© CREDITY · AI-Driven Loan & Credit Intelligence</span>
        <span className="font-mono">v1.0</span>
      </div>
    </footer>
  </div>
);
