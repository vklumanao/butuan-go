import { LoaderCircle } from "lucide-react";

export function FullPageLoader({ message = "Loading your account…" }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4"
      role="status"
    >
      <LoaderCircle className="h-9 w-9 animate-spin text-brand-600" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}
