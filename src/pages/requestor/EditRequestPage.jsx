import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarClock, LoaderCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { requestSchema } from "@/validation/requestSchema";
import {
  getCategories,
  getRequestPaymentDetails,
  getRequestorRequestById,
  getRequestLocation,
  updateOpenRequest,
} from "@/services/requestService";
import {
  FULFILLMENT_TYPES,
  PAYMENT_ARRANGEMENTS,
  PAYMENT_PAYER_TYPES,
  REQUEST_SCENARIO_LABELS,
  REQUEST_SCENARIO_RULES,
  REQUEST_SCENARIOS,
  REQUEST_STATUSES,
} from "@/lib/requestConstants";
import {
  getHandoffContact,
  inferScenarioType,
} from "@/lib/requestScenarioUtils";
import { devLog } from "@/lib/errors";
import { formatCurrency, getFriendlyRequestError } from "@/lib/requestUtils";
import { useAuth } from "@/hooks/useAuth";
import { ScenarioLocationFields } from "@/components/requests/ScenarioLocationFields";
import { InPersonPaymentNotice } from "@/components/requests/InPersonPaymentNotice";
import { RequestPaymentFields } from "@/components/requests/RequestPaymentTerms";
import { FormField } from "@/components/common/FormField";
import { FullPageLoader } from "@/components/common/FullPageLoader";
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

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function minimumLocalDateTime() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function EditRequestPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [requestStatus, setRequestStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const {
    register,
    setValue,
    trigger,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      scenarioType: REQUEST_SCENARIOS.CUSTOM,
      categoryId: "",
      title: "",
      description: "",
      area: "",
      expenseBudget: 0,
      serviceFee: 0,
      paymentArrangement: PAYMENT_ARRANGEMENTS.NO_PURCHASE,
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
  const expenseBudget =
    Number(useWatch({ control, name: "expenseBudget" })) || 0;
  const serviceFee = Number(useWatch({ control, name: "serviceFee" })) || 0;
  const paymentArrangement = useWatch({
    control,
    name: "paymentArrangement",
  });
  const payerType = useWatch({ control, name: "payerType" });
  const fulfillmentType = useWatch({ control, name: "fulfillmentType" });
  const scenarioType = useWatch({ control, name: "scenarioType" });
  const contactIsRequestor = useWatch({
    control,
    name: "contactIsRequestor",
  });
  const requestorPresentAtHandoff = useWatch({
    control,
    name: "requestorPresentAtHandoff",
  });
  const formValues = useWatch({ control });
  const handoffContact = getHandoffContact(formValues);
  const scenarioRule = REQUEST_SCENARIO_RULES[scenarioType];
  const amountDueToRunner =
    paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
      ? expenseBudget + serviceFee
      : serviceFee;
  const minimumDueAt = useMemo(() => minimumLocalDateTime(), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      getCategories(),
      getRequestorRequestById(requestId, user.id),
      getRequestLocation(requestId),
      getRequestPaymentDetails(requestId),
    ]).then(
      ([
        categoryResult,
        requestResult,
        locationResult,
        paymentDetailsResult,
      ]) => {
        if (!active) return;
        if (
          categoryResult.error ||
          requestResult.error ||
          locationResult.error ||
          paymentDetailsResult.error
        ) {
          devLog(
            "Edit request retrieval failed",
            categoryResult.error ||
              requestResult.error ||
              locationResult.error ||
              paymentDetailsResult.error,
          );
          setLoadError("We could not load this request for editing.");
        } else {
          const request = requestResult.data;
          const location = locationResult.data;
          const terms = request.payment_terms;
          const paymentDetails = paymentDetailsResult.data;
          setCategories(categoryResult.data || []);
          setRequestStatus(request.status);
          reset({
            scenarioType:
              request.scenario_type ||
              inferScenarioType(location?.fulfillment_type, terms?.arrangement),
            categoryId: String(request.category_id),
            title: request.title,
            description: request.description,
            area: request.area,
            expenseBudget: Number(request.expense_budget),
            serviceFee: Number(request.service_fee),
            paymentArrangement:
              terms?.arrangement || PAYMENT_ARRANGEMENTS.NO_PURCHASE,
            payerType: terms?.payer_type || PAYMENT_PAYER_TYPES.REQUESTOR,
            payerName: paymentDetails?.payer_name || "",
            payerPhone: paymentDetails?.payer_phone || "",
            merchantReference: paymentDetails?.merchant_reference || "",
            requestorPresentAtHandoff:
              terms?.requestor_present_at_handoff ?? true,
            dueAt: toLocalDateTime(request.due_at),
            fulfillmentType:
              location?.fulfillment_type || FULFILLMENT_TYPES.DELIVERY,
            pickupAddress: location?.pickup_address || "",
            pickupLandmark: location?.pickup_landmark || "",
            pickupInstructions: location?.pickup_instructions || "",
            deliveryAddress: location?.delivery_address || "",
            deliveryLandmark: location?.delivery_landmark || "",
            deliveryInstructions: location?.delivery_instructions || "",
            pickupContactName:
              location?.pickup_contact_name ||
              (location?.fulfillment_type === FULFILLMENT_TYPES.PICKUP_ONLY
                ? location?.contact_name
                : "") ||
              "",
            pickupContactPhone:
              location?.pickup_contact_phone ||
              (location?.fulfillment_type === FULFILLMENT_TYPES.PICKUP_ONLY
                ? location?.contact_phone
                : "") ||
              "",
            destinationContactName:
              location?.destination_contact_name ||
              (location?.fulfillment_type !== FULFILLMENT_TYPES.PICKUP_ONLY
                ? location?.contact_name
                : "") ||
              profile.full_name ||
              "",
            destinationContactPhone:
              location?.destination_contact_phone ||
              (location?.fulfillment_type !== FULFILLMENT_TYPES.PICKUP_ONLY
                ? location?.contact_phone
                : "") ||
              profile.phone_number ||
              "",
            contactIsRequestor: location?.contact_is_requestor ?? true,
            exactLatitude: location?.exact_latitude ?? null,
            exactLongitude: location?.exact_longitude ?? null,
            destinationExactLatitude:
              location?.destination_exact_latitude ?? null,
            destinationExactLongitude:
              location?.destination_exact_longitude ?? null,
          });
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [requestId, reset, profile.full_name, profile.phone_number, user.id]);

  useEffect(() => {
    if (payerType !== PAYMENT_PAYER_TYPES.RECIPIENT) return;
    setValue("payerName", handoffContact.name || "", { shouldDirty: true });
    setValue("payerPhone", handoffContact.phone || "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [handoffContact.name, handoffContact.phone, payerType, setValue]);

  function changeScenario(nextScenario) {
    const rule = REQUEST_SCENARIO_RULES[nextScenario];
    setValue("scenarioType", nextScenario, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("fulfillmentType", rule.fulfillmentType, { shouldDirty: true });
    setValue("paymentArrangement", rule.paymentArrangement, {
      shouldDirty: true,
    });
    setValue("expenseBudget", 0, { shouldDirty: true });
    setValue("merchantReference", "", { shouldDirty: true });
    setValue("payerType", PAYMENT_PAYER_TYPES.REQUESTOR, { shouldDirty: true });
    setValue("requestorPresentAtHandoff", true, { shouldDirty: true });
    setValue("contactIsRequestor", true, { shouldDirty: true });
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
    setValue("destinationContactName", profile.full_name || "", {
      shouldDirty: true,
    });
    setValue("destinationContactPhone", profile.phone_number || "", {
      shouldDirty: true,
    });
  }

  function changeCustomFulfillment(nextFulfillmentType) {
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
    const prefix =
      nextFulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY
        ? "pickupContact"
        : "destinationContact";
    setValue(`${prefix}Name`, profile.full_name || "", { shouldDirty: true });
    setValue(`${prefix}Phone`, profile.phone_number || "", {
      shouldDirty: true,
    });
  }

  async function onSubmit(values) {
    setFormError("");
    const { data, error } = await updateOpenRequest(requestId, values);
    if (error) {
      devLog("Request update failed", error);
      setFormError(getFriendlyRequestError(error, "update your request"));
      return;
    }
    toast.success(
      "Your request and private location details have been updated.",
    );
    navigate(`/requestor/requests/${data.id}`, { replace: true });
  }

  if (loading) return <FullPageLoader message="Loading request editor…" />;
  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        <Alert variant="destructive">{loadError}</Alert>
        <Button asChild className="mt-4">
          <Link to={`/requestor/requests/${requestId}`}>Back to request</Link>
        </Button>
      </div>
    );
  }
  if (requestStatus !== REQUEST_STATUSES.OPEN) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        <Alert variant="destructive">Only an OPEN request can be edited.</Alert>
        <Button asChild className="mt-4">
          <Link to={`/requestor/requests/${requestId}`}>Back to request</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <Button variant="ghost" asChild className="-ml-3 mb-4">
        <Link to={`/requestor/requests/${requestId}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to request
        </Link>
      </Button>
      <h1 className="text-3xl font-black tracking-tight">Edit request</h1>
      <p className="mt-2 text-slate-600">
        Request and location changes are allowed while this request remains
        open.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-6"
        noValidate
      >
        <Card>
          <CardHeader>
            <CardTitle>Request details</CardTitle>
            <CardDescription>
              Keep the public task summary clear and lawful.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formError && <Alert variant="destructive">{formError}</Alert>}
            <FormField
              id="editScenario"
              label="Request scenario"
              error={errors.scenarioType?.message}
            >
              <select
                id="editScenario"
                value={scenarioType}
                onChange={(event) => changeScenario(event.target.value)}
                className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
              >
                {Object.entries(REQUEST_SCENARIO_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
              <input type="hidden" {...register("scenarioType")} />
            </FormField>
            <FormField
              id="editCategory"
              label="Task category"
              error={errors.categoryId?.message}
            >
              <select
                id="editCategory"
                className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
                {...register("categoryId")}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="editTitle"
              label="Request title"
              error={errors.title?.message}
            >
              <Input id="editTitle" maxLength={120} {...register("title")} />
            </FormField>
            <FormField
              id="editDescription"
              label="Description"
              error={errors.description?.message}
            >
              <Textarea
                id="editDescription"
                maxLength={2000}
                {...register("description")}
              />
            </FormField>
            <input type="hidden" {...register("area")} />
            <div
              className={`grid gap-5 ${
                paymentArrangement === PAYMENT_ARRANGEMENTS.NO_PURCHASE
                  ? ""
                  : "sm:grid-cols-2"
              }`}
            >
              {paymentArrangement !== PAYMENT_ARRANGEMENTS.NO_PURCHASE && (
                <FormField
                  id="editExpenseBudget"
                  label={
                    paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
                      ? "Maximum amount the Runner may spend"
                      : "Prepaid order value (optional)"
                  }
                  error={errors.expenseBudget?.message}
                >
                  <Input
                    id="editExpenseBudget"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("expenseBudget")}
                  />
                </FormField>
              )}
              <FormField
                id="editServiceFee"
                label="Agreed Runner service fee"
                error={errors.serviceFee?.message}
              >
                <Input
                  id="editServiceFee"
                  type="number"
                  min="0"
                  step="0.01"
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
              idPrefix="editPayment"
              guided
              setValue={setValue}
              contactName={handoffContact.name}
              contactPhone={handoffContact.phone}
              contactIsRequestor={contactIsRequestor}
              requestorPresentAtHandoff={requestorPresentAtHandoff}
              allowedArrangements={scenarioRule.allowedPaymentArrangements}
            />
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Expected amount paid to the Runner at handoff
              </p>
              <p className="mt-1 text-2xl font-black">
                {formatCurrency(amountDueToRunner)}
              </p>
            </div>
            <InPersonPaymentNotice />
            <FormField
              id="editDueAt"
              label="Due date and time (optional)"
              error={errors.dueAt?.message}
            >
              <div className="relative">
                <CalendarClock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  id="editDueAt"
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
            <CardTitle>Private pickup, delivery, and contact</CardTitle>
            <CardDescription>
              These details are not visible in the public Runner marketplace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScenarioLocationFields
              control={control}
              register={register}
              errors={errors}
              fulfillmentType={fulfillmentType}
              idPrefix="edit"
              setValue={setValue}
              trigger={trigger}
              profile={profile}
              contactIsRequestor={contactIsRequestor}
              requestorPresentAtHandoff={requestorPresentAtHandoff}
              onPrimaryAreaSuggested={(suggestedArea) =>
                setValue("area", suggestedArea, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              showFulfillmentSelector={
                scenarioType === REQUEST_SCENARIOS.CUSTOM
              }
              onFulfillmentChange={changeCustomFulfillment}
            />
            {errors.area?.message && (
              <Alert variant="destructive" className="mt-6">
                We could not identify the general area. Open the primary map,
                search for the location, and choose a result.
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
          <Button variant="outline" asChild>
            <Link to={`/requestor/requests/${requestId}`}>Discard changes</Link>
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving changes…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
