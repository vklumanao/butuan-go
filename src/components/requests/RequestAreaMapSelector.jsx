import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Check,
  LoaderCircle,
  MapPin,
  Move,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  coarsenCoordinate,
  createApproximateZoneFeature,
  hasValidCoordinatePair,
  toFeatureCollection,
} from "@/lib/geoUtils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEFAULT_CENTER = [125.543, 8.9475];
const DEFAULT_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";
const DEFAULT_GEOCODING_URL =
  import.meta.env.VITE_GEOCODING_SEARCH_URL ||
  "https://nominatim.openstreetmap.org/search";
const ZONE_SOURCE_ID = "requestor-area-preview";
const ZONE_FILL_LAYER_ID = "requestor-area-preview-fill";
const ZONE_OUTLINE_LAYER_ID = "requestor-area-preview-outline";

function selectedZone(latitude, longitude) {
  if (!hasValidCoordinatePair(latitude, longitude)) {
    return toFeatureCollection();
  }
  const publicLatitude = coarsenCoordinate(latitude);
  const publicLongitude = coarsenCoordinate(longitude);
  return toFeatureCollection([
    createApproximateZoneFeature(publicLongitude, publicLatitude, {
      preview: true,
    }),
  ]);
}

function normalizeSearchResults(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter((place) => hasValidCoordinatePair(place.lat, place.lon))
    .slice(0, 5)
    .map((place) => ({
      id: String(place.place_id),
      label: place.display_name,
      publicAreaLabel: [
        place.address?.suburb ||
          place.address?.village ||
          place.address?.quarter ||
          place.address?.neighbourhood ||
          place.address?.city_district,
        place.address?.city ||
          place.address?.town ||
          place.address?.municipality,
      ]
        .filter(
          (value, index, values) => value && values.indexOf(value) === index,
        )
        .join(", "),
      latitude: Number(place.lat),
      longitude: Number(place.lon),
      type: place.type || place.category || "place",
    }));
}

