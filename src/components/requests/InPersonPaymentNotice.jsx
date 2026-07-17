import { HandCoins, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function InPersonPaymentNotice({ className, compact = false }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-accent-200 bg-accent-50 text-accent-900",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-accent-700 shadow-sm ring-1 ring-accent-200">
          <HandCoins className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold">Direct in-person payment</p>
          <p className="mt-1 text-sm leading-6 text-accent-900/80">
            The Requestor pays the Runner directly during meetup or delivery,
            after reviewing the completed errand and applicable receipts.
            ButuanGo does not collect, hold, or process the payment.
          </p>
        </div>
      </div>
      {!compact && (
        <div className="mt-3 flex gap-2 border-t border-accent-200 pt-3 text-xs leading-5 text-accent-900/75">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Never share a PIN, OTP, password, banking credential, or payment
            account access with another user.
          </p>
        </div>
      )}
    </div>
  );
}
