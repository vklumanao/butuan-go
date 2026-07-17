import { cn } from "@/lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }) {
  return <div className={cn("p-6 pb-3", className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return (
    <h2
      className={cn("text-lg font-bold text-slate-950", className)}
      {...props}
    />
  );
}
export function CardDescription({ className, ...props }) {
  return (
    <p className={cn("mt-1 text-sm text-slate-600", className)} {...props} />
  );
}
export function CardContent({ className, ...props }) {
  return <div className={cn("p-6 pt-3", className)} {...props} />;
}
export function CardFooter({ className, ...props }) {
  return (
    <div className={cn("flex items-center p-6 pt-3", className)} {...props} />
  );
}
