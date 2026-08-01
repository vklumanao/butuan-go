import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Clock3,
  ClipboardList,
  Eye,
  FileText,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Pencil,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Truck,
  UserRound,
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
import {
  formatCurrency,
  formatDateTime,
  getFriendlyRequestError,
} from "@/lib/requestUtils";
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
  { number: 3, label: "Budget" },
  { number: 4, label: "Review" },
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
  4: [],
};

const QUICK_REQUEST_TEMPLATES = [
  {
    id: "buy-deliver",
    label: "Buy and deliver",
    description: "For groceries, food, or everyday store items.",
    categorySlug: "shopping-groceries",
    fulfillmentType: FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
    paymentArrangement: "",
    defaultTitle: "Buy and deliver items",
    descriptionHint:
      "List the items, quantities, preferred store, acceptable alternatives, and delivery instructions.",
    icon: ShoppingBasket,
  },
  {
    id: "pickup-deliver",
    label: "Pickup and deliver",
    description: "For an item that is already ready for pickup.",
    categorySlug: "small-delivery",
    fulfillmentType: FULFILLMENT_TYPES.DELIVERY,
    paymentArrangement: PAYMENT_ARRANGEMENTS.NO_PURCHASE,
    defaultTitle: "Pick up and deliver an item",
    descriptionHint:
      "Describe the item, who will release it, and any handling or delivery instructions.",
    icon: Truck,
  },
  {
    id: "document-delivery",
    label: "Document delivery",
    description: "For papers, forms, printouts, or small documents.",
    categorySlug: "printing-documents",
    fulfillmentType: FULFILLMENT_TYPES.DELIVERY,
    paymentArrangement: PAYMENT_ARRANGEMENTS.NO_PURCHASE,
    defaultTitle: "Deliver documents",
    descriptionHint:
      "Describe the documents, pickup contact, recipient, deadline, and handling instructions.",
    icon: FileText,
  },
  {
    id: "queue-on-site",
    label: "Queue or on-site errand",
    description: "For waiting in line or completing a task at one place.",
    categorySlug: "other-errand",
    fulfillmentType: FULFILLMENT_TYPES.ON_SITE,
    paymentArrangement: PAYMENT_ARRANGEMENTS.NO_PURCHASE,
    defaultTitle: "Complete an on-site errand",
    descriptionHint:
      "Explain where to go, what must be done, what to bring, and how completion should be confirmed.",
    icon: Clock3,
  },
  {
    id: "custom",
    label: "Custom request",
    description: "Start with your current fields and choose every detail.",
    categorySlug: null,
    fulfillmentType: null,
    paymentArrangement: null,
    defaultTitle: "",
    descriptionHint:
      "Describe the goal, important instructions, and what a successful result looks like.",
    icon: SlidersHorizontal,
  },
];

