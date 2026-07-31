import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ClipboardList,
  Eye,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  WalletCards,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { requestSchema } from "@/validation/requestSchema";
import { createRequest, getCategories } from "@/services/requestService";
import {
  FULFILLMENT_TYPES,
  FULFILLMENT_TYPE_LABELS,
  PAYMENT_ARRANGEMENTS,
  PAYMENT_ARRANGEMENT_LABELS,
  PAYMENT_PAYER_LABELS,
  PAYMENT_PAYER_TYPES,
} from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import { formatCurrency, getFriendlyRequestError } from "@/lib/requestUtils";
import { useAuth } from "@/hooks/useAuth";
import {
  ApproximateLocationPicker,
  RequestLocationFields,
} from "@/components/requests/RequestLocationFields";
import { InPersonPaymentNotice } from "@/components/requests/InPersonPaymentNotice";
import { RequestPaymentFields } from "@/components/requests/RequestPaymentTerms";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STEPS = [
  { number: 1, label: "Task" },
  { number: 2, label: "Location" },
  { number: 3, label: "Budget & review" },
];

const STEP_FIELDS = {
  1: ["categoryId", "title", "description"],
  2: [
    "area",
    "fulfillmentType",
    "pickupAddress",
    "pickupLandmark",
    "pickupInstructions",
    "deliveryAddress",
    "deliveryLandmark",
    "deliveryInstructions",
    "contactName",
    "contactPhone",
    "approximateLatitude",
    "approximateLongitude",
  ],
  3: [
    "expenseBudget",
    "serviceFee",
    "paymentArrangement",
    "payerType",
    "payerName",
    "payerPhone",
    "merchantReference",
    "dueAt",
  ],
};

