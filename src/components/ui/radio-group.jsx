import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function RadioGroup({ className, ...props }) {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}
export function RadioGroupItem({ className, children, ...props }) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "group relative w-full rounded-xl border border-slate-200 p-4 text-left outline-none transition hover:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-600 data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-50",
        className,
      )}
      {...props}
    >
      {children}
      <RadioGroupPrimitive.Indicator className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
        <Check className="h-3 w-3" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}
