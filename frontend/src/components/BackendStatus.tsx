import { useEffect, useState } from "react";
import { checkHealth, API_BASE } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const BackendStatus = () => {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let mounted = true;
    const ping = async () => {
      const ok = await checkHealth();
      if (mounted) setStatus(ok ? "online" : "offline");
    };
    ping();
    const id = setInterval(ping, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const config = {
    checking: { label: "Connecting…", dot: "bg-warning", ring: "ring-warning/30" },
    online: { label: "Backend Online", dot: "bg-success animate-pulse-glow", ring: "ring-success/30" },
    offline: { label: "Backend Offline", dot: "bg-destructive", ring: "ring-destructive/30" },
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-xs font-medium ring-1",
        config.ring
      )}
      title={API_BASE}
    >
      <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      <span className="text-foreground/90">{config.label}</span>
      <span className="hidden sm:inline text-muted-foreground/70 font-mono text-[10px]">
        {API_BASE.replace("http://", "")}
      </span>
    </motion.div>
  );
};
