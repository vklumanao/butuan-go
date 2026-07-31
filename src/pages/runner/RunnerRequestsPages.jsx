import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LayoutGrid,
  ListTodo,
  LocateFixed,
  LoaderCircle,
  Map as MapIcon,
  MapPin,
  Navigation,
  PackageCheck,
  Printer,
  Search,
  Rows3,
  Shirt,
  ShoppingBasket,
  Utensils,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getAvailableRequests,
  getCategories,
  getRunnerTasks,
} from "@/services/requestService";
import { devLog } from "@/lib/errors";
import {
  calculateDistanceKm,
  formatCurrency,
  formatDateTime,
  formatDistance,
} from "@/lib/requestUtils";
import { hasValidCoordinatePair } from "@/lib/geoUtils";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const RunnerRequestsMap = lazy(() =>
  import("@/components/requests/RunnerRequestsMap").then((module) => ({
    default: module.RunnerRequestsMap,
  })),
);

const CATEGORY_ICONS = {
  "shopping-groceries": ShoppingBasket,
  "food-pickup": Utensils,
  "small-delivery": PackageCheck,
  "laundry-pickup": Shirt,
  "printing-documents": Printer,
  "other-errand": ListTodo,
};

function CategoryFilters({
  categories,
  loading,
  selectedSlug,
  resultCount,
  onSelect,
}) {
  return (
    <section
      className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="category-filter-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="category-filter-title" className="font-black text-slate-950">
            Browse by category
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose the kind of errand you want to view.
          </p>
        </div>
        {!loading && (
          <p className="text-sm font-bold text-brand-700" aria-live="polite">
            {resultCount} open {resultCount === 1 ? "request" : "requests"}
          </p>
        )}
      </div>

      <div
        className="mt-4 flex gap-2 overflow-x-auto pb-2"
        role="group"
        aria-label="Filter available requests by category"
      >
        {loading ? (
          ["all", "one", "two", "three"].map((item, index) => (
            <Skeleton
              key={item}
              className={`h-10 shrink-0 rounded-full ${index === 0 ? "w-20" : "w-36"}`}
            />
          ))
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelect("")}
              aria-pressed={!selectedSlug}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
                !selectedSlug
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
              }`}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              All requests
            </button>
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category.slug] || ListTodo;
              const selected = category.slug === selectedSlug;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onSelect(category.slug)}
                  aria-pressed={selected}
                  title={category.description || category.name}
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
                    selected
                      ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {category.name}
                </button>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}

function NearbyControls({
  runnerLocation,
  radiusKm,
  locating,
  error,
  onLocate,
  onRadiusChange,
  onClear,
}) {
  return (
    <section
      className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-4 sm:p-5"
      aria-labelledby="nearby-filter-title"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-xl items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800">
            <Navigation className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="nearby-filter-title"
                className="font-black text-brand-950"
              >
                Nearby requests
              </h2>
              {runnerLocation && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Location active
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-6 text-brand-900/75">
              Find errands near you using approximate distance ranges. Your
              current position stays in this browser and is not saved by
              ButuanGo.
            </p>
          </div>
        </div>

        <div
          className={`grid w-full gap-3 rounded-xl border border-brand-200 bg-white p-3 shadow-sm lg:w-auto ${
            runnerLocation
              ? "sm:grid-cols-[minmax(180px,1fr)_auto_auto] sm:items-end lg:min-w-[540px]"
              : "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:min-w-[440px]"
          }`}
        >
          {runnerLocation ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-brand-900/70">
                Show requests within
              </span>
              <select
                value={radiusKm}
                onChange={(event) => onRadiusChange(event.target.value)}
                className="h-11 w-full rounded-lg border border-brand-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/20"
              >
                <option value="all">Any distance</option>
                <option value="2">2 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="20">20 km</option>
              </select>
            </label>
          ) : (
            <div>
              <p className="text-sm font-bold text-slate-900">
                See which requests are close to you
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your browser will ask for location permission.
              </p>
            </div>
          )}

          <Button
            type="button"
            variant={runnerLocation ? "outline" : "default"}
            onClick={onLocate}
            disabled={locating}
            className="h-11 w-full sm:w-auto"
          >
            {locating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {locating
              ? "Finding you…"
              : runnerLocation
                ? "Update location"
                : "Use my location"}
          </Button>

          {runnerLocation && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClear}
              className="h-11 w-full text-slate-600 sm:w-auto"
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function ViewToggle({ value, onChange }) {
  return (
    <div
      className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      role="group"
      aria-label="Choose request view"
    >
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
          value === "list"
            ? "bg-brand-600 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        <Rows3 className="h-4 w-4" />
        List
      </button>
      <button
        type="button"
        onClick={() => onChange("map")}
        aria-pressed={value === "map"}
        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
          value === "map"
            ? "bg-brand-600 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        <MapIcon className="h-4 w-4" />
        Map
      </button>
    </div>
  );
}

function RequestCardSummary({ request }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <RequestStatusBadge status={request.status} />
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
          {request.category?.name || "Uncategorized"}
        </span>
      </div>
      <h2 className="mt-3 text-xl font-bold">{request.title}</h2>
      <div className="mt-5 space-y-3 text-sm text-slate-600">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-600" />
          {request.area}
        </p>
        {request.distanceKm !== null && (
          <p className="flex items-center gap-2 font-semibold text-brand-700">
            <Navigation className="h-4 w-4" />
            {formatDistance(request.distanceKm)}
          </p>
        )}
        <p className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-brand-600" />
          {formatDateTime(request.due_at)}
        </p>
        <p className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-brand-600" />
          Runner fee:{" "}
          <strong className="text-slate-900">
            {formatCurrency(request.service_fee)}
          </strong>
        </p>
      </div>
    </>
  );
}

function RunnerRequestList({ mode }) {
  const { user } = useAuth();
  const availableMode = mode === "available";
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategorySlug = availableMode
    ? searchParams.get("category") || ""
    : "";
  const viewMode =
    availableMode && searchParams.get("view") === "map" ? "map" : "list";
  const selectedRequestId = availableMode
    ? searchParams.get("request") || ""
    : "";
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(availableMode);
  const [categoryError, setCategoryError] = useState("");
  const [requests, setRequests] = useState([]);
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const [error, setError] = useState("");
  const [runnerLocation, setRunnerLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState("all");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const selectedCategory = categories.find(
    (category) => category.slug === selectedCategorySlug,
  );
  const selectedCategoryId = selectedCategory?.id || null;
  const requestKey = availableMode
    ? `available:${selectedCategoryId || "all"}`
    : "tasks";
  const requestsLoading = categoriesLoading || loadedRequestKey !== requestKey;
  const visibleRequests = useMemo(() => {
    const withDistance = requests.map((request) => {
      const distanceKm = calculateDistanceKm(runnerLocation, {
        latitude: request.approximate_latitude,
        longitude: request.approximate_longitude,
      });
      return { ...request, distanceKm };
    });

    if (!runnerLocation) return withDistance;

    const sorted = [...withDistance].sort((first, second) => {
      if (first.distanceKm === null) return 1;
      if (second.distanceKm === null) return -1;
      return first.distanceKm - second.distanceKm;
    });
    if (radiusKm === "all") return sorted;

    const maximumDistance = Number(radiusKm);
    return sorted.filter(
      (request) =>
        request.distanceKm !== null && request.distanceKm <= maximumDistance,
    );
  }, [radiusKm, requests, runnerLocation]);

  useEffect(() => {
    if (
      !availableMode ||
      requestsLoading ||
      !selectedRequestId ||
      visibleRequests.some(
        (request) => String(request.id) === selectedRequestId,
      )
    ) {
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("request");
    setSearchParams(nextSearchParams, { replace: true });
  }, [
    availableMode,
    requestsLoading,
    searchParams,
    selectedRequestId,
    setSearchParams,
    visibleRequests,
  ]);

  useEffect(() => {
    if (
      !availableMode ||
      requestsLoading ||
      viewMode !== "list" ||
      !selectedRequestId
    ) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`runner-request-${selectedRequestId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [availableMode, requestsLoading, selectedRequestId, viewMode]);

  useEffect(() => {
    if (!availableMode) return undefined;

    let active = true;
    getCategories().then(({ data, error: categoriesError }) => {
      if (!active) return;
      if (categoriesError) {
        devLog("Runner category retrieval failed", categoriesError);
        setCategoryError(
          "Categories are temporarily unavailable. You can still browse all open requests.",
        );
        setCategories([]);
      } else {
        setCategories(data || []);
      }
      setCategoriesLoading(false);
    });

    return () => {
      active = false;
    };
  }, [availableMode]);

  useEffect(() => {
    if (
      !availableMode ||
      categoriesLoading ||
      !selectedCategorySlug ||
      selectedCategoryId
    ) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("category");
    setSearchParams(nextSearchParams, { replace: true });
  }, [
    availableMode,
    categoriesLoading,
    searchParams,
    selectedCategoryId,
    selectedCategorySlug,
    setSearchParams,
  ]);

  useEffect(() => {
    if (availableMode && categoriesLoading) return undefined;

    let active = true;
    const query = availableMode
      ? getAvailableRequests(user.id, selectedCategoryId)
      : getRunnerTasks(user.id);

    query.then(({ data, error: requestError }) => {
      if (!active) return;
      if (requestError) {
        devLog("Runner request retrieval failed", requestError);
        setError(
          "We could not load requests. Check your connection and try again.",
        );
        setRequests([]);
      } else {
        setError("");
        setRequests(data || []);
      }
      setLoadedRequestKey(requestKey);
    });

    return () => {
      active = false;
    };
  }, [
    availableMode,
    categoriesLoading,
    requestKey,
    selectedCategoryId,
    user.id,
  ]);

  function selectCategory(slug) {
    setError("");
    const nextSearchParams = new URLSearchParams(searchParams);
    if (slug) nextSearchParams.set("category", slug);
    else nextSearchParams.delete("category");
    nextSearchParams.delete("request");
    setSearchParams(nextSearchParams, { replace: true });
  }

  function selectView(view) {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (view === "map") nextSearchParams.set("view", "map");
    else nextSearchParams.delete("view");
    setSearchParams(nextSearchParams, { replace: true });
  }

  function selectMappedRequest(requestId) {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (requestId) nextSearchParams.set("request", requestId);
    else nextSearchParams.delete("request");
    setSearchParams(nextSearchParams, { replace: true });
  }

  function showRequestOnMap(requestId) {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("view", "map");
    nextSearchParams.set("request", requestId);
    setSearchParams(nextSearchParams, { replace: true });
  }

  function locateRunner() {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setRunnerLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      (geolocationError) => {
        const messages = {
          1: "Location permission was denied. You can continue browsing by area.",
          2: "Your device could not determine its location. Try again or continue browsing by area.",
          3: "Finding your location took too long. Please try again.",
        };
        setLocationError(
          messages[geolocationError.code] ||
            "We could not determine your location.",
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

  function clearRunnerLocation() {
    setRunnerLocation(null);
    setRadiusKm("all");
    setLocationError("");
  }

  const title = availableMode ? "Available Requests" : "My Tasks";
  const description = availableMode
    ? "Browse open everyday errands posted by local Requestors."
    : "Review requests you have accepted and their current status.";
  const emptyAvailableTitle = selectedCategory
    ? `No ${selectedCategory.name} requests right now`
    : "No open requests right now";
  const emptyAvailableDescription = selectedCategory
    ? `There are no open errands in ${selectedCategory.name}. Choose another category or check again later.`
    : "New errands will appear here when Requestors post them.";

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <p className="font-semibold text-brand-600">Runner workspace</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>

      {availableMode && (
        <CategoryFilters
          categories={categories}
          loading={categoriesLoading}
          selectedSlug={selectedCategorySlug}
          resultCount={visibleRequests.length}
          onSelect={selectCategory}
        />
      )}

      {availableMode && (
        <NearbyControls
          runnerLocation={runnerLocation}
          radiusKm={radiusKm}
          locating={locating}
          error={locationError}
          onLocate={locateRunner}
          onRadiusChange={setRadiusKm}
          onClear={clearRunnerLocation}
        />
      )}

      {availableMode && <ViewToggle value={viewMode} onChange={selectView} />}

      {categoryError && (
        <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-950">
          {categoryError}
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mt-6">
          {error}
        </Alert>
      )}
      {requestsLoading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="mt-4 h-7 w-3/4" />
                <Skeleton className="mt-4 h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !error && visibleRequests.length === 0 ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50">
              {availableMode ? (
                runnerLocation && radiusKm !== "all" ? (
                  <Navigation className="h-7 w-7 text-brand-600" />
                ) : (
                  <Search className="h-7 w-7 text-brand-600" />
                )
              ) : (
                <CheckCircle2 className="h-7 w-7 text-brand-600" />
              )}
            </span>
            <h2 className="mt-5 text-xl font-bold">
              {availableMode && runnerLocation && radiusKm !== "all"
                ? `No requests within ${radiusKm} km`
                : availableMode
                  ? emptyAvailableTitle
                  : "No accepted tasks yet"}
            </h2>
            <p className="mt-2 max-w-md text-slate-600">
              {availableMode
                ? runnerLocation && radiusKm !== "all"
                  ? "Try a wider distance or browse requests without a distance limit."
                  : emptyAvailableDescription
                : "Accept an available request and it will move into this workspace."}
            </p>
            {availableMode && runnerLocation && radiusKm !== "all" ? (
              <button
                type="button"
                onClick={() => setRadiusKm("all")}
                className="mt-5 font-bold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                Remove distance limit
              </button>
            ) : availableMode && selectedCategory ? (
              <button
                type="button"
                onClick={() => selectCategory("")}
                className="mt-5 font-bold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                View all open requests
              </button>
            ) : null}
            {!availableMode && (
              <Link
                to="/runner/requests"
                className="mt-5 font-semibold text-brand-600 hover:underline"
              >
                Browse available requests
              </Link>
            )}
          </CardContent>
        </Card>
      ) : availableMode && viewMode === "map" ? (
        <Suspense
          fallback={
            <Card className="mt-6 h-[32rem] sm:h-[38rem]">
              <CardContent className="grid h-full place-items-center">
                <div className="text-center text-slate-600">
                  <MapIcon className="mx-auto h-8 w-8 animate-pulse text-brand-600" />
                  <p className="mt-3 text-sm font-semibold">
                    Preparing interactive map…
                  </p>
                </div>
              </CardContent>
            </Card>
          }
        >
          <RunnerRequestsMap
            requests={visibleRequests}
            runnerLocation={runnerLocation}
            selectedRequestId={selectedRequestId}
            onSelectRequest={selectMappedRequest}
          />
        </Suspense>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {visibleRequests.map((request) => {
            const detailPath = availableMode
              ? `/runner/requests/${request.id}`
              : `/runner/tasks/${request.id}`;
            const selected = String(request.id) === selectedRequestId;
            const canShowOnMap = hasValidCoordinatePair(
              request.approximate_latitude,
              request.approximate_longitude,
            );

            if (availableMode) {
              return (
                <Card
                  key={request.id}
                  id={`runner-request-${request.id}`}
                  aria-current={selected ? "true" : undefined}
                  className={`h-full transition ${
                    selected
                      ? "border-orange-400 bg-orange-50/30 ring-2 ring-orange-200"
                      : "hover:border-brand-200 hover:shadow-md"
                  }`}
                >
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex-1">
                      <RequestCardSummary request={request} />
                    </div>
                    <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
                      {canShowOnMap && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => showRequestOnMap(request.id)}
                          className="w-full sm:flex-1"
                        >
                          <MapIcon className="h-4 w-4" />
                          {selected ? "Selected on map" : "Show on map"}
                        </Button>
                      )}
                      <Button asChild className="w-full sm:flex-1">
                        <Link to={detailPath}>View request</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Link
                key={request.id}
                to={detailPath}
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                <Card className="h-full transition hover:border-brand-200 hover:shadow-md">
                  <CardContent className="p-5">
                    <RequestCardSummary request={request} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RunnerAvailableRequestsPage() {
  return <RunnerRequestList mode="available" />;
}

export function RunnerTasksPage() {
  return <RunnerRequestList mode="tasks" />;
}
