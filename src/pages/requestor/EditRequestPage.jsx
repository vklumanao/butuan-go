import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarClock, LoaderCircle, MapPin } from "lucide-react";
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
  REQUEST_STATUSES,
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
  const expenseBudget =
    Number(useWatch({ control, name: "expenseBudget" })) || 0;
  const serviceFee = Number(useWatch({ control, name: "serviceFee" })) || 0;
  const paymentArrangement = useWatch({
    control,
    name: "paymentArrangement",
  });
  const payerType = useWatch({ control, name: "payerType" });
  const fulfillmentType = useWatch({ control, name: "fulfillmentType" });
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
      ([categoryResult, requestResult, locationResult, paymentDetailsResult]) => {
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
            dueAt: toLocalDateTime(request.due_at),
            fulfillmentType:
              location?.fulfillment_type || FULFILLMENT_TYPES.DELIVERY,
            pickupAddress: location?.pickup_address || "",
            pickupLandmark: location?.pickup_landmark || "",
            pickupInstructions: location?.pickup_instructions || "",
            deliveryAddress: location?.delivery_address || "",
            deliveryLandmark: location?.delivery_landmark || "",
            deliveryInstructions: location?.delivery_instructions || "",
            contactName: location?.contact_name || profile.full_name || "",
            contactPhone: location?.contact_phone || profile.phone_number || "",
            approximateLatitude: request.approximate_latitude,
            approximateLongitude: request.approximate_longitude,
          });
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [requestId, reset, profile.full_name, profile.phone_number, user.id]);

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
            <FormField
              id="editArea"
              label="General service area (public)"
              error={errors.area?.message}
            >
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  id="editArea"
                  className="pl-10"
                  maxLength={160}
                  {...register("area")}
                />
              </div>
            </FormField>
            <ApproximateLocationPicker
              control={control}
              register={register}
              setValue={setValue}
              trigger={trigger}
              errors={errors}
              idPrefix="edit"
              onAreaSuggested={(suggestedArea) =>
                setValue("area", suggestedArea, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="editExpenseBudget"
                label="Estimated errand expense"
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
            <RequestLocationFields
              register={register}
              errors={errors}
              fulfillmentType={fulfillmentType}
              idPrefix="edit"
              setValue={setValue}
            />
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
