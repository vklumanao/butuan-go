import {
  LockKeyhole,
  MapPin,
  MapPinOff,
  Navigation,
  Pencil,
  Phone,
  RefreshCw,
  Store,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  FULFILLMENT_TYPES,
  FULFILLMENT_TYPE_LABELS,
} from "@/lib/requestConstants";
import { buildDirectionsUrl } from "@/lib/requestUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LocationSection({
  icon: Icon,
  title,
  address,
  landmark,
  instructions,
  contactLabel,
  contactName,
  contactPhone,
  exactLatitude,
  exactLongitude,
}) {
  if (!address) return null;
  const exactPoint =
    exactLatitude !== null &&
    exactLatitude !== undefined &&
    exactLongitude !== null &&
    exactLongitude !== undefined
      ? `${exactLatitude},${exactLongitude}`
      : "";
  const directionsUrl = buildDirectionsUrl(exactPoint || address);
  return (
    <section className="flex gap-3 border-t border-slate-200 pt-5 first:border-0 first:pt-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
          {address}
        </p>
        {landmark && (
          <p className="mt-2 break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
            <strong>Landmark:</strong> {landmark}
          </p>
        )}
        {instructions && (
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
            <strong>Instructions:</strong> {instructions}
          </p>
        )}
        {contactName && contactPhone && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {contactLabel}
            </p>
            <p className="mt-1 break-words text-sm text-slate-700">
              {contactName}
            </p>
            <a
              className="mt-1 inline-block break-all text-sm font-semibold text-brand-700 hover:underline"
              href={`tel:${contactPhone}`}
            >
              {contactPhone}
            </a>
          </div>
        )}
        {directionsUrl && (
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <a href={directionsUrl} target="_blank" rel="noreferrer">
              <Navigation className="h-4 w-4" />
              {exactPoint ? "Open exact pin" : "Open address"}
            </a>
          </Button>
        )}
      </div>
    </section>
  );
}

export function RequestLocationDetails({
  location,
  locked = false,
  editTo = null,
  onRefresh = null,
}) {
  if (locked) {
    return (
      <Card>
        <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
          <CardTitle>Pickup and delivery details</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 p-5 pt-3 sm:p-6 sm:pt-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="font-semibold">Available after acceptance</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              To protect the Requestor’s privacy, exact addresses and contact
              details are shown only to the assigned Runner.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!location) {
    return (
      <Card className="border-dashed">
        <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-3">
          <CardTitle>Private location details</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-3 sm:p-6 sm:pt-3">
          <div className="flex gap-3">
            <MapPinOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Location details are incomplete</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                The task cannot start until the Requestor adds the required
                private address and contact information.
              </p>
            </div>
          </div>
          {editTo && (
            <Button className="mt-5 max-w-full" asChild>
              <Link to={editTo}>
                <MapPin className="h-4 w-4" />
                Add location details
              </Link>
            </Button>
          )}
          {!editTo && onRefresh && (
            <Button className="mt-5" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
              Check again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const destinationUsesPrimaryPin =
    location.fulfillment_type === FULFILLMENT_TYPES.ON_SITE;

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-3 p-5 pb-3 sm:flex-row sm:justify-between sm:gap-4 sm:p-6 sm:pb-3">
        <div className="min-w-0">
          <CardTitle>Private location details</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {FULFILLMENT_TYPE_LABELS[location.fulfillment_type] ||
              "Task location"}
          </p>
        </div>
        {editTo && (
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link to={editTo}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5 p-5 pt-3 sm:p-6 sm:pt-3">
        <LocationSection
          icon={Store}
          title="Pickup"
          address={location.pickup_address}
          landmark={location.pickup_landmark}
          instructions={location.pickup_instructions}
          contactLabel="Pickup contact"
          contactName={location.pickup_contact_name}
          contactPhone={location.pickup_contact_phone}
          exactLatitude={location.exact_latitude}
          exactLongitude={location.exact_longitude}
        />
        <LocationSection
          icon={MapPin}
          title="Delivery or destination"
          address={location.delivery_address}
          landmark={location.delivery_landmark}
          instructions={location.delivery_instructions}
          contactLabel="Recipient or on-site contact"
          contactName={location.destination_contact_name}
          contactPhone={location.destination_contact_phone}
          exactLatitude={
            destinationUsesPrimaryPin
              ? location.exact_latitude
              : location.destination_exact_latitude
          }
          exactLongitude={
            destinationUsesPrimaryPin
              ? location.exact_longitude
              : location.destination_exact_longitude
          }
        />
        {!location.pickup_contact_name &&
          !location.destination_contact_name && (
            <section className="flex gap-3 border-t border-slate-200 pt-5">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">Task contact</h3>
                <p className="mt-1 break-words text-sm text-slate-700">
                  {location.contact_name}
                </p>
                <a
                  className="mt-1 inline-block break-all text-sm font-semibold text-brand-700 hover:underline"
                  href={`tel:${location.contact_phone}`}
                >
                  {location.contact_phone}
                </a>
              </div>
            </section>
          )}
      </CardContent>
    </Card>
  );
}
