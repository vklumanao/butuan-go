import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  const styles =
    variant === "secondary"
      ? "bg-accent-100 text-accent-800"
      : "bg-brand-100 text-brand-800";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        styles,
        className,
      )}
      {...props}
    />
  );
}
