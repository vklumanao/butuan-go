import {
  HandCoins,
  ReceiptText,
  ShieldAlert,
  Store,
  UserRound,
} from "lucide-react";
import {
  PAYMENT_ARRANGEMENTS,
  PAYMENT_ARRANGEMENT_LABELS,
  PAYMENT_PAYER_LABELS,
  PAYMENT_PAYER_TYPES,
} from "@/lib/requestConstants";
import { formatCurrency } from "@/lib/requestUtils";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

const PAYMENT_ARRANGEMENT_DESCRIPTIONS = Object.freeze({
  [PAYMENT_ARRANGEMENTS.NO_PURCHASE]:
    "No purchase reimbursement is expected. The selected payer pays only the agreed Runner fee.",
  [PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID]:
    "The purchase is paid with the merchant before pickup. The Runner does not use personal money for the item.",
  [PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE]:
    "The Runner may voluntarily use personal money up to the agreed limit and is paid directly after receipt review.",
});

export function RequestPaymentFields({
  register,
  errors,
  paymentArrangement,
  payerType,
  expenseBudget,
  idPrefix = "payment",
}) {
  return (
    <section
      className="rounded-xl border border-slate-200 p-4 sm:p-5"
      aria-labelledby={`${idPrefix}PaymentHeading`}
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-100 text-accent-800">
          <HandCoins className="h-4 w-4" />
        </div>
        <div>
          <h3
            id={`${idPrefix}PaymentHeading`}
            className="font-black text-slate-950"
          >
            Payment arrangement
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Runners see the arrangement and maximum cash exposure before
            accepting. Private payer details appear only after acceptance.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <FormField
          id={`${idPrefix}Arrangement`}
          label="How will purchase expenses be handled?"
          error={errors.paymentArrangement?.message}
        >
          <select
            id={`${idPrefix}Arrangement`}
            className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
            {...register("paymentArrangement")}
          >
            <option value="">Choose a payment arrangement</option>
            {Object.entries(PAYMENT_ARRANGEMENT_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </FormField>

        {paymentArrangement === PAYMENT_ARRANGEMENTS.NO_PURCHASE && (
          <Alert className="border-slate-200 bg-slate-50 text-slate-800">
            No item purchase is required. Keep the estimated errand expense at
            ₱0; only the Runner fee will be collected.
          </Alert>
        )}

        {paymentArrangement === PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID && (
          <>
            <Alert className="border-brand-200 bg-brand-50 text-brand-950">
              <Store className="mb-2 h-5 w-5 text-brand-700" />
              The Requestor pays the merchant before pickup. The Runner will not
              use personal money for the purchase.
            </Alert>
            <FormField
              id={`${idPrefix}MerchantReference`}
              label="Prepaid merchant or order reference"
              error={errors.merchantReference?.message}
            >
              <Input
                id={`${idPrefix}MerchantReference`}
                placeholder="Example: Store name and order number"
                maxLength={160}
                {...register("merchantReference")}
              />
            </FormField>
          </>
        )}

        {paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-950">
            <ShieldAlert className="mb-2 h-5 w-5 text-amber-700" />
            The Runner may voluntarily use personal money up to{" "}
            <strong>{formatCurrency(expenseBudget)}</strong>. A Runner must
            explicitly consent before accepting this request.
          </Alert>
        )}

        <FormField
          id={`${idPrefix}PayerType`}
          label={
            paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
              ? "Who will reimburse expenses and pay the Runner fee?"
              : "Who will pay the Runner fee?"
          }
          error={errors.payerType?.message}
        >
          <select
            id={`${idPrefix}PayerType`}
            className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
            {...register("payerType")}
          >
            {Object.entries(PAYMENT_PAYER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        {payerType === PAYMENT_PAYER_TYPES.RECIPIENT && (
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id={`${idPrefix}PayerName`}
              label="Payer name"
              error={errors.payerName?.message}
            >
              <Input
                id={`${idPrefix}PayerName`}
                maxLength={120}
                {...register("payerName")}
              />
            </FormField>
            <FormField
              id={`${idPrefix}PayerPhone`}
              label="Payer phone"
              error={errors.payerPhone?.message}
            >
              <Input
                id={`${idPrefix}PayerPhone`}
                type="tel"
                inputMode="tel"
                maxLength={30}
                {...register("payerPhone")}
              />
            </FormField>
          </div>
        )}
      </div>
    </section>
  );
}

export function PaymentTermsSummary({
  terms,
  details = null,
  expenseBudget = 0,
  serviceFee = 0,
  compact = false,
}) {
  if (!terms) {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-950">
        Payment arrangement is unavailable. The Requestor must update this
        request before it can be accepted.
      </Alert>
    );
  }

  const arrangementLabel =
    PAYMENT_ARRANGEMENT_LABELS[terms.arrangement] || terms.arrangement;
  const payerLabel = PAYMENT_PAYER_LABELS[terms.payer_type] || terms.payer_type;
  const arrangementDescription =
    PAYMENT_ARRANGEMENT_DESCRIPTIONS[terms.arrangement] ||
    "Review the agreed payment terms before continuing.";
  const maximumAdvance = Number(terms.maximum_advance) || 0;
  const runnerFee = Number(serviceFee) || 0;
  const total =
    terms.arrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
      ? maximumAdvance + runnerFee
      : runnerFee;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex gap-3">
        <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-700">
            Direct-payment plan
          </p>
          <p className="font-bold text-slate-950">{arrangementLabel}</p>
          <p className="mt-1 text-sm text-slate-600">{payerLabel}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {arrangementDescription}
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
        {terms.arrangement === PAYMENT_ARRANGEMENTS.NO_PURCHASE && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Purchase expense</dt>
            <dd className="font-bold">{formatCurrency(0)}</dd>
          </div>
        )}
        {terms.arrangement === PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">
              Purchase estimate
              <span className="block text-xs">paid to merchant</span>
            </dt>
            <dd className="font-bold">{formatCurrency(expenseBudget)}</dd>
          </div>
        )}
        {terms.arrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-600">Maximum reimbursement</dt>
            <dd className="font-bold text-amber-800">
              {formatCurrency(maximumAdvance)}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-slate-600">Runner fee</dt>
          <dd className="font-bold">{formatCurrency(runnerFee)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
          <dt className="font-semibold text-slate-800">
            {terms.arrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
              ? "Maximum direct payment"
              : "Direct payment to Runner"}
          </dt>
          <dd className="font-black text-brand-800">{formatCurrency(total)}</dd>
        </div>
      </dl>

      <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
        Planned amounts only. ButuanGo records the agreement but does not
        collect, hold, process, or guarantee payment.
      </p>

      {details && (
        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-sm">
          {details.merchant_reference && (
            <p className="flex items-start gap-2 text-slate-600">
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <span>
                Merchant reference:{" "}
                <strong className="text-slate-900">
                  {details.merchant_reference}
                </strong>
              </span>
            </p>
          )}
          {details.payer_name && (
            <p className="flex items-start gap-2 text-slate-600">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <span>
                Payer:{" "}
                <strong className="text-slate-900">{details.payer_name}</strong>
                {details.payer_phone ? ` · ${details.payer_phone}` : ""}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
