import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AlertTriangle,
  MapPinned,
  Maximize2,
  Minimize2,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  createApproximateZoneFeature,
  hasValidCoordinatePair,
  toFeatureCollection as createFeatureCollection,
} from "@/lib/geoUtils";
import { formatCurrency, formatDistance } from "@/lib/requestUtils";
import { Alert } from "@/components/ui/alert";

const DEFAULT_CENTER = [125.543, 8.9475];
const DEFAULT_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ||
  "https://tiles.openfreemap.org/styles/liberty";
const REQUEST_SOURCE_ID = "available-requests";
const REQUEST_ZONE_SOURCE_ID = "available-request-zones";
const REQUEST_ZONE_FILL_LAYER_ID = "request-zone-fills";
const REQUEST_ZONE_OUTLINE_LAYER_ID = "request-zone-outlines";
const CLUSTER_LAYER_ID = "request-clusters";
const CLUSTER_COUNT_LAYER_ID = "request-cluster-count";

function isMappableRequest(request) {
  return hasValidCoordinatePair(
    request.approximate_latitude,
    request.approximate_longitude,
  );
}

function toFeatureCollection(requests) {
  return {
    type: "FeatureCollection",
    features: requests.filter(isMappableRequest).map((request) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          Number(request.approximate_longitude),
          Number(request.approximate_latitude),
        ],
      },
      properties: {
        id: request.id,
        title: request.title,
        area: request.area,
        category: request.category?.name || "Uncategorized",
        serviceFee: Number(request.service_fee) || 0,
        distanceLabel:
          request.distanceKm === null ? "" : formatDistance(request.distanceKm),
      },
    })),
  };
}

function toZoneFeatureCollection(pointCollection) {
  return createFeatureCollection(
    pointCollection.features.map((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      return createApproximateZoneFeature(
        longitude,
        latitude,
        feature.properties,
      );
    }),
  );
}

function createPopupContent(properties, navigate) {
  const content = document.createElement("article");
  content.className = "butuango-map-popup";

  const privacyLabel = document.createElement("p");
  privacyLabel.className = "butuango-map-popup__privacy";
  privacyLabel.textContent = "Approximate area";
  content.appendChild(privacyLabel);

  const title = document.createElement("h3");
  title.className = "butuango-map-popup__title";
  title.textContent = properties.title;
  content.appendChild(title);

  const category = document.createElement("p");
  category.className = "butuango-map-popup__meta";
  category.textContent = properties.category;
  content.appendChild(category);

  const area = document.createElement("p");
  area.className = "butuango-map-popup__area";
  area.textContent = properties.area;
  content.appendChild(area);

  const privacyNote = document.createElement("p");
  privacyNote.className = "butuango-map-popup__meta";
  privacyNote.textContent =
    "The exact address is revealed only after you accept the request.";
  content.appendChild(privacyNote);

  if (properties.distanceLabel) {
    const distance = document.createElement("p");
    distance.className = "butuango-map-popup__distance";
    distance.textContent = properties.distanceLabel;
    content.appendChild(distance);
  }

  const fee = document.createElement("p");
  fee.className = "butuango-map-popup__fee";
  fee.textContent = `Runner fee: ${formatCurrency(properties.serviceFee)}`;
  content.appendChild(fee);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "butuango-map-popup__button";
  button.textContent = "View request";
  button.addEventListener("click", () => {
    navigate(`/runner/requests/${properties.id}`);
  });
  content.appendChild(button);

  return content;
}

function addRequestLayers(map) {
  map.addSource(REQUEST_ZONE_SOURCE_ID, {
    type: "geojson",
    data: toZoneFeatureCollection(toFeatureCollection([])),
  });

  map.addLayer({
    id: REQUEST_ZONE_FILL_LAYER_ID,
    type: "fill",
    source: REQUEST_ZONE_SOURCE_ID,
    paint: {
      "fill-color": "#009688",
      "fill-opacity": 0.14,
    },
  });

  map.addLayer({
    id: REQUEST_ZONE_OUTLINE_LAYER_ID,
    type: "line",
    source: REQUEST_ZONE_SOURCE_ID,
    paint: {
      "line-color": "#007a70",
      "line-width": 2,
      "line-opacity": 0.7,
      "line-dasharray": [2, 2],
    },
  });

  map.addSource(REQUEST_SOURCE_ID, {
    type: "geojson",
    data: toFeatureCollection([]),
    cluster: true,
    clusterMaxZoom: 12,
    clusterRadius: 48,
  });

  map.addLayer({
    id: CLUSTER_LAYER_ID,
    type: "circle",
    source: REQUEST_SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#009688",
        10,
        "#e66f00",
        30,
        "#0b504a",
      ],
      "circle-radius": ["step", ["get", "point_count"], 20, 10, 25, 30, 31],
      "circle-stroke-width": 3,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.92,
    },
  });

  map.addLayer({
    id: CLUSTER_COUNT_LAYER_ID,
    type: "symbol",
    source: REQUEST_SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
    },
    paint: {
      "text-color": "#ffffff",
    },
  });
}

