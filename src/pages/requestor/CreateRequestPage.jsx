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
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Pencil,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Store,
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
  REQUEST_SCENARIO_LABELS,
  REQUEST_SCENARIO_RULES,
  REQUEST_SCENARIOS,
} from "@/lib/requestConstants";
import {
  getHandoffContact,
  getLocationRequirements,
} from "@/lib/requestScenarioUtils";
import { devLog } from "@/lib/errors";
import {
  formatCurrency,
  formatDateTime,
  getFriendlyRequestError,
} from "@/lib/requestUtils";
import { useAuth } from "@/hooks/useAuth";
import { ScenarioLocationFields } from "@/components/requests/ScenarioLocationFields";
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
  { number: 3, label: "Payment" },
  { number: 4, label: "Review" },
];

const STEP_FIELDS = {
  1: ["scenarioType", "categoryId", "title", "description"],
  2: [
    "area",
    "fulfillmentType",
    "pickupAddress",
    "pickupLandmark",
    "pickupInstructions",
    "deliveryAddress",
    "deliveryLandmark",
    "deliveryInstructions",
    "pickupContactName",
    "pickupContactPhone",
    "destinationContactName",
    "destinationContactPhone",
    "contactIsRequestor",
    "exactLatitude",
    "exactLongitude",
    "destinationExactLatitude",
    "destinationExactLongitude",
  ],
  3: [
    "expenseBudget",
    "serviceFee",
    "paymentArrangement",
    "payerType",
    "payerName",
    "payerPhone",
    "merchantReference",
    "requestorPresentAtHandoff",
    "dueAt",
  ],
  4: [],
};

