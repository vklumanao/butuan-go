import { useMemo, useState } from "react";
import {
  BanknoteArrowUp,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  LoaderCircle,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  confirmRequestCashAdvance,
  deleteRequestReceipt,
  getRequestReceiptSignedUrl,
  requestPriceChange,
  resolveRequestPriceChange,
  uploadRequestReceipt,
  withdrawRequestPriceChange,
} from "@/services/requestService";
import {
  PAYMENT_ARRANGEMENTS,
  PRICE_CHANGE_STATUSES,
  PRICE_CHANGE_STATUS_LABELS,
  REQUEST_STATUSES,
} from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import {
  formatCurrency,
  formatDateTime,
  getFriendlyRequestError,
} from "@/lib/requestUtils";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

function statusClass(status) {
  if (status === PRICE_CHANGE_STATUSES.APPROVED)
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === PRICE_CHANGE_STATUSES.DECLINED)
    return "border-red-200 bg-red-50 text-red-800";
  if (status === PRICE_CHANGE_STATUSES.PENDING)
    return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatFileSize(bytes) {
  if (!Number.isFinite(Number(bytes))) return "";
  return `${(Number(bytes) / 1024 / 1024).toFixed(2)} MB`;
}

export function PaymentEvidencePanel({
  request,
  priceChanges = [],
  receipts = [],
  role,
  userId,
  onChanged,
}) {
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [proposedMaximum, setProposedMaximum] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [decision, setDecision] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busyAction, setBusyAction] = useState("");
  const [panelError, setPanelError] = useState("");

  const pendingChange = priceChanges.find(
    (change) => change.status === PRICE_CHANGE_STATUSES.PENDING,
  );
  const isRunner = role === "runner";
  const isRequestor = role === "requestor";
  const isInProgress = request.status === REQUEST_STATUSES.IN_PROGRESS;
  const isPurchaseArrangement = [
    PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID,
    PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE,
  ].includes(request.payment_terms?.arrangement);
  const isRunnerAdvance =
    request.payment_terms?.arrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE;
  const needsCurrentConsent =
    isRunnerAdvance &&
    request.payment_terms?.runner_consented_amount !==
      request.payment_terms?.maximum_advance;
  const receiptTotal = useMemo(
    () =>
      receipts.reduce(
        (total, receipt) => total + (Number(receipt.purchase_amount) || 0),
        0,
      ),
    [receipts],
  );
  const expectedHandoff =
    (isRunnerAdvance ? receiptTotal : 0) + (Number(request.service_fee) || 0);
  const canUpload =
    isRunner &&
    isInProgress &&
    isPurchaseArrangement &&
    !pendingChange &&
    !needsCurrentConsent &&
    receipts.length < 8;

  function showError(error, action) {
    devLog(`Payment evidence ${action} failed`, error);
    setPanelError(getFriendlyRequestError(error, action));
  }

  async function refreshAfter(message) {
    toast.success(message);
    setPanelError("");
    await onChanged();
  }

  async function submitPriceChange(event) {
    event.preventDefault();
    setPanelError("");
    const nextMaximum = Number(proposedMaximum);
    if (
      !Number.isFinite(nextMaximum) ||
      nextMaximum <= Number(request.payment_terms?.maximum_advance)
    ) {
      setPanelError("Enter a new limit higher than the current maximum.");
      return;
    }
    if (priceReason.trim().length < 5) {
      setPanelError("Briefly explain why the purchase price changed.");
      return;
    }

    setBusyAction("price-request");
    const { error } = await requestPriceChange(
      request.id,
      nextMaximum,
      priceReason,
    );
    setBusyAction("");
    if (error) {
      showError(error, "request a higher purchase limit");
      return;
    }
    setPriceDialogOpen(false);
    setProposedMaximum("");
    setPriceReason("");
    await refreshAfter("Price change sent to the Requestor for approval.");
  }

  async function decidePriceChange() {
    if (!decision) return;
    if (decisionNote.trim().length === 1) {
      setPanelError(
        "Write at least two characters in the response note, or leave it blank.",
      );
      return;
    }
    setBusyAction("decision");
    setPanelError("");
    const { error } = await resolveRequestPriceChange(
      pendingChange.id,
      decision === "approve",
      decisionNote,
    );
    setBusyAction("");
    if (error) {
      showError(error, "decide this price change");
      return;
    }
    const approved = decision === "approve";
    setDecision(null);
    setDecisionNote("");
    await refreshAfter(
      approved
        ? "New purchase limit approved. The Runner must confirm it before buying."
        : "Price change declined. The original limit remains in effect.",
    );
  }

  async function withdrawPriceChange() {
    setBusyAction("withdraw");
    setPanelError("");
    const { error } = await withdrawRequestPriceChange(pendingChange.id);
    setBusyAction("");
    if (error) {
      showError(error, "withdraw this price change");
      return;
    }
    await refreshAfter("Price-change request withdrawn.");
  }

  async function confirmNewLimit() {
    setBusyAction("consent");
    setPanelError("");
    const { error } = await confirmRequestCashAdvance(request.id);
    setBusyAction("");
    if (error) {
      showError(error, "confirm the new cash-advance limit");
      return;
    }
    await refreshAfter("New cash-advance limit confirmed.");
  }

  async function uploadReceipt(event) {
    event.preventDefault();
    setPanelError("");
    const amount = Number(receiptAmount);
    if (!receiptFile) {
      setPanelError("Choose a receipt image or PDF.");
      return;
    }
    if (!ALLOWED_RECEIPT_TYPES.includes(receiptFile.type)) {
      setPanelError("Upload a JPG, PNG, WebP, or PDF receipt.");
      return;
    }
    if (receiptFile.size > MAX_RECEIPT_SIZE) {
      setPanelError("The receipt file must be 5 MB or smaller.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPanelError("Enter the amount shown on the receipt.");
      return;
    }
    if (receiptFile.name.trim().length > 180) {
      setPanelError("Shorten the receipt file name before uploading.");
      return;
    }
    if (receiptNote.trim().length === 1) {
      setPanelError(
        "Write at least two characters in the receipt note, or leave it blank.",
      );
      return;
    }
    if (
      isRunnerAdvance &&
      receiptTotal + amount > Number(request.payment_terms?.maximum_advance)
    ) {
      setPanelError(
        "The new receipt would exceed the approved limit. Request a higher limit first.",
      );
      return;
    }

    setBusyAction("upload");
    const { error } = await uploadRequestReceipt(
      request.id,
      userId,
      receiptFile,
      amount,
      receiptNote,
    );
    setBusyAction("");
    if (error) {
      showError(error, "upload this receipt");
      return;
    }
    setReceiptFile(null);
    setReceiptAmount("");
    setReceiptNote("");
    setFileInputKey((value) => value + 1);
    await refreshAfter("Private receipt uploaded.");
  }

  async function viewReceipt(receipt) {
    setBusyAction(`view-${receipt.id}`);
    setPanelError("");
    const receiptWindow = window.open("", "_blank");
    const { data, error } = await getRequestReceiptSignedUrl(
      receipt.storage_path,
    );
    setBusyAction("");
    if (error || !data?.signedUrl) {
      receiptWindow?.close();
      showError(error, "open this receipt");
      return;
    }
    if (receiptWindow) {
      receiptWindow.opener = null;
      receiptWindow.location = data.signedUrl;
    } else {
      toast.error("Allow pop-ups for ButuanGo to open this private receipt.");
    }
  }

  async function removeReceipt(receipt) {
    if (!window.confirm(`Remove ${receipt.file_name}?`)) return;
    setBusyAction(`delete-${receipt.id}`);
    setPanelError("");
    const { error } = await deleteRequestReceipt(receipt);
    setBusyAction("");
    if (error) {
      showError(error, "remove this receipt");
      return;
    }
    await refreshAfter("Receipt removed.");
  }

  return (
    <div className="space-y-5">
      {isRunnerAdvance && (
        <section>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-950">Purchase limit</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Current maximum:{" "}
                <strong>
                  {formatCurrency(request.payment_terms?.maximum_advance)}
                </strong>
              </p>
            </div>
            {isRunner &&
              isInProgress &&
              !pendingChange &&
              !needsCurrentConsent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPanelError("");
                    setPriceDialogOpen(true);
                  }}
                >
                  <BanknoteArrowUp className="h-4 w-4" />
                  Request higher limit
                </Button>
              )}
          </div>

          {pendingChange && (
            <Alert className="mt-3 border-amber-200 bg-amber-50 text-amber-950">
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Price change needs a decision</p>
                  <p className="mt-1 text-sm leading-6">
                    {formatCurrency(pendingChange.previous_maximum)} to{" "}
                    <strong>
                      {formatCurrency(pendingChange.proposed_maximum)}
                    </strong>
                  </p>
                  <p className="mt-2 break-words text-sm leading-6">
                    {pendingChange.reason}
                  </p>
                  {isRequestor && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setPanelError("");
                          setDecision("approve");
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPanelError("");
                          setDecision("decline");
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  )}
                  {isRunner && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      disabled={busyAction === "withdraw"}
                      onClick={withdrawPriceChange}
                    >
                      {busyAction === "withdraw" && (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      )}
                      Withdraw request
                    </Button>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {isRunner &&
            isInProgress &&
            !pendingChange &&
            needsCurrentConsent && (
              <Alert className="mt-3 border-emerald-200 bg-emerald-50 text-emerald-950">
                <p className="font-bold">Approved limit needs your consent</p>
                <p className="mt-1 text-sm leading-6">
                  Confirm the new{" "}
                  {formatCurrency(request.payment_terms?.maximum_advance)} limit
                  before buying or uploading a receipt.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={busyAction === "consent"}
                  onClick={confirmNewLimit}
                >
                  {busyAction === "consent" && (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  )}
                  I agree to the new limit
                </Button>
              </Alert>
            )}
        </section>
      )}

      {priceChanges.length > 0 && (
        <section className="border-t border-slate-200 pt-5">
          <h3 className="font-bold text-slate-950">Price-change history</h3>
          <div className="mt-3 space-y-3">
            {priceChanges.map((change) => (
              <div
                key={change.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {formatCurrency(change.previous_maximum)} →{" "}
                    {formatCurrency(change.proposed_maximum)}
                  </p>
                  <Badge
                    variant="outline"
                    className={statusClass(change.status)}
                  >
                    {PRICE_CHANGE_STATUS_LABELS[change.status] || change.status}
                  </Badge>
                </div>
                <p className="mt-2 break-words text-sm text-slate-600">
                  {change.reason}
                </p>
                {change.response_note && (
                  <p className="mt-2 break-words text-sm text-slate-600">
                    Response: {change.response_note}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {formatDateTime(change.created_at, "")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {isPurchaseArrangement && (
        <section className="border-t border-slate-200 pt-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-950">Private receipts</h3>
              <p className="mt-1 text-sm text-slate-600">
                {receipts.length} file{receipts.length === 1 ? "" : "s"} · Total{" "}
                {formatCurrency(receiptTotal)}
              </p>
              {receipts.length > 0 && (
                <p className="mt-1 text-sm font-semibold text-brand-800">
                  Expected direct payment to Runner:{" "}
                  {formatCurrency(expectedHandoff)}
                </p>
              )}
            </div>
            <Badge variant="outline">Participants only</Badge>
          </div>

          {receipts.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600">
              {request.payment_terms?.receipt_evidence_required === false
                ? "This task reached confirmation before private receipt evidence was enabled."
                : "No purchase receipt has been uploaded yet."}
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {receipts.map((receipt) => (
                <li
                  key={receipt.id}
                  className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {receipt.file_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCurrency(receipt.purchase_amount)} ·{" "}
                      {formatFileSize(receipt.file_size)}
                    </p>
                    {receipt.note && (
                      <p className="mt-2 break-words text-sm text-slate-600">
                        {receipt.note}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`View ${receipt.file_name}`}
                      disabled={busyAction === `view-${receipt.id}`}
                      onClick={() => viewReceipt(receipt)}
                    >
                      {busyAction === `view-${receipt.id}` ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {isRunner && isInProgress && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-700 hover:bg-red-50 hover:text-red-800"
                        aria-label={`Remove ${receipt.file_name}`}
                        disabled={busyAction === `delete-${receipt.id}`}
                        onClick={() => removeReceipt(receipt)}
                      >
                        {busyAction === `delete-${receipt.id}` ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {isRunner && isInProgress && (
            <form
              className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4"
              onSubmit={uploadReceipt}
            >
              <div>
                <label
                  htmlFor="receiptFile"
                  className="text-sm font-semibold text-slate-900"
                >
                  Receipt file
                </label>
                <Input
                  key={fileInputKey}
                  id="receiptFile"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  className="mt-2 bg-white"
                  disabled={!canUpload || busyAction === "upload"}
                  onChange={(event) =>
                    setReceiptFile(event.target.files?.[0] || null)
                  }
                />
                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG, WebP, or PDF up to 5 MB.
                </p>
              </div>
              <div>
                <label
                  htmlFor="receiptAmount"
                  className="text-sm font-semibold text-slate-900"
                >
                  Amount on receipt
                </label>
                <Input
                  id="receiptAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={receiptAmount}
                  className="mt-2 bg-white"
                  disabled={!canUpload || busyAction === "upload"}
                  onChange={(event) => setReceiptAmount(event.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="receiptNote"
                  className="text-sm font-semibold text-slate-900"
                >
                  Note{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <Textarea
                  id="receiptNote"
                  maxLength={300}
                  value={receiptNote}
                  className="mt-2 bg-white"
                  placeholder="Example: Groceries from Store A"
                  disabled={!canUpload || busyAction === "upload"}
                  onChange={(event) => setReceiptNote(event.target.value)}
                />
              </div>
              {!canUpload && (
                <p className="text-sm leading-6 text-amber-800">
                  {pendingChange
                    ? "Wait for the price-change decision before uploading."
                    : needsCurrentConsent
                      ? "Confirm the approved cash-advance limit before uploading."
                      : receipts.length >= 8
                        ? "This task already has the maximum of 8 receipt files."
                        : "Receipt upload is not available for this task."}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={!canUpload || busyAction === "upload"}
              >
                {busyAction === "upload" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {busyAction === "upload"
                  ? "Uploading…"
                  : "Upload private receipt"}
              </Button>
            </form>
          )}
        </section>
      )}

      {panelError && <Alert variant="destructive">{panelError}</Alert>}

      <Dialog
        open={priceDialogOpen}
        onOpenChange={(open) => {
          setPriceDialogOpen(open);
          if (!open) setPanelError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a higher purchase limit</DialogTitle>
            <DialogDescription>
              Do not buy above the current limit until the Requestor approves
              and you confirm the new amount.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitPriceChange}>
            <div>
              <label
                htmlFor="proposedMaximum"
                className="text-sm font-semibold text-slate-900"
              >
                New maximum
              </label>
              <Input
                id="proposedMaximum"
                type="number"
                min={Number(request.payment_terms?.maximum_advance) + 0.01}
                step="0.01"
                inputMode="decimal"
                className="mt-2"
                value={proposedMaximum}
                onChange={(event) => setProposedMaximum(event.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Current maximum:{" "}
                {formatCurrency(request.payment_terms?.maximum_advance)}
              </p>
            </div>
            <div>
              <label
                htmlFor="priceReason"
                className="text-sm font-semibold text-slate-900"
              >
                Why did the price change?
              </label>
              <Textarea
                id="priceReason"
                className="mt-2"
                maxLength={500}
                value={priceReason}
                placeholder="Example: The store price is higher than listed."
                onChange={(event) => setPriceReason(event.target.value)}
              />
            </div>
            {panelError && <Alert variant="destructive">{panelError}</Alert>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busyAction === "price-request"}>
                {busyAction === "price-request" && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {busyAction === "price-request"
                  ? "Sending…"
                  : "Send for approval"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(decision)}
        onOpenChange={(open) => {
          if (!open) {
            setDecision(null);
            setDecisionNote("");
            setPanelError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approve"
                ? "Approve the new limit?"
                : "Decline the price change?"}
            </DialogTitle>
            <DialogDescription>
              {decision === "approve"
                ? `The maximum Runner advance will change to ${formatCurrency(
                    pendingChange?.proposed_maximum,
                  )}. The Runner must consent again before buying.`
                : "The original purchase limit will remain in effect."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label
              htmlFor="decisionNote"
              className="text-sm font-semibold text-slate-900"
            >
              Response note{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <Textarea
              id="decisionNote"
              className="mt-2"
              maxLength={500}
              value={decisionNote}
              placeholder="Add a short explanation for the Runner."
              onChange={(event) => setDecisionNote(event.target.value)}
            />
          </div>
          {panelError && <Alert variant="destructive">{panelError}</Alert>}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={busyAction === "decision"}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant={decision === "approve" ? "default" : "destructive"}
              disabled={busyAction === "decision"}
              onClick={decidePriceChange}
            >
              {busyAction === "decision" && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {busyAction === "decision"
                ? "Saving…"
                : decision === "approve"
                  ? "Approve new limit"
                  : "Decline change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
