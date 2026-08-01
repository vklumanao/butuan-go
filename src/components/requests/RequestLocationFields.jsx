import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useWatch } from "react-hook-form";
import { Link } from "react-router-dom";
import {
  LocateFixed,
  LoaderCircle,
  LockKeyhole,
  Map as MapIcon,
  MapPin,
  MapPinned,
  Phone,
  Store,
  X,
} from "lucide-react";
import {
  FULFILLMENT_TYPES,
  FULFILLMENT_TYPE_LABELS,
} from "@/lib/requestConstants";
import { FormField } from "@/components/common/FormField";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSavedAddresses } from "@/services/addressService";
import { devLog } from "@/lib/errors";

const RequestAreaMapSelector = lazy(() =>
  import("@/components/requests/RequestAreaMapSelector").then((module) => ({
    default: module.RequestAreaMapSelector,
  })),
);

function SavedAddressSelector({
  id,
  label,
  addresses,
  loading,
  value,
  onChange,
}) {
  return (
    <div className="mb-5 rounded-lg border border-brand-100 bg-brand-50/50 p-3">
      <p id={`${id}Label`} className="text-sm font-semibold text-brand-900">
        {label}
      </p>
      {loading && (
        <p className="mt-2 text-sm text-brand-900/70">
          Loading saved locations...
        </p>
      )}
      {!loading && addresses.length > 0 && (
        <div
          className="mt-3 grid gap-2 sm:grid-cols-2"
          role="group"
          aria-labelledby={`${id}Label`}
        >
          {addresses.map((address) => {
            const selected = value === address.id;
            return (
              <button
                key={address.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(address.id)}
                className={`rounded-lg border bg-white p-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600/30 ${
                  selected
                    ? "border-brand-600 ring-1 ring-brand-600"
                    : "border-brand-200 hover:border-brand-400"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {address.label}
                  </span>
                  {address.is_default && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-800">
                      Default
                    </span>
                  )}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600">
                  {address.full_address}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <select
        id={id}
        tabIndex={-1}
        aria-hidden="true"
        aria-labelledby={`${id}Label`}
        value={value}
        disabled={loading}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
      >
        <option value="">
          {loading
            ? "Loading saved addresses…"
            : "Choose a saved address (optional)"}
        </option>
        {addresses.map((address) => (
          <option key={address.id} value={address.id}>
            {address.label}
            {address.is_default ? " — Default" : ""}
          </option>
        ))}
      </select>
      {!loading && addresses.length === 0 && (
        <p className="mt-2 text-sm leading-6 text-brand-900/70">
          No saved locations yet. Enter the details manually or add one from
          your Profile.
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-brand-900/70">
        One tap copies the address, landmark, instructions, and any saved
        recipient details. You can still edit this request.{" "}
        <Link to="/requestor/profile" className="font-semibold underline">
          Manage saved locations
        </Link>
      </p>
    </div>
  );
}

export function ApproximateLocationPicker({
  control,
  register,
  setValue,
  trigger,
  errors,
  idPrefix,
  onAreaSuggested = null,
  embedded = false,
}) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [accuracy, setAccuracy] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const latitude = useWatch({ control, name: "approximateLatitude" });
  const longitude = useWatch({ control, name: "approximateLongitude" });
  const hasLocation =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude));

  function setCoordinatePair(nextLatitude, nextLongitude) {
    setValue("approximateLatitude", nextLatitude, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("approximateLongitude", nextLongitude, {
      shouldDirty: true,
      shouldValidate: false,
    });
    void trigger(["approximateLatitude", "approximateLongitude"]);
  }

  function useCurrentLocation() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinatePair(position.coords.latitude, position.coords.longitude);
        setAccuracy(Math.round(position.coords.accuracy));
        setLocating(false);
      },
      (error) => {
        const messages = {
          1: "Location permission was denied. You can continue without nearby discovery.",
          2: "Your device could not determine its location. Try again outdoors or continue without it.",
          3: "Finding your location took too long. Please try again.",
        };
        setLocationError(
          messages[error.code] || "We could not determine your location.",
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000,
      },
    );
  }

  function clearLocation() {
    setCoordinatePair(null, null);
    setAccuracy(null);
    setLocationError("");
  }

  function selectMapArea(selectedLatitude, selectedLongitude) {
    setCoordinatePair(selectedLatitude, selectedLongitude);
    setAccuracy(null);
    setLocationError("");
  }

  return (
    <section
      className={
        embedded
          ? "border-t border-brand-200 pt-5"
          : "rounded-xl border border-brand-200 bg-brand-50/40 p-4 sm:p-5"
      }
    >
      <input
        type="hidden"
        id={`${idPrefix}ApproximateLatitude`}
        {...register("approximateLatitude")}
      />
      <input
        type="hidden"
        id={`${idPrefix}ApproximateLongitude`}
        {...register("approximateLongitude")}
      />
      <div className="flex gap-3">
        <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-brand-950">
            {embedded
              ? "Help Runners estimate the distance (optional)"
              : "Help nearby Runners find this request"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-brand-900/80">
            {embedded
              ? "Add an approximate map area so nearby Runners can judge how close the task is. Your exact address stays hidden."
              : "Optionally use this device’s location. ButuanGo saves only a neighborhood-level approximation and displays it as a broad shaded area; it does not publish the exact coordinates captured by your browser."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={hasLocation ? "outline" : "default"}
              size="sm"
              onClick={useCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              {locating
                ? "Finding location…"
                : hasLocation
                  ? "Update location"
                  : "Use current location"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMapOpen((open) => !open)}
            >
              <MapIcon className="h-4 w-4" />
              {mapOpen ? "Close map" : "Choose on map"}
            </Button>
            {hasLocation && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearLocation}
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
          {hasLocation && (
            <p className="mt-3 text-sm font-semibold text-brand-800">
              Approximate area added
              {accuracy ? ` · Device accuracy about ${accuracy} m` : ""}
            </p>
          )}
          {(locationError || errors.approximateLatitude?.message) && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {locationError || errors.approximateLatitude?.message}
            </p>
          )}
        </div>
      </div>
      {mapOpen && (
        <div className="mt-5">
          <Suspense
            fallback={
              <div className="grid h-80 place-items-center rounded-xl border border-slate-200 bg-slate-100">
                <div className="text-center text-slate-600">
                  <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-brand-600" />
                  <p className="mt-3 text-sm font-semibold">
                    Preparing area selector…
                  </p>
                </div>
              </div>
            }
          >
            <RequestAreaMapSelector
              latitude={latitude}
              longitude={longitude}
              onSelect={selectMapArea}
              onAreaSuggested={onAreaSuggested}
              onClose={() => setMapOpen(false)}
            />
          </Suspense>
        </div>
      )}
    </section>
  );
}

export function RequestLocationFields({
  register,
  errors,
  fulfillmentType,
  idPrefix = "location",
  setValue,
  applyDefaultAddress = false,
  showPrivacyNotice = true,
}) {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [pickupSavedId, setPickupSavedId] = useState("");
  const [deliverySavedId, setDeliverySavedId] = useState("");
  const defaultApplied = useRef(false);
  const needsPickup = [
    FULFILLMENT_TYPES.PICKUP_ONLY,
    FULFILLMENT_TYPES.DELIVERY,
    FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
  ].includes(fulfillmentType);

  const copyAddress = useCallback(
    (address, target) => {
      setValue(`${target}Address`, address.full_address, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(`${target}Landmark`, address.landmark || "", {
        shouldDirty: true,
      });
      setValue(`${target}Instructions`, address.instructions || "", {
        shouldDirty: true,
      });
      if (
        target === "delivery" ||
        fulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY
      ) {
        if (address.recipient_name) {
          setValue("contactName", address.recipient_name, {
            shouldDirty: true,
          });
        }
        if (address.phone_number) {
          setValue("contactPhone", address.phone_number, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }
    },
    [fulfillmentType, setValue],
  );

  function selectSavedAddress(addressId, target) {
    if (target === "pickup") setPickupSavedId(addressId);
    else setDeliverySavedId(addressId);
    const address = savedAddresses.find((item) => item.id === addressId);
    if (address) copyAddress(address, target);
  }

  useEffect(() => {
    let active = true;
    getSavedAddresses().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        devLog("Saved address selector retrieval failed", error);
      } else {
        const addresses = data || [];
        setSavedAddresses(addresses);
        const defaultAddress = addresses.find((address) => address.is_default);
        if (applyDefaultAddress && defaultAddress && !defaultApplied.current) {
          defaultApplied.current = true;
          const target =
            fulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY
              ? "pickup"
              : "delivery";
          if (target === "pickup") setPickupSavedId(defaultAddress.id);
          else setDeliverySavedId(defaultAddress.id);
          copyAddress(defaultAddress, target);
        }
      }
      setAddressesLoading(false);
    });
    return () => {
      active = false;
    };
  }, [applyDefaultAddress, copyAddress, fulfillmentType]);
  const needsDelivery = [
    FULFILLMENT_TYPES.DELIVERY,
    FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
    FULFILLMENT_TYPES.ON_SITE,
  ].includes(fulfillmentType);

  return (
    <div className="space-y-6">
      {showPrivacyNotice && (
        <Alert className="border-brand-200 bg-brand-50/60">
          <LockKeyhole className="mb-2 h-5 w-5 text-brand-700" />
          <p className="font-semibold text-brand-900">
            Private location details
          </p>
          <p className="mt-1 text-sm leading-6 text-brand-900/80">
            Exact addresses and contact details are shown only to you and the
            assigned Runner after acceptance. Never enter passwords, PINs,
            payment credentials, or government identifiers.
          </p>
        </Alert>
      )}

      <FormField
        id={`${idPrefix}FulfillmentType`}
        label="How will this request be fulfilled?"
        error={errors.fulfillmentType?.message}
      >
        <select
          id={`${idPrefix}FulfillmentType`}
          className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
          {...register("fulfillmentType")}
        >
          {Object.entries(FULFILLMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      {needsPickup && (
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="mb-5 flex items-center gap-2">
            <Store className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Pickup details</h3>
          </div>
          <SavedAddressSelector
            id={`${idPrefix}PickupSavedAddress`}
            label="Use a saved pickup address"
            addresses={savedAddresses}
            loading={addressesLoading}
            value={pickupSavedId}
            onChange={(addressId) => selectSavedAddress(addressId, "pickup")}
          />
          <div className="space-y-5">
            <FormField
              id={`${idPrefix}PickupAddress`}
              label="Exact pickup address"
              error={errors.pickupAddress?.message}
            >
              <Textarea
                id={`${idPrefix}PickupAddress`}
                className="min-h-20"
                placeholder="Store/building, street, barangay, and city"
                maxLength={300}
                {...register("pickupAddress")}
              />
            </FormField>
            <FormField
              id={`${idPrefix}PickupLandmark`}
              label="Pickup landmark (optional)"
              error={errors.pickupLandmark?.message}
            >
              <Input
                id={`${idPrefix}PickupLandmark`}
                placeholder="Example: Beside the public market entrance"
                maxLength={200}
                {...register("pickupLandmark")}
              />
            </FormField>
            <FormField
              id={`${idPrefix}PickupInstructions`}
              label="Pickup instructions (optional)"
              error={errors.pickupInstructions?.message}
            >
              <Textarea
                id={`${idPrefix}PickupInstructions`}
                className="min-h-20"
                placeholder="Who to approach or what to ask for"
                maxLength={500}
                {...register("pickupInstructions")}
              />
            </FormField>
          </div>
        </section>
      )}

      {needsDelivery && (
        <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">
              {fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                ? "Destination details"
                : "Delivery details"}
            </h3>
          </div>
          <SavedAddressSelector
            id={`${idPrefix}DeliverySavedAddress`}
            label={
              fulfillmentType === FULFILLMENT_TYPES.ON_SITE
                ? "Use a saved destination"
                : "Use a saved delivery address"
            }
            addresses={savedAddresses}
            loading={addressesLoading}
            value={deliverySavedId}
            onChange={(addressId) => selectSavedAddress(addressId, "delivery")}
          />
          <div className="space-y-5">
            <FormField
              id={`${idPrefix}DeliveryAddress`}
              label="Exact delivery or destination address"
              error={errors.deliveryAddress?.message}
            >
              <Textarea
                id={`${idPrefix}DeliveryAddress`}
                className="min-h-20"
                placeholder="House/building, street, barangay, and city"
                maxLength={300}
                {...register("deliveryAddress")}
              />
            </FormField>
            <FormField
              id={`${idPrefix}DeliveryLandmark`}
              label="Landmark (optional)"
              error={errors.deliveryLandmark?.message}
            >
              <Input
                id={`${idPrefix}DeliveryLandmark`}
                placeholder="Example: Near the pharmacy"
                maxLength={200}
                {...register("deliveryLandmark")}
              />
            </FormField>
            <FormField
              id={`${idPrefix}DeliveryInstructions`}
              label="Instructions (optional)"
              error={errors.deliveryInstructions?.message}
            >
              <Textarea
                id={`${idPrefix}DeliveryInstructions`}
                className="min-h-20"
                placeholder="Example: Call when you reach the gate"
                maxLength={500}
                {...register("deliveryInstructions")}
              />
            </FormField>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="mb-5 flex items-center gap-2">
          <Phone className="h-5 w-5 text-brand-600" />
          <h3 className="font-bold">Task contact</h3>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id={`${idPrefix}ContactName`}
            label="Contact name"
            error={errors.contactName?.message}
          >
            <Input
              id={`${idPrefix}ContactName`}
              autoComplete="name"
              maxLength={120}
              {...register("contactName")}
            />
          </FormField>
          <FormField
            id={`${idPrefix}ContactPhone`}
            label="Contact phone"
            error={errors.contactPhone?.message}
          >
            <Input
              id={`${idPrefix}ContactPhone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              {...register("contactPhone")}
            />
          </FormField>
        </div>
      </section>
    </div>
  );
}