function minimumLocalDateTime() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function StepProgress({ currentStep }) {
  return (
    <nav className="mt-6" aria-label="Create request progress">
      <ol className="grid grid-cols-4 gap-2">
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

function QuickTemplatePicker({ selectedTemplate, disabled, onSelect }) {
  return (
    <section aria-labelledby="quick-template-heading">
      <div className="flex flex-col gap-1">
        <h2 id="quick-template-heading" className="font-black text-slate-950">
          Start with a quick template
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          A template presets the task category and fulfillment type. You can
          change every field afterward.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {QUICK_REQUEST_TEMPLATES.map((template) => {
          const Icon = template.icon;
          const selected = selectedTemplate === template.id;
          return (
            <button
              key={template.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onSelect(template)}
              className={`relative rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "border-brand-600 bg-brand-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/40"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-lg ${
                  selected
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="mt-3 block text-sm font-black text-slate-950">
                {template.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                {template.description}
              </span>
              {selected && (
                <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ReviewSectionHeader({ title, description, onEdit }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
    </div>
  );
}

function RequestReviewScreen({
  values,
  selectedCategory,
  hasApproximateArea,
  amountDueToRunner,
  estimatedTotal,
  onEdit,
}) {
  const needsPickup = [
    FULFILLMENT_TYPES.PICKUP_ONLY,
    FULFILLMENT_TYPES.DELIVERY,
    FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
  ].includes(values.fulfillmentType);
  const needsDelivery = [
    FULFILLMENT_TYPES.DELIVERY,
    FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
    FULFILLMENT_TYPES.ON_SITE,
  ].includes(values.fulfillmentType);
  const runnerAdvance =
    values.paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-800">
            <ClipboardList className="h-5 w-5" />
          </div>
          <CardTitle>Review before posting</CardTitle>
          <CardDescription>
            Check the complete request and use Edit to return to any section.
            Nothing is posted until you press Post request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-brand-200 bg-brand-50 text-brand-950">
            <Eye className="mb-2 h-5 w-5 text-brand-700" />
            <p className="font-bold">Visible before a Runner accepts</p>
            <p className="mt-1 text-sm leading-6">
              Eligible Runners can see the task, general area, optional shaded
              map zone, deadline, expense estimate, Runner fee, payer type, and
              payment arrangement.
            </p>
          </Alert>
          <Alert className="border-slate-200 bg-slate-50 text-slate-800">
            <LockKeyhole className="mb-2 h-5 w-5 text-slate-700" />
            <p className="font-bold">Private until acceptance</p>
            <p className="mt-1 text-sm leading-6">
              Exact addresses, contact details, payer contact information, and
              merchant reference are shared only with the assigned Runner.
            </p>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <ReviewSectionHeader
            title="Task details"
            description="The task description Runners use to decide whether the request fits them."
            onEdit={() => onEdit(1)}
          />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Category
              </dt>
              <dd className="mt-1 font-bold text-slate-950">
                {selectedCategory?.name || "No category selected"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Title
              </dt>
              <dd className="mt-1 font-bold text-slate-950">{values.title}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Instructions
              </dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                {values.description}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <ReviewSectionHeader
            title="Location and privacy"
            description="Confirm what is public for discovery and what remains private."
            onEdit={() => onEdit(2)}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
              <div className="flex items-center gap-2 text-brand-900">
                <Eye className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-wide">
                  Before acceptance
                </p>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-brand-900/70">General area</dt>
                  <dd className="mt-1 font-bold text-brand-950">
                    {values.area}
                  </dd>
                </div>
                <div>
                  <dt className="text-brand-900/70">Approximate map zone</dt>
                  <dd className="mt-1 font-bold text-brand-950">
                    {hasApproximateArea
                      ? "Shaded zone included"
                      : "Not included (optional)"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-700">
                <LockKeyhole className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-wide">
                  After acceptance
                </p>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Fulfillment type</dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {FULFILLMENT_TYPE_LABELS[values.fulfillmentType]}
                  </dd>
                </div>
                {needsPickup && (
                  <div>
                    <dt className="text-slate-500">Exact pickup</dt>
                    <dd className="mt-1 break-words font-bold text-slate-900">
                      {values.pickupAddress}
                    </dd>
                    {values.pickupLandmark && (
                      <dd className="mt-1 text-slate-600">
                        Landmark: {values.pickupLandmark}
                      </dd>
                    )}
                    {values.pickupInstructions && (
                      <dd className="mt-1 whitespace-pre-wrap text-slate-600">
                        Instructions: {values.pickupInstructions}
                      </dd>
                    )}
                  </div>
                )}
                {needsDelivery && (
                  <div>
                    <dt className="text-slate-500">
                      {values.fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                        ? "Exact task location"
                        : "Exact delivery"}
                    </dt>
                    <dd className="mt-1 break-words font-bold text-slate-900">
                      {values.deliveryAddress}
                    </dd>
                    {values.deliveryLandmark && (
                      <dd className="mt-1 text-slate-600">
                        Landmark: {values.deliveryLandmark}
                      </dd>
                    )}
                    {values.deliveryInstructions && (
                      <dd className="mt-1 whitespace-pre-wrap text-slate-600">
                        Instructions: {values.deliveryInstructions}
                      </dd>
                    )}
                  </div>
                )}
                <div>
                  <dt className="text-slate-500">Contact</dt>
                  <dd className="mt-1 flex items-start gap-2 font-bold text-slate-900">
                    <UserRound className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {values.contactName} · {values.contactPhone}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <ReviewSectionHeader
            title="Payment and schedule"
            description="Review the planned amounts and who will pay the Runner directly."
            onEdit={() => onEdit(3)}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Expense estimate
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {formatCurrency(values.expenseBudget)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Runner fee
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {formatCurrency(values.serviceFee)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Planned total
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {formatCurrency(estimatedTotal)}
              </p>
            </div>
            <div className="rounded-xl bg-brand-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-800">
                Direct to Runner
              </p>
              <p className="mt-1 text-lg font-black text-brand-950">
                {formatCurrency(amountDueToRunner)}
              </p>
            </div>
          </div>

          <dl className="grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Payment arrangement
              </dt>
              <dd className="mt-1 font-bold text-slate-950">
                {PAYMENT_ARRANGEMENT_LABELS[values.paymentArrangement]}
              </dd>
              <dd className="mt-1 text-sm text-slate-600">
                {runnerAdvance
                  ? "The Runner may voluntarily advance personal money up to the expense estimate."
                  : "The Runner will not advance money for the purchase."}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Payer
              </dt>
              <dd className="mt-1 font-bold text-slate-950">
                {PAYMENT_PAYER_LABELS[values.payerType]}
              </dd>
              {values.payerType === PAYMENT_PAYER_TYPES.RECIPIENT && (
                <dd className="mt-1 text-sm text-slate-600">
                  Private contact: {values.payerName} · {values.payerPhone}
                </dd>
              )}
            </div>
            {values.merchantReference && (
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Private merchant reference
                </dt>
                <dd className="mt-1 font-bold text-slate-950">
                  {values.merchantReference}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Deadline
              </dt>
              <dd className="mt-1 font-bold text-slate-950">
                {formatDateTime(values.dueAt)}
              </dd>
            </div>
          </dl>

          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
            <ShieldCheck className="mb-2 h-5 w-5 text-emerald-700" />
            ButuanGo records this arrangement but does not collect, hold,
            process, or guarantee payment. Payment happens directly between the
            selected payer and the Runner.
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

export function CreateRequestPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [editingFromReview, setEditingFromReview] = useState(false);
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
  const formValues = useWatch({ control });
  const {
    title,
    categoryId,
    approximateLatitude,
    approximateLongitude,
    paymentArrangement,
    payerType,
    fulfillmentType,
  } = formValues;
  const expenseBudget = Number(formValues.expenseBudget) || 0;
  const serviceFee = Number(formValues.serviceFee) || 0;
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
  const activeTemplate = QUICK_REQUEST_TEMPLATES.find(
    (template) => template.id === selectedTemplate,
  );

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

  function applyTemplate(template) {
    const previousTemplate = QUICK_REQUEST_TEMPLATES.find(
      (item) => item.id === selectedTemplate,
    );
    const mayReplaceSuggestedTitle =
      !title.trim() ||
      (previousTemplate?.defaultTitle &&
        title.trim() === previousTemplate.defaultTitle);

    setSelectedTemplate(template.id);
    setFormError("");

    if (template.fulfillmentType) {
      setValue("fulfillmentType", template.fulfillmentType, {
        shouldDirty: true,
      });
    }

    if (template.categorySlug) {
      const templateCategory = categories.find(
        (category) => category.slug === template.categorySlug,
      );
      if (templateCategory) {
        setValue("categoryId", String(templateCategory.id), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }

    if (template.paymentArrangement !== null) {
      setValue("paymentArrangement", template.paymentArrangement, {
        shouldDirty: true,
      });
      setValue("merchantReference", "", { shouldDirty: true });
      if (template.paymentArrangement === PAYMENT_ARRANGEMENTS.NO_PURCHASE) {
        setValue("expenseBudget", 0, { shouldDirty: true });
      }
    }

    if (template.defaultTitle && mayReplaceSuggestedTitle) {
      setValue("title", template.defaultTitle, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

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
    if (editingFromReview) {
      setEditingFromReview(false);
      setCurrentStep(4);
      scrollToForm();
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, 4));
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
    setEditingFromReview(false);
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
    if (currentStep < 4) {
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
          Four short steps. You can go back without losing what you entered.
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
          <>
            <QuickTemplatePicker
              selectedTemplate={selectedTemplate}
              disabled={categoriesLoading || Boolean(categoriesError)}
              onSelect={applyTemplate}
            />

            {activeTemplate && (
              <Alert className="border-brand-200 bg-brand-50 text-brand-950">
                <Check className="mb-2 h-5 w-5 text-brand-700" />
                <p className="font-bold">{activeTemplate.label} selected</p>
                <p className="mt-1 text-sm leading-6">
                  {activeTemplate.id === "buy-deliver"
                    ? "Task type and category were preset. You will still choose whether the merchant is prepaid or the Runner may advance money."
                    : activeTemplate.id === "custom"
                      ? "No fields were changed. Continue with your own request details."
                      : "Task type, category, and no-purchase payment arrangement were preset. Review and change them anytime."}
                </p>
              </Alert>
            )}

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
                    placeholder={
                      activeTemplate?.descriptionHint ||
                      "Include the items, quantity, or instructions needed to complete the errand."
                    }
                    maxLength={2000}
                    {...register("description")}
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    This description is visible before acceptance. Put exact
                    addresses and private contact details only in the Location
                    step.
                  </p>
                </FormField>
              </CardContent>
            </Card>
          </>
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
          </>
        )}

        {currentStep === 4 && (
          <RequestReviewScreen
            values={formValues}
            selectedCategory={selectedCategory}
            hasApproximateArea={hasApproximateArea}
            amountDueToRunner={amountDueToRunner}
            estimatedTotal={estimatedTotal}
            onEdit={(step) => {
              setFormError("");
              setEditingFromReview(true);
              setCurrentStep(step);
              scrollToForm();
            }}
          />
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {editingFromReview ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingFromReview(false);
                  setCurrentStep(4);
                  scrollToForm();
                }}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to review
              </Button>
            ) : currentStep === 1 ? (
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
          {currentStep < 4 ? (
            <Button
              type="submit"
              size="lg"
              disabled={
                categoriesLoading || Boolean(categoriesError) || isSubmitting
              }
            >
              {editingFromReview
                ? "Save and return to review"
                : currentStep === 3
                  ? "Review request"
                  : "Continue"}
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
