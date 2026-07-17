import { useEffect, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LayoutGrid,
  ListTodo,
  MapPin,
  PackageCheck,
  Printer,
  Search,
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
import { formatCurrency, formatDateTime } from "@/lib/requestUtils";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

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

function RunnerRequestList({ mode }) {
  const { user } = useAuth();
  const availableMode = mode === "available";
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategorySlug = availableMode
    ? searchParams.get("category") || ""
    : "";
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(availableMode);
  const [categoryError, setCategoryError] = useState("");
  const [requests, setRequests] = useState([]);
  const [loadedRequestKey, setLoadedRequestKey] = useState("");
  const [error, setError] = useState("");

  const selectedCategory = categories.find(
    (category) => category.slug === selectedCategorySlug,
  );
  const selectedCategoryId = selectedCategory?.id || null;
  const requestKey = availableMode
    ? `available:${selectedCategoryId || "all"}`
    : "tasks";
  const requestsLoading = categoriesLoading || loadedRequestKey !== requestKey;

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
    setSearchParams(nextSearchParams, { replace: true });
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
          resultCount={requests.length}
          onSelect={selectCategory}
        />
      )}

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
      ) : !error && requests.length === 0 ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50">
              {availableMode ? (
                <Search className="h-7 w-7 text-brand-600" />
              ) : (
                <CheckCircle2 className="h-7 w-7 text-brand-600" />
              )}
            </span>
            <h2 className="mt-5 text-xl font-bold">
              {availableMode ? emptyAvailableTitle : "No accepted tasks yet"}
            </h2>
            <p className="mt-2 max-w-md text-slate-600">
              {availableMode
                ? emptyAvailableDescription
                : "Accept an available request and it will move into this workspace."}
            </p>
            {availableMode && selectedCategory && (
              <button
                type="button"
                onClick={() => selectCategory("")}
                className="mt-5 font-bold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                View all open requests
              </button>
            )}
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
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {requests.map((request) => {
            const detailPath = availableMode
              ? `/runner/requests/${request.id}`
              : `/runner/tasks/${request.id}`;
            return (
              <Link
                key={request.id}
                to={detailPath}
                className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
              >
                <Card className="h-full transition hover:border-brand-200 hover:shadow-md">
                  <CardContent className="p-5">
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
