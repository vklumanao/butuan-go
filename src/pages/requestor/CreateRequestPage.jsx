import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CalendarClock,
  LoaderCircle,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { requestSchema } from "@/validation/requestSchema";
import { createRequest, getCategories } from "@/services/requestService";
import { FULFILLMENT_TYPES } from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import { formatCurrency, getFriendlyRequestError } from "@/lib/requestUtils";
import { useAuth } from "@/hooks/useAuth";
import { RequestLocationFields } from "@/components/requests/RequestLocationFields";
import { InPersonPaymentNotice } from "@/components/requests/InPersonPaymentNotice";
import { FormField } from "@/components/common/FormField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

function minimumLocalDateTime() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function CreateRequestPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [formError, setFormError] = useState("");
  const {
    register,
    setValue,
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
    },
  });
  const expenseBudget =
    Number(useWatch({ control, name: "expenseBudget" })) || 0;
  const serviceFee = Number(useWatch({ control, name: "serviceFee" })) || 0;
  const fulfillmentType = useWatch({ control, name: "fulfillmentType" });
  const estimatedTotal = expenseBudget + serviceFee;
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
    toast.success(
      "Your request has been posted with private location details.",
    );
    navigate(`/requestor/requests/${data.id}`, { replace: true });
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
          Describe a lawful everyday errand and provide private fulfillment
          details.
        </p>
      </div>
      <Alert className="mt-6">
        <ShieldAlert className="mb-2 h-5 w-5" />
        <AlertTitle>Public and private details are separated</AlertTitle>
        <AlertDescription>
          The general area is visible in the Runner marketplace. Exact addresses
          and contact details are disclosed only to the assigned Runner.
        </AlertDescription>
      </Alert>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-6"
        noValidate
      >
        <Card>
          <CardHeader>
            <CardTitle>Task details</CardTitle>
            <CardDescription>
              All fields except the due date are required. Amounts are in
              Philippine pesos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {categoriesError && (
              <Alert variant="destructive">{categoriesError}</Alert>
            )}
            {formError && <Alert variant="destructive">{formError}</Alert>}
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
              label="Description"
              error={errors.description?.message}
            >
              <Textarea
                id="requestDescription"
                placeholder="Explain what needs to be purchased, picked up, or delivered."
                maxLength={2000}
                {...register("description")}
              />
            </FormField>
            <FormField
              id="requestArea"
              label="General service area (public)"
              error={errors.area?.message}
            >
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  id="requestArea"
                  className="pl-10"
                  placeholder="Example: J.C. Aquino Avenue area"
                  maxLength={160}
                  {...register("area")}
                />
              </div>
            </FormField>
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
                label="Agreed Runner service fee"
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
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Estimated amount to settle in person
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {formatCurrency(estimatedTotal)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                The final expense may depend on the actual receipt. Agree on any
                change before purchase.
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
            <CardTitle>Pickup, delivery, and contact</CardTitle>
            <CardDescription>
              These exact details stay private until a Runner accepts the
              request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RequestLocationFields
              register={register}
              errors={errors}
              fulfillmentType={fulfillmentType}
              idPrefix="create"
              setValue={setValue}
              applyDefaultAddress
            />
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link to="/requestor/requests">Cancel</Link>
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={
              isSubmitting || categoriesLoading || Boolean(categoriesError)
            }
          >
            {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Posting request…" : "Post request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
