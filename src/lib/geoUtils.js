export const APPROXIMATE_ZONE_RADIUS_KM = 0.9;

export function coarsenCoordinate(value, precision = 2) {
  if (value === null || value === undefined || value === "") return null;
  const factor = 10 ** precision;
  return Math.round(Number(value) * factor) / factor;
}

export function hasValidCoordinatePair(latitude, longitude) {
  return (
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180
  );
}

export function createApproximateZoneFeature(
  longitude,
  latitude,
  properties = {},
  radiusKm = APPROXIMATE_ZONE_RADIUS_KM,
) {
  const earthRadiusKm = 6371;
  const angularDistance = radiusKm / earthRadiusKm;
  const latitudeRadians = (Number(latitude) * Math.PI) / 180;
  const longitudeRadians = (Number(longitude) * Math.PI) / 180;
  const coordinates = [];

  for (let step = 0; step <= 48; step += 1) {
    const bearing = (step / 48) * Math.PI * 2;
    const zoneLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) +
        Math.cos(latitudeRadians) *
          Math.sin(angularDistance) *
          Math.cos(bearing),
    );
    const zoneLongitude =
      longitudeRadians +
      Math.atan2(
        Math.sin(bearing) *
          Math.sin(angularDistance) *
          Math.cos(latitudeRadians),
        Math.cos(angularDistance) -
          Math.sin(latitudeRadians) * Math.sin(zoneLatitude),
      );
    coordinates.push([
      (zoneLongitude * 180) / Math.PI,
      (zoneLatitude * 180) / Math.PI,
    ]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
    properties,
  };
}

export function toFeatureCollection(features = []) {
  return {
    type: "FeatureCollection",
    features,
  };
}
