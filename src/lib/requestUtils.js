export function formatCurrency(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatDateTime(value, fallback = "No deadline set") {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function calculateDistanceKm(origin, destination) {
  if (
    !origin ||
    !destination ||
    origin.latitude === null ||
    origin.latitude === undefined ||
    origin.latitude === "" ||
    origin.longitude === null ||
    origin.longitude === undefined ||
    origin.longitude === "" ||
    destination.latitude === null ||
    destination.latitude === undefined ||
    destination.latitude === "" ||
    destination.longitude === null ||
    destination.longitude === undefined ||
    destination.longitude === "" ||
    !Number.isFinite(Number(origin.latitude)) ||
    !Number.isFinite(Number(origin.longitude)) ||
    !Number.isFinite(Number(destination.latitude)) ||
    !Number.isFinite(Number(destination.longitude))
  ) {
    return null;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(
    Number(destination.latitude) - Number(origin.latitude),
  );
  const longitudeDelta = toRadians(
    Number(destination.longitude) - Number(origin.longitude),
  );
  const originLatitude = toRadians(Number(origin.latitude));
  const destinationLatitude = toRadians(Number(destination.latitude));
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) return "";
  if (distanceKm < 1) return "Approximately within 1 km";
  if (distanceKm >= 20) {
    const lowerBound = Math.floor(distanceKm / 5) * 5;
    return `Approximately ${lowerBound}–${lowerBound + 5} km away`;
  }
  const lowerBound = Math.floor(distanceKm);
  return `Approximately ${lowerBound}–${lowerBound + 1} km away`;
}

export function buildDirectionsUrl(destination) {
  const query = typeof destination === "string" ? destination.trim() : "";
  if (!query) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function getFriendlyRequestError(
  error,
  action = "complete that request",
) {
  const message = error?.message?.toLowerCase() || "";
  if (message.includes("category") && message.includes("not available"))
    return "That category is no longer available. Refresh the page and choose another one.";
  if (message.includes("due date"))
    return "Choose a due date and time in the future.";
  if (message.includes("only an authenticated requestor"))
    return "Only a signed-in Requestor can perform this action.";
  if (message.includes("no longer available"))
    return "This request is no longer available.";
  if (message.includes("finish or submit your current task"))
    return "Finish or submit your current task before accepting another request.";
  if (message.includes("can no longer be edited"))
    return "This request is no longer open and cannot be edited.";
  if (message.includes("can no longer be cancelled"))
    return "This request can only be cancelled before the Runner starts working.";
  if (message.includes("can no longer be released"))
    return "This task has already started or is no longer assigned to you.";
  if (message.includes("release reason"))
    return "Explain why you need to release this task.";
  if (message.includes("cannot be started"))
    return "This task is no longer in the accepted state and cannot be started.";
  if (message.includes("cannot be submitted"))
    return "This task is not currently eligible for completion submission.";
  if (message.includes("not awaiting confirmation"))
    return "This request is no longer awaiting your confirmation.";
  if (message.includes("private location details are incomplete"))
    return "The Requestor must add complete private pickup or delivery details before this task can start.";
  if (message.includes("location details can no longer be changed"))
    return "Private location details cannot be changed after the Runner has started work.";
  if (message.includes("pickup address"))
    return "Enter a valid exact pickup address.";
  if (message.includes("delivery or destination address"))
    return "Enter a valid exact delivery or destination address.";
  if (message.includes("only an authenticated runner"))
    return "Only the assigned signed-in Runner can perform this action.";
  if (message.includes("only the requestor"))
    return "Only the Requestor who posted this request can confirm completion.";
  if (message.includes("row-level security") || error?.code === "42501")
    return "Your account does not have permission to perform this action.";
  if (message.includes("fetch") || message.includes("network"))
    return "We could not reach the server. Check your connection and try again.";
  return `We could not ${action}. Please try again.`;
}