function minimumLocalDateTime() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function StepProgress({ currentStep }) {
  return (
    <nav className="mt-6" aria-label="Create request progress">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((step) => {
          const completed = step.number < currentStep;
          const active = step.number === currentStep;
          return (
            <li key={step.number} aria-current={active ? "step" : undefined}>
              <div
                className={`h-1.5 rounded-full ${
                  completed || active ? "bg-brand-600" : "bg-slate-200"
                }`}
              />
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                    completed
                      ? "bg-brand-100 text-brand-800"
                      : active
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : step.number}
                </span>
                <span
                  className={`hidden text-xs font-bold sm:block ${
                    active ? "text-brand-800" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function CreateRequestPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [locationDefaultsInitialized, setLocationDefaultsInitialized] =
    useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [formError, setFormError] = useState("");
  const {
    register,
    setValue,
    trigger,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      categoryId: "",
      title: "",
      description: "",
      area: "",
      expenseBudget: 0,
      serviceFee: 0,
      paymentArrangement: "",
      payerType: PAYMENT_PAYER_TYPES.REQUESTOR,
      payerName: "",
      payerPhone: "",
      merchantReference: "",
      dueAt: "",
      fulfillmentType: FULFILLMENT_TYPES.DELIVERY,
      pickupAddress: "",
      pickupLandmark: "",
      pickupInstructions: "",
      deliveryAddress: "",
      deliveryLandmark: "",
      deliveryInstructions: "",
      contactName: profile.full_name || "",
      contactPhone: profile.phone_number || "",
      approximateLatitude: null,
      approximateLongitude: null,
    },
  });
  const title = useWatch({ control, name: "title" });
  const area = useWatch({ control, name: "area" });
  const categoryId = useWatch({ control, name: "categoryId" });
  const approximateLatitude = useWatch({
    control,
    name: "approximateLatitude",
  });
  const approximateLongitude = useWatch({
    control,
    name: "approximateLongitude",
  });
  const expenseBudget =
    Number(useWatch({ control, name: "expenseBudget" })) || 0;
  const serviceFee = Number(useWatch({ control, name: "serviceFee" })) || 0;
  const paymentArrangement = useWatch({
    control,
    name: "paymentArrangement",
  });
  const payerType = useWatch({ control, name: "payerType" });
  const fulfillmentType = useWatch({ control, name: "fulfillmentType" });
  const estimatedTotal = expenseBudget + serviceFee;
  const amountDueToRunner =
    paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
      ? estimatedTotal
      : serviceFee;
  const selectedCategory = categories.find(
    (category) => String(category.id) === categoryId,
  );
  const hasApproximateArea =
    approximateLatitude !== null &&
    approximateLatitude !== "" &&
    approximateLongitude !== null &&
    approximateLongitude !== "";
  const minimumDueAt = useMemo(() => minimumLocalDateTime(), []);

  useEffect(() => {
    let active = true;
    getCategories().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        devLog("Category retrieval failed", error);
        setCategoriesError(
          "We could not load task categories. Refresh the page to try again.",
        );
      } else {
        setCategories(data || []);
      }
      setCategoriesLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function scrollToForm() {
    requestAnimationFrame(() => {
      document
        .getElementById("create-request-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function goToNextStep() {
    setFormError("");
    const valid = await trigger(STEP_FIELDS[currentStep], {
      shouldFocus: true,
    });
    if (!valid) return;
    if (currentStep === 2) setLocationDefaultsInitialized(true);
    setCurrentStep((step) => Math.min(step + 1, 3));
    scrollToForm();
  }

  function goToPreviousStep() {
    setFormError("");
    if (currentStep === 2) setLocationDefaultsInitialized(true);
    setCurrentStep((step) => Math.max(step - 1, 1));
    scrollToForm();
  }

  async function onSubmit(values) {
    setFormError("");
    const { data, error } = await createRequest(values);
    if (error) {
      devLog("Request creation failed", error);
      setFormError(getFriendlyRequestError(error, "create your request"));
      return;
    }
    if (!data?.id) {
      setFormError(
        "Your request may have been created, but we could not open it. Check My Requests before trying again.",
      );
      return;
    }
    toast.success("Your request has been posted.");
    navigate(`/requestor/requests/${data.id}`, { replace: true });
  }

  function onInvalid(invalidFields) {
    if (STEP_FIELDS[1].some((field) => invalidFields[field])) {
      setCurrentStep(1);
    } else if (STEP_FIELDS[2].some((field) => invalidFields[field])) {
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
    setFormError("Review the highlighted fields before posting your request.");
    scrollToForm();
  }

  function handleFormSubmit(event) {
    if (currentStep < 3) {
      event.preventDefault();
      goToNextStep();
      return;
    }
    handleSubmit(onSubmit, onInvalid)(event);
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <Button variant="ghost" asChild className="-ml-3 mb-4">
        <Link to="/requestor/requests">
          <ArrowLeft className="h-4 w-4" />
          Back to My Requests
        </Link>
      </Button>

      <div>
        <p className="font-semibold text-brand-600">Requestor workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Create a request
        </h1>
        <p className="mt-2 text-slate-600">
          Three short steps. You can go back without losing what you entered.
        </p>
      </div>

      <StepProgress currentStep={currentStep} />

      <form
        id="create-request-form"
        onSubmit={handleFormSubmit}
        className="mt-6 space-y-6 scroll-mt-4"
        noValidate
      >
        {formError && <Alert variant="destructive">{formError}</Alert>}

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-800">
                <ClipboardList className="h-5 w-5" />
              </div>
              <CardTitle>What do you need done?</CardTitle>
              <CardDescription>
                Give Runners a clear, short description of the errand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {categoriesError && (
                <Alert variant="destructive">{categoriesError}</Alert>
              )}
              <FormField
                id="categoryId"
                label="Task category"
                error={errors.categoryId?.message}
              >
                <select
                  id="categoryId"
                  disabled={categoriesLoading || Boolean(categoriesError)}
                  className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20 disabled:opacity-50"
                  {...register("categoryId")}
                >
                  <option value="">
                    {categoriesLoading
                      ? "Loading categories…"
                      : "Select a category"}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                id="requestTitle"
                label="Request title"
                error={errors.title?.message}
              >
                <Input
                  id="requestTitle"
                  placeholder="Example: Pick up office supplies"
                  maxLength={120}
                  {...register("title")}
                />
              </FormField>
              <FormField
                id="requestDescription"
                label="What should the Runner do?"
                error={errors.description?.message}
              >
                <Textarea
                  id="requestDescription"
                  className="min-h-32"
                  placeholder="Include the items, quantity, or instructions needed to complete the errand."
                  maxLength={2000}
                  {...register("description")}
                />
              </FormField>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-800">
                <MapPin className="h-5 w-5" />
              </div>
              <CardTitle>Where should the Runner go?</CardTitle>
              <CardDescription>
                Add the task details first, then choose what Runners can see
                before accepting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section aria-labelledby="private-location-heading">
                <div className="mb-5 flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                    <LockKeyhole className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        id="private-location-heading"
                        className="font-black text-slate-950"
                      >
                        Task location details
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        Shown after acceptance
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Tell the assigned Runner where to pick up, deliver, or do
                      the task.
                    </p>
                  </div>
                </div>
                <RequestLocationFields
                  register={register}
                  errors={errors}
                  fulfillmentType={fulfillmentType}
                  idPrefix="create"
                  setValue={setValue}
                  applyDefaultAddress={!locationDefaultsInitialized}
                  showPrivacyNotice={false}
                />
              </section>

              <section
                className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 sm:p-5"
                aria-labelledby="public-area-heading"
              >
                <div className="mb-5 flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-800">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        id="public-area-heading"
                        className="font-black text-brand-950"
                      >
                        Area shown to Runners
                      </h3>
                      <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-900">
                        Shown before acceptance
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-brand-900/70">
                      Enter only the barangay or general area—not a house number
                      or exact address.
                    </p>
                  </div>
                </div>
                <FormField
                  id="requestArea"
                  label="Barangay or general area"
                  error={errors.area?.message}
                >
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                      id="requestArea"
                      className="pl-10"
                      placeholder="Example: Libertad, Butuan City"
                      maxLength={160}
                      {...register("area")}
                    />
                  </div>
                </FormField>
                <div className="mt-5">
                  <ApproximateLocationPicker
                    control={control}
                    register={register}
                    setValue={setValue}
                    trigger={trigger}
                    errors={errors}
                    idPrefix="create"
                    onAreaSuggested={(suggestedArea) =>
                      setValue("area", suggestedArea, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    embedded
                  />
                </div>
              </section>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <>
            <Card>
              <CardHeader>
                <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-800">
                  <WalletCards className="h-5 w-5" />
                </div>
                <CardTitle>Budget and schedule</CardTitle>
                <CardDescription>
                  Set the expected expense, Runner fee, and optional deadline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    id="expenseBudget"
                    label="Estimated errand expense"
                    error={errors.expenseBudget?.message}
                  >
                    <Input
                      id="expenseBudget"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      {...register("expenseBudget")}
                    />
                  </FormField>
                  <FormField
                    id="serviceFee"
                    label="Runner service fee"
                    error={errors.serviceFee?.message}
                  >
                    <Input
                      id="serviceFee"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      {...register("serviceFee")}
                    />
                  </FormField>
                </div>
                <RequestPaymentFields
                  register={register}
                  errors={errors}
                  paymentArrangement={paymentArrangement}
                  payerType={payerType}
                  expenseBudget={expenseBudget}
                  idPrefix="createPayment"
                />
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    Expected amount paid to the Runner at handoff
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {formatCurrency(amountDueToRunner)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
                      ? "Maximum advance plus Runner fee. The actual reimbursement will follow the receipt."
                      : "The purchase expense is not collected by the Runner under this arrangement."}
                  </p>
                </div>
                <InPersonPaymentNotice />
                <FormField
                  id="dueAt"
                  label="Due date and time (optional)"
                  error={errors.dueAt?.message}
                >
                  <div className="relative">
                    <CalendarClock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                      id="dueAt"
                      type="datetime-local"
                      min={minimumDueAt}
                      className="pl-10"
                      {...register("dueAt")}
                    />
                  </div>
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review your request</CardTitle>
                <CardDescription>
                  Confirm the summary before posting. Exact addresses remain
                  private.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Task
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {title || "Untitled request"}
                    </dd>
                    <dd className="mt-1 text-sm text-slate-600">
                      {selectedCategory?.name || "No category selected"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Public area
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {area || "No area entered"}
                    </dd>
                    <dd className="mt-1 text-sm text-slate-600">
                      {hasApproximateArea
                        ? "Shaded map area included"
                        : "Map area not added (optional)"}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Fulfillment
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {FULFILLMENT_TYPE_LABELS[fulfillmentType]}
                    </dd>
                    <dd className="mt-1 text-sm text-slate-600">
                      Exact details visible after acceptance
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Payment
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {PAYMENT_ARRANGEMENT_LABELS[paymentArrangement] ||
                        "Not selected"}
                    </dd>
                    <dd className="mt-1 text-sm text-slate-600">
                      {PAYMENT_PAYER_LABELS[payerType]} · Runner receives up to{" "}
                      {formatCurrency(amountDueToRunner)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {currentStep === 1 ? (
              <Button type="button" variant="outline" asChild>
                <Link to="/requestor/requests">Cancel</Link>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          {currentStep < 3 ? (
            <Button
              type="submit"
              size="lg"
              disabled={
                categoriesLoading || Boolean(categoriesError) || isSubmitting
              }
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Posting request…" : "Post request"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
