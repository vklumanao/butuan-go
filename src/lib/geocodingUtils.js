import { hasValidCoordinatePair } from "@/lib/geoUtils";

export const DEFAULT_GEOCODING_SEARCH_URL =
  import.meta.env.VITE_GEOCODING_SEARCH_URL ||
  "https://nominatim.openstreetmap.org/search";

export const DEFAULT_GEOCODING_REVERSE_URL =
  import.meta.env.VITE_GEOCODING_REVERSE_URL ||
  "https://nominatim.openstreetmap.org/reverse";

export function publicAreaLabelFromAddress(address = {}) {
  return [
    address.suburb ||
      address.village ||
      address.quarter ||
      address.neighbourhood ||
      address.city_district,
    address.city || address.town || address.municipality,
  ]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(", ");
}

export async function reverseGeocodePublicArea(latitude, longitude, signal) {
  if (!hasValidCoordinatePair(latitude, longitude)) return "";
  const url = new URL(DEFAULT_GEOCODING_REVERSE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "14");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with ${response.status}`);
  }
  const place = await response.json();
  return publicAreaLabelFromAddress(place.address);
}