const QUICK_REQUEST_TEMPLATES = [
  {
    id: "buy-deliver",
    scenarioType: REQUEST_SCENARIOS.BUY_DELIVERY,
    label: "Buy and deliver",
    description: "For groceries, food, or everyday store items.",
    categorySlug: "shopping-groceries",
    fulfillmentType: FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
    paymentArrangement: PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE,
    defaultTitle: "Buy and deliver items",
    descriptionHint:
      "List the items, quantities, preferred store, acceptable alternatives, and delivery instructions.",
    icon: ShoppingBasket,
  },
  {
    id: "pickup-deliver",
    scenarioType: REQUEST_SCENARIOS.PICKUP_DELIVERY,
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
    id: "prepaid-delivery",
    scenarioType: REQUEST_SCENARIOS.PREPAID_DELIVERY,
    label: "Collect a prepaid order",
    description: "For an order that is already paid and ready for pickup.",
    categorySlug: "small-delivery",
    fulfillmentType: FULFILLMENT_TYPES.DELIVERY,
    paymentArrangement: PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID,
    defaultTitle: "Collect and deliver a prepaid order",
    descriptionHint:
      "Describe the paid order, merchant, order reference, recipient, and delivery instructions.",
    icon: Store,
  },
  {
    id: "queue-on-site",
    scenarioType: REQUEST_SCENARIOS.ON_SITE,
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
    scenarioType: REQUEST_SCENARIOS.CUSTOM,
    label: "Custom request",
    description: "Start without presets and choose every detail.",
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

function buildRequestPlanSummary(values) {
  const handoffContact = getHandoffContact(values);
  const destination = values.deliveryAddress || values.pickupAddress;
  const action =
    values.fulfillmentType === FULFILLMENT_TYPES.ON_SITE
      ? `complete the task at ${destination}`
      : values.fulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY
        ? `complete the pickup at ${values.pickupAddress}`
        : `pick up from ${values.pickupAddress} and continue to ${values.deliveryAddress}`;
  const payment =
    values.paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
      ? `The Runner may spend up to ${formatCurrency(values.expenseBudget)} and will receive receipt-based reimbursement plus a ${formatCurrency(values.serviceFee)} fee.`
      : values.paymentArrangement === PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID
        ? `The order is prepaid; only the ${formatCurrency(values.serviceFee)} Runner fee is paid directly at handoff.`
        : `No purchase is needed; only the ${formatCurrency(values.serviceFee)} Runner fee is paid directly.`;
  const payer =
    values.payerType === PAYMENT_PAYER_TYPES.REQUESTOR
      ? "The Requestor will pay."
      : `${handoffContact.name} will pay as the task contact.`;
  return `The Runner will ${action}. ${handoffContact.name} is the handoff contact. ${payment} ${payer}`;
}

function RequestReviewScreen({
  values,
  selectedCategory,
  hasExactLocations,
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
  const hasDestinationPin =
    values.destinationExactLatitude !== null &&
    values.destinationExactLongitude !== null;

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
              Eligible Runners can see the task, general area, shaded map zones,
              deadline, expense estimate, Runner fee, payer type, and payment
              arrangement.
            </p>
          </Alert>
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
            <ShieldCheck className="mb-2 h-5 w-5 text-emerald-700" />
            <p className="font-bold">Your request plan</p>
            <p className="mt-1 text-sm leading-6">
              {buildRequestPlanSummary(values)}
            </p>
          </Alert>
          <Alert className="border-slate-200 bg-slate-50 text-slate-800">
            <LockKeyhole className="mb-2 h-5 w-5 text-slate-700" />
            <p className="font-bold">Private until acceptance</p>
            <p className="mt-1 text-sm leading-6">
              Exact addresses, exact map pins, contact details, payer contact
              information, and merchant reference are shared only with the
              assigned Runner.
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
                  <dt className="text-brand-900/70">Automatic public zones</dt>
                  <dd className="mt-1 font-bold text-brand-950">
                    {hasExactLocations
                      ? hasDestinationPin
                        ? "Pickup and delivery zones included"
                        : "Task zone included"
                      : "Required exact pin missing"}
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
                  <dt className="text-slate-500">Scenario</dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {REQUEST_SCENARIO_LABELS[values.scenarioType]}
                  </dd>
                </div>
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
                    <dd className="mt-1 text-emerald-700">
                      Exact pickup pin set
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
                    {needsDelivery && (
                      <dd className="mt-2 text-slate-600">
                        Pickup contact: {values.pickupContactName} /{" "}
                        {values.pickupContactPhone}
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
                    <dd className="mt-1 text-emerald-700">
                      Exact{" "}
                      {values.fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                        ? "task"
                        : "delivery"}{" "}
                      pin set
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
                      {getHandoffContact(values).name} /{" "}
                      {getHandoffContact(values).phone}
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
                {runnerAdvance
                  ? "Maximum Runner advance"
                  : values.paymentArrangement ===
                      PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID
                    ? "Prepaid order value"
                    : "Purchase expense"}
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
                {runnerAdvance
                  ? "Maximum at handoff"
                  : values.paymentArrangement ===
                      PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID
                    ? "Order value plus fee"
                    : "Runner fee only"}
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
      scenarioType: "",
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
      requestorPresentAtHandoff: true,
      dueAt: "",
      fulfillmentType: FULFILLMENT_TYPES.DELIVERY,
      pickupAddress: "",
      pickupLandmark: "",
      pickupInstructions: "",
      deliveryAddress: "",
      deliveryLandmark: "",
      deliveryInstructions: "",
      pickupContactName: "",
      pickupContactPhone: "",
      destinationContactName: profile.full_name || "",
      destinationContactPhone: profile.phone_number || "",
      contactIsRequestor: true,
      exactLatitude: null,
      exactLongitude: null,
      destinationExactLatitude: null,
      destinationExactLongitude: null,
    },
  });
  const formValues = useWatch({ control });
  const {
    title,
    categoryId,
    scenarioType,
    exactLatitude,
    exactLongitude,
    paymentArrangement,
    payerType,
    fulfillmentType,
    contactIsRequestor,
    requestorPresentAtHandoff,
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
  const hasExactLocations =
    exactLatitude !== null &&
    exactLatitude !== "" &&
    exactLongitude !== null &&
    exactLongitude !== "";
  const minimumDueAt = useMemo(() => minimumLocalDateTime(), []);
  const activeTemplate = QUICK_REQUEST_TEMPLATES.find(
    (template) => template.id === selectedTemplate,
  );
  const { needsPickup, needsDestination } =
    getLocationRequirements(fulfillmentType);
  const handoffContact = getHandoffContact(formValues);
  const scenarioRule = REQUEST_SCENARIO_RULES[scenarioType];

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

  useEffect(() => {
    if (payerType !== PAYMENT_PAYER_TYPES.RECIPIENT) return;
    setValue("payerName", handoffContact.name || "", { shouldDirty: true });
    setValue("payerPhone", handoffContact.phone || "", {
      shouldDirty: true,
      shouldValidate: currentStep >= 3,
    });
  }, [
    currentStep,
    handoffContact.name,
    handoffContact.phone,
    payerType,
    setValue,
  ]);

  useEffect(() => {
    if (!contactIsRequestor) return;
    const prefix =
      fulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY
        ? "pickupContact"
        : "destinationContact";
    setValue(`${prefix}Name`, profile.full_name || "", { shouldDirty: true });
    setValue(`${prefix}Phone`, profile.phone_number || "", {
      shouldDirty: true,
      shouldValidate: currentStep >= 2,
    });
  }, [
    contactIsRequestor,
    currentStep,
    fulfillmentType,
    profile.full_name,
    profile.phone_number,
    setValue,
  ]);

  function applyTemplate(template) {
    if (template.id === selectedTemplate) return;
    const previousTemplate = QUICK_REQUEST_TEMPLATES.find(
      (item) => item.id === selectedTemplate,
    );
    const mayReplaceSuggestedTitle =
      !title.trim() ||
      (previousTemplate?.defaultTitle &&
        title.trim() === previousTemplate.defaultTitle);

    setSelectedTemplate(template.id);
    setFormError("");
    setValue("scenarioType", template.scenarioType, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(
      "fulfillmentType",
      template.fulfillmentType || FULFILLMENT_TYPES.DELIVERY,
      {
        shouldDirty: true,
      },
    );
    setValue("paymentArrangement", template.paymentArrangement ?? "", {
      shouldDirty: true,
    });
    setValue("expenseBudget", 0, { shouldDirty: true });
    setValue("merchantReference", "", { shouldDirty: true });
    setValue("payerType", PAYMENT_PAYER_TYPES.REQUESTOR, { shouldDirty: true });
    setValue("payerName", "", { shouldDirty: true });
    setValue("payerPhone", "", { shouldDirty: true });
    setValue("requestorPresentAtHandoff", true, { shouldDirty: true });
    setValue("contactIsRequestor", true, { shouldDirty: true });
    setValue("area", "", { shouldDirty: true });
    setValue("pickupAddress", "", { shouldDirty: true });
    setValue("pickupLandmark", "", { shouldDirty: true });
    setValue("pickupInstructions", "", { shouldDirty: true });
    setValue("deliveryAddress", "", { shouldDirty: true });
    setValue("deliveryLandmark", "", { shouldDirty: true });
    setValue("deliveryInstructions", "", { shouldDirty: true });
    setValue("pickupContactName", "", { shouldDirty: true });
    setValue("pickupContactPhone", "", { shouldDirty: true });
    setValue("destinationContactName", profile.full_name || "", {
      shouldDirty: true,
    });
    setValue("destinationContactPhone", profile.phone_number || "", {
      shouldDirty: true,
    });
    setValue("exactLatitude", null, { shouldDirty: true });
    setValue("exactLongitude", null, { shouldDirty: true });
    setValue("destinationExactLatitude", null, { shouldDirty: true });
    setValue("destinationExactLongitude", null, { shouldDirty: true });

    if (template.id === "custom") {
      setValue("categoryId", "", {
        shouldDirty: true,
        shouldValidate: false,
      });
      if (previousTemplate?.defaultTitle === title.trim()) {
        setValue("title", "", {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
      return;
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

  function handleCustomFulfillmentChange(nextFulfillmentType) {
    setValue("paymentArrangement", "", { shouldDirty: true });
    setValue("expenseBudget", 0, { shouldDirty: true });
    setValue("merchantReference", "", { shouldDirty: true });
    setValue("area", "", { shouldDirty: true });
    for (const field of [
      "pickupAddress",
      "pickupLandmark",
      "pickupInstructions",
      "deliveryAddress",
      "deliveryLandmark",
      "deliveryInstructions",
      "pickupContactName",
      "pickupContactPhone",
      "destinationContactName",
      "destinationContactPhone",
    ]) {
      setValue(field, "", { shouldDirty: true });
    }
    for (const field of [
      "exactLatitude",
      "exactLongitude",
      "destinationExactLatitude",
      "destinationExactLongitude",
    ]) {
      setValue(field, null, { shouldDirty: true });
    }
    setValue("contactIsRequestor", true, { shouldDirty: true });
    if (nextFulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY) {
      setValue("pickupContactName", profile.full_name || "", {
        shouldDirty: true,
      });
      setValue("pickupContactPhone", profile.phone_number || "", {
        shouldDirty: true,
      });
    } else {
      setValue("destinationContactName", profile.full_name || "", {
        shouldDirty: true,
      });
      setValue("destinationContactPhone", profile.phone_number || "", {
        shouldDirty: true,
      });
    }
  }

  async function goToNextStep() {
    setFormError("");
    const valid = await trigger(STEP_FIELDS[currentStep], {
      shouldFocus: true,
    });
    if (!valid) return;
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
            <input type="hidden" {...register("scenarioType")} />
            {errors.scenarioType?.message && (
              <p className="text-sm text-red-600">
                {errors.scenarioType.message}
              </p>
            )}

            {activeTemplate && (
              <Alert className="border-brand-200 bg-brand-50 text-brand-950">
                <Check className="mb-2 h-5 w-5 text-brand-700" />
                <p className="font-bold">{activeTemplate.label} selected</p>
                <p className="mt-1 text-sm leading-6">
                  {activeTemplate.id === "custom"
                    ? "Choose the location pattern and payment setup that match the task. Invalid combinations will be blocked."
                    : "The required locations and payment setup were selected for this scenario. You can review every detail before posting."}
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
                Enter each real address and place its private map pin once.
                ButuanGo creates the public shaded zones automatically.
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
                <ScenarioLocationFields
                  control={control}
                  register={register}
                  errors={errors}
                  fulfillmentType={fulfillmentType}
                  idPrefix="create"
                  setValue={setValue}
                  trigger={trigger}
                  profile={profile}
                  contactIsRequestor={contactIsRequestor}
                  requestorPresentAtHandoff={requestorPresentAtHandoff}
                  showFulfillmentSelector={
                    scenarioType === REQUEST_SCENARIOS.CUSTOM
                  }
                  onFulfillmentChange={handleCustomFulfillmentChange}
                  onPrimaryAreaSuggested={(suggestedArea) =>
                    setValue("area", suggestedArea, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </section>
              <input type="hidden" {...register("area")} />
              <Alert className="border-brand-200 bg-brand-50 text-brand-950">
                <Eye className="mb-2 h-5 w-5 text-brand-700" />
                <p className="font-bold">Shown before acceptance</p>
                <p className="mt-1 text-sm leading-6">
                  Runners will see{" "}
                  {formValues.area || "a generated general area"}
                  {needsPickup && needsDestination
                    ? " and two broad shaded zones."
                    : " and one broad shaded zone."}{" "}
                  Your exact pins remain private.
                </p>
                {errors.area?.message && (
                  <p
                    className="mt-2 text-sm font-semibold text-red-700"
                    role="alert"
                  >
                    We could not identify the general area. Open the primary
                    map, search for the location, and choose a result.
                  </p>
                )}
              </Alert>
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
                <CardTitle>Payment and schedule</CardTitle>
                <CardDescription>
                  Answer the payment questions, set the amounts, and add an
                  optional deadline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RequestPaymentFields
                  register={register}
                  errors={errors}
                  paymentArrangement={paymentArrangement}
                  payerType={payerType}
                  expenseBudget={expenseBudget}
                  idPrefix="createPayment"
                  guided
                  setValue={setValue}
                  contactName={handoffContact.name}
                  contactPhone={handoffContact.phone}
                  contactIsRequestor={contactIsRequestor}
                  requestorPresentAtHandoff={requestorPresentAtHandoff}
                  allowedArrangements={scenarioRule?.allowedPaymentArrangements}
                />
                {paymentArrangement && (
                  <div
                    className={`grid gap-5 ${
                      paymentArrangement === PAYMENT_ARRANGEMENTS.NO_PURCHASE
                        ? ""
                        : "sm:grid-cols-2"
                    }`}
                  >
                    {paymentArrangement !==
                      PAYMENT_ARRANGEMENTS.NO_PURCHASE && (
                      <FormField
                        id="expenseBudget"
                        label={
                          paymentArrangement ===
                          PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
                            ? "Maximum amount the Runner may spend"
                            : "Prepaid order value (optional)"
                        }
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
                    )}
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
                )}
                {paymentArrangement && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-600">
                      Expected payment to the Runner at handoff
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-950">
                      {formatCurrency(amountDueToRunner)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {paymentArrangement ===
                      PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
                        ? "Maximum advance plus Runner fee. The actual reimbursement will follow the receipt."
                        : "The purchase expense is not collected by the Runner under this arrangement."}
                    </p>
                  </div>
                )}
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
            hasExactLocations={hasExactLocations}
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
