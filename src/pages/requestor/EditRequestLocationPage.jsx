import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { requestLocationSchema } from "@/validation/requestSchema";
import {
  getRequestorRequestById,
  getRequestLocation,
  saveRequestLocation,
} from "@/services/requestService";
import { FULFILLMENT_TYPES, REQUEST_STATUSES } from "@/lib/requestConstants";
import { devLog } from "@/lib/errors";
import { getFriendlyRequestError } from "@/lib/requestUtils";
import { useAuth } from "@/hooks/useAuth";
import { RequestLocationFields } from "@/components/requests/RequestLocationFields";
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

export function EditRequestLocationPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const {
    register,
    setValue,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(requestLocationSchema),
    defaultValues: {
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
  const fulfillmentType = useWatch({ control, name: "fulfillmentType" });

  useEffect(() => {
    let active = true;
    Promise.all([
      getRequestorRequestById(requestId, user.id),
      getRequestLocation(requestId),
    ]).then(([requestResult, locationResult]) => {
      if (!active) return;
      if (requestResult.error || locationResult.error) {
        devLog(
          "Private location editor retrieval failed",
          requestResult.error || locationResult.error,
        );
        setLoadError("We could not load the private location editor.");
      } else {
        const location = locationResult.data;
        setRequest(requestResult.data);
        reset({
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
        });
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [requestId, reset, profile.full_name, profile.phone_number, user.id]);

  async function onSubmit(values) {
    setFormError("");
    const { error } = await saveRequestLocation(requestId, values);
    if (error) {
      devLog("Private location update failed", error);
      setFormError(
        getFriendlyRequestError(error, "save the private location details"),
      );
      return;
    }
    toast.success("Private location details saved.");
    navigate(`/requestor/requests/${requestId}`, { replace: true });
  }

  if (loading)
    return <FullPageLoader message="Loading private location details…" />;
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

  const canEdit = [REQUEST_STATUSES.OPEN, REQUEST_STATUSES.ACCEPTED].includes(
    request.status,
  );
  if (!canEdit) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        <Alert variant="destructive">
          Private location details cannot be changed after the Runner starts
          work.
        </Alert>
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
      <h1 className="text-3xl font-black tracking-tight">
        Private location details
      </h1>
      <p className="mt-2 text-slate-600">
        {request.status === REQUEST_STATUSES.ACCEPTED
          ? "The assigned Runner can see these changes immediately. Details lock when work starts."
          : "These details become visible only to the Runner who accepts your request."}
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pickup, delivery, and contact</CardTitle>
          <CardDescription>
            Provide only the information needed to complete the task.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError && (
            <Alert variant="destructive" className="mb-6">
              {formError}
            </Alert>
          )}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            <RequestLocationFields
              register={register}
              errors={errors}
              fulfillmentType={fulfillmentType}
              idPrefix="locationOnly"
              setValue={setValue}
            />
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild>
                <Link to={`/requestor/requests/${requestId}`}>
                  Discard changes
                </Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Saving…" : "Save private details"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