export function RequestAreaMapSelector({
  latitude,
  longitude,
  onSelect,
  onAreaSuggested = null,
  onClose,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const searchAbortRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [results, setResults] = useState([]);
  const hasSelection = hasValidCoordinatePair(latitude, longitude);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const initialCenter = hasValidCoordinatePair(latitude, longitude)
      ? [Number(longitude), Number(latitude)]
      : DEFAULT_CENTER;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE_URL,
      center: initialCenter,
      zoom: 13,
      attributionControl: true,
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource(ZONE_SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection(),
      });
      map.addLayer({
        id: ZONE_FILL_LAYER_ID,
        type: "fill",
        source: ZONE_SOURCE_ID,
        paint: {
          "fill-color": "#009688",
          "fill-opacity": 0.2,
        },
      });
      map.addLayer({
        id: ZONE_OUTLINE_LAYER_ID,
        type: "line",
        source: ZONE_SOURCE_ID,
        paint: {
          "line-color": "#007a70",
          "line-width": 3,
          "line-opacity": 0.85,
          "line-dasharray": [2, 2],
        },
      });
      setMapReady(true);
      setMapError("");
    });

    map.on("click", (event) => {
      onSelectRef.current(event.lngLat.lat, event.lngLat.lng);
    });

    map.on("error", (event) => {
      if (!map.loaded() && event?.error) {
        setMapError(
          "The map could not load. Check your connection or map-style configuration.",
        );
      }
    });

    return () => {
      searchAbortRef.current?.abort();
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // The selector is mounted for one editing session. Prop updates are handled
    // by the synchronization effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.getSource(ZONE_SOURCE_ID)?.setData(selectedZone(latitude, longitude));

    if (!hasSelection) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({
        color: "#e66f00",
        draggable: true,
      })
        .setLngLat([Number(longitude), Number(latitude)])
        .addTo(map);
      markerRef.current.getElement().title =
        "Private editing handle. Drag to reposition the public approximate area.";
      markerRef.current.on("dragend", () => {
        const point = markerRef.current.getLngLat();
        onSelectRef.current(point.lat, point.lng);
      });
    } else {
      markerRef.current.setLngLat([Number(longitude), Number(latitude)]);
    }
  }, [hasSelection, latitude, longitude, mapReady]);

  async function searchPlaces(event) {
    event.preventDefault();
    const searchText = query.trim();
    if (searchText.length < 2) {
      setSearchError("Enter at least two characters.");
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    setSearching(true);
    setSearchError("");
    setResults([]);

    try {
      const url = new URL(DEFAULT_GEOCODING_URL);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("q", searchText);
      url.searchParams.set("countrycodes", "ph");
      url.searchParams.set("limit", "5");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("viewbox", "125.45,9.03,125.65,8.82");
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Search failed with ${response.status}`);
      const places = normalizeSearchResults(await response.json());
      setResults(places);
      if (places.length === 0) {
        setSearchError(
          "No matching place was found. Try a barangay, landmark, or street name.",
        );
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setSearchError(
          "Place search is temporarily unavailable. You can still click directly on the map.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }

  function chooseResult(place) {
    onSelectRef.current(place.latitude, place.longitude);
    if (place.publicAreaLabel && onAreaSuggested) {
      onAreaSuggested(place.publicAreaLabel);
    }
    mapRef.current?.flyTo({
      center: [place.longitude, place.latitude],
      zoom: 14,
    });
    setQuery(place.label);
    setResults([]);
    setSearchError("");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-200 bg-white">
      <div className="border-b border-brand-100 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-black text-slate-950">
              Choose the public request area
            </h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Search once, click anywhere on the map, or drag the orange editing
              pin. Runners see only the shaded area—not this pin or your exact
              address.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close map selector"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={searchPlaces} className="mt-4">
          <label
            htmlFor="requestAreaPlaceSearch"
            className="text-sm font-semibold text-slate-800"
          >
            Search for a barangay or place
          </label>
          <div className="mt-2 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                id="requestAreaPlaceSearch"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-10"
                placeholder="Example: Libertad, Butuan City"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={searching}>
              {searching && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
        </form>

        {searchError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {searchError}
          </p>
        )}

        {results.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {results.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => chooseResult(place)}
                  className="flex w-full items-start gap-3 px-3 py-3 text-left text-sm transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  <span className="min-w-0">
                    <span className="line-clamp-2 font-semibold text-slate-800">
                      {place.label}
                    </span>
                    <span className="mt-1 block text-xs capitalize text-slate-500">
                      {place.type.replaceAll("_", " ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {DEFAULT_GEOCODING_URL.includes("nominatim.openstreetmap.org") && (
          <p className="mt-3 text-xs text-slate-500">
            Place search powered by{" "}
            <a
              href="https://nominatim.org/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-700 underline"
            >
              Nominatim
            </a>
            . Search only for public places—never enter private information.
          </p>
        )}
      </div>

      {mapError && (
        <Alert variant="destructive" className="m-4">
          {mapError}
        </Alert>
      )}

      <div className="relative bg-slate-100">
        {!mapReady && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-100">
            <div className="text-center text-slate-600">
              <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-brand-600" />
              <p className="mt-3 text-sm font-semibold">Loading selector…</p>
            </div>
          </div>
        )}
        <div
          ref={containerRef}
          className="h-[26rem] w-full sm:h-[32rem]"
          aria-label="Map for selecting the approximate public request area"
        />
        <div className="pointer-events-none absolute bottom-8 left-3 z-10 max-w-[calc(100%_-_1.5rem)] rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow">
          {hasSelection ? (
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-700" />
              The shaded zone previews what Runners will see
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Move className="h-4 w-4 shrink-0 text-brand-700" />
              Click the map to place the approximate area
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Coordinates are coarsened before they leave the form, so small pin
          movements may remain inside the same public shaded zone.
        </p>
        <Button type="button" onClick={onClose} disabled={!hasSelection}>
          <Check className="h-4 w-4" />
          Use this approximate area
        </Button>
      </div>
    </div>
  );
}
