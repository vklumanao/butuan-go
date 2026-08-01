import { Badge } from "@/components/ui/badge";
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
} from "@/lib/requestConstants";
import { cn } from "@/lib/utils";

const statusStyles = {
  [REQUEST_STATUSES.OPEN]: "bg-brand-100 text-brand-800",
  [REQUEST_STATUSES.ACCEPTED]: "bg-sky-100 text-sky-800",
  [REQUEST_STATUSES.IN_PROGRESS]: "bg-accent-100 text-accent-900",
  [REQUEST_STATUSES.AWAITING_CONFIRMATION]: "bg-violet-100 text-violet-800",
  [REQUEST_STATUSES.COMPLETED]: "bg-emerald-100 text-emerald-800",
  [REQUEST_STATUSES.CANCELLED]: "bg-slate-200 text-slate-700",
  [REQUEST_STATUSES.FAILED]: "bg-red-100 text-red-800",
};

export function RequestStatusBadge({ status, className }) {
  return (
    <Badge
      className={cn(
        statusStyles[status] || "bg-slate-100 text-slate-700",
        className,
      )}
    >
      {REQUEST_STATUS_LABELS[status] || status}
    </Badge>
  );
}
