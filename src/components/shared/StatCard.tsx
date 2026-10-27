import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  sub?: string;
  info?: string;
}

export function StatCard({ label, value, icon, trend, sub, info }: StatCardProps) {
  return (
    <Card className="rounded-2xl shadow-none ring-1 ring-border">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
          {trend && (
            <span className="text-xs font-medium text-green-600">{trend}</span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {info && (
              <TooltipProvider delay={0}>
                <Tooltip>
                  <TooltipTrigger
                    aria-label="Plus d'informations"
                    className="-m-1.5 cursor-help rounded-full p-1.5 text-muted-foreground/70 transition-colors hover:text-muted-foreground"
                  >
                    <Info className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>{info}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
