import { cn } from "@/lib/utils";

export function Alert({ className, variant = "default", ...props }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border p-4 text-sm",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-brand-200 bg-brand-50 text-brand-900",
        className,
      )}
      {...props}
    />
  );
}
export function AlertTitle({ className, ...props }) {
  return <h3 className={cn("mb-1 font-semibold", className)} {...props} />;
}
export function AlertDescription({ className, ...props }) {
  return <div className={cn("leading-relaxed", className)} {...props} />;
}
