import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types";

const statusConfig: Record<OrderStatus, { className: string; dot: string }> = {
  new: { className: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  preparing: { className: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  ready: { className: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  completed: { className: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  const t = useTranslations("orderStatus");
  return (
    <Badge
      variant="outline"
      className={`shrink-0 gap-1.5 border font-medium ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {t(status)}
    </Badge>
  );
}
