import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AdminPageHeader({ title, description, actions = null }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Badge className="bg-slate-950 text-white">
          <ShieldCheck className="h-3.5 w-3.5" />
          Protected Admin workspace
        </Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600">
          {description}
        </p>
      </div>
      {actions}
    </div>
  );
}