export function RunnerRequestsMap({ requests, runnerLocation }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const runnerMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const featureCollection = useMemo(
    () => toFeatureCollection(requests),
    [requests],
  );
  const zoneFeatureCollection = useMemo(
    () => toZoneFeatureCollection(featureCollection),
    [featureCollection],
  );
  const mappableCount = featureCollection.features.length;
  const hiddenCount = requests.length - mappableCount;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: 12,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      addRequestLayers(map);
      setMapReady(true);
      setMapError("");

      map.on("click", CLUSTER_LAYER_ID, async (event) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: [CLUSTER_LAYER_ID],
        })[0];
        if (!feature) return;
        const source = map.getSource(REQUEST_SOURCE_ID);
        const zoom = await source.getClusterExpansionZoom(
          Number(feature.properties.cluster_id),
        );
        map.easeTo({
          center: feature.geometry.coordinates,
          zoom,
        });
      });

      map.on("click", REQUEST_ZONE_FILL_LAYER_ID, (event) => {
        const clusterAtPoint = map.queryRenderedFeatures(event.point, {
          layers: [CLUSTER_LAYER_ID],
        });
        if (clusterAtPoint.length > 0) return;
        const feature = event.features?.[0];
        if (!feature) return;
        new maplibregl.Popup({ offset: 14, maxWidth: "300px" })
          .setLngLat(event.lngLat)
          .setDOMContent(createPopupContent(feature.properties, navigate))
          .addTo(map);
      });

      for (const layerId of [CLUSTER_LAYER_ID, REQUEST_ZONE_FILL_LAYER_ID]) {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });

    map.on("error", (event) => {
      if (!map.loaded() && event?.error) {
        setMapError(
          "The basemap could not load. Check your connection or map-style configuration.",
        );
      }
    });

    return () => {
      runnerMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [navigate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.getSource(REQUEST_SOURCE_ID)?.setData(featureCollection);
    map.getSource(REQUEST_ZONE_SOURCE_ID)?.setData(zoneFeatureCollection);

    runnerMarkerRef.current?.remove();
    runnerMarkerRef.current = null;
    if (runnerLocation) {
      const marker = document.createElement("div");
      marker.className = "butuango-runner-marker";
      marker.setAttribute("aria-label", "Your approximate current location");
      marker.title = "Your current location (not uploaded)";
      runnerMarkerRef.current = new maplibregl.Marker({
        element: marker,
        anchor: "center",
      })
        .setLngLat([runnerLocation.longitude, runnerLocation.latitude])
        .addTo(map);
    }

    const bounds = new maplibregl.LngLatBounds();
    for (const feature of featureCollection.features) {
      bounds.extend(feature.geometry.coordinates);
    }
    if (runnerLocation) {
      bounds.extend([runnerLocation.longitude, runnerLocation.latitude]);
    }

    if (!bounds.isEmpty()) {
      if (featureCollection.features.length === 1 && !runnerLocation) {
        map.easeTo({
          center: featureCollection.features[0].geometry.coordinates,
          zoom: 13,
        });
      } else {
        map.fitBounds(bounds, {
          padding: { top: 70, right: 50, bottom: 70, left: 50 },
          maxZoom: 14,
          duration: 600,
        });
      }
    } else {
      map.easeTo({ center: DEFAULT_CENTER, zoom: 12 });
    }
  }, [featureCollection, mapReady, runnerLocation, zoneFeatureCollection]);

  useEffect(() => {
    if (!isExpanded) {
      requestAnimationFrame(() => mapRef.current?.resize());
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    requestAnimationFrame(() => mapRef.current?.resize());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isExpanded]);

  return (
    <section className="mt-6" aria-labelledby="available-map-title">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="available-map-title" className="font-black text-slate-950">
            Available requests map
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mappableCount} approximate {mappableCount === 1 ? "area" : "areas"}{" "}
            shown
            {hiddenCount > 0
              ? ` · ${hiddenCount} without a map location remain available in List view`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-brand-800">
          <ShieldCheck className="h-4 w-4" />
          Shaded areas are approximate; exact addresses are hidden
        </div>
      </div>

      {mapError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="mb-2 h-5 w-5" />
          {mapError}
        </Alert>
      )}

      <div
        className={
          isExpanded
            ? "fixed inset-0 z-[100] h-dvh w-screen overflow-hidden bg-slate-100"
            : "relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
        }
      >
        {!mapReady && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-100">
            <div className="text-center text-slate-600">
              <MapPinned className="mx-auto h-8 w-8 animate-pulse text-brand-600" />
              <p className="mt-3 text-sm font-semibold">Loading map…</p>
            </div>
          </div>
        )}
        <div
          ref={containerRef}
          className={
            isExpanded ? "h-full w-full" : "h-[32rem] w-full sm:h-[38rem]"
          }
          aria-label="Interactive map of approximate available request areas"
        />
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-pressed={isExpanded}
          aria-label={
            isExpanded ? "Exit full-screen map" : "Open full-screen map"
          }
          className="absolute left-3 top-3 z-10 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-md transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
          {isExpanded ? "Exit full screen" : "Full screen"}
        </button>
        <div className="pointer-events-none absolute bottom-8 left-3 z-10 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow">
          <span className="mr-2 inline-block h-3 w-5 rounded border-2 border-dashed border-brand-700 bg-brand-100 align-middle" />
          Approximate request area
          {runnerLocation && (
            <>
              <span className="mx-3 text-slate-300">|</span>
              <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
              You
            </>
          )}
        </div>
      </div>
    </section>
  );
}
