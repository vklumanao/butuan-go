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
  if (message.includes("blocked future matching"))
    return "This request is unavailable because one participant blocked future matching.";
  if (message.includes("daily request limit"))
    return "You reached the daily request limit. Try again after 24 hours.";
  if (message.includes("request limit reached"))
    return "You have created several requests recently. Wait a few minutes before trying again.";
  if (message.includes("complete or cancel an open request"))
    return "You can have up to five open requests. Complete or cancel one before creating another.";
  if (message.includes("limited after repeated cancellations"))
    return "New requests are temporarily limited after repeated cancellations. Try again after 24 hours.";
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
  if (message.includes("pending price-change"))
    return "Wait for the pending price-change decision or withdraw it first.";
  if (message.includes("pending price change"))
    return "Wait for the Requestor to decide the pending price change.";
  if (
    message.includes("upload at least one purchase receipt") ||
    message.includes("has not uploaded purchase receipt")
  )
    return "At least one private purchase receipt is required for this task.";
  if (message.includes("review the purchase receipts"))
    return "Review the uploaded purchase receipts before confirming completion.";
  if (message.includes("temporarily restricted"))
    return "This account is temporarily restricted from creating or accepting new requests.";
  if (message.includes("read-only because it is suspended"))
    return "This account is suspended. Marketplace actions are read-only until the suspension ends.";
  if (message.includes("read-only because it is permanently banned"))
    return "This account is permanently banned from marketplace actions.";
  if (message.includes("verify the handoff code"))
    return "Verify the six-digit handoff code before continuing.";
  if (message.includes("no handoff code"))
    return "The handoff code is unavailable. Refresh the task and try again.";
  if (message.includes("payment must match"))
    return "The confirmed payment must match the documented amount.";
  if (
    message.includes("confirm receipt of the documented direct payment") ||
    message.includes("has not confirmed the documented direct payment")
  )
    return "The Runner must confirm receiving the documented direct payment first.";
  if (message.includes("selected payer settled"))
    return "Confirm that the selected payer settled directly with the Runner.";
  if (message.includes("open dispute"))
    return "The open dispute must be withdrawn or resolved before continuing.";
  if (message.includes("seven-day dispute window"))
    return "The seven-day window for opening a dispute has ended.";
  if (message.includes("cannot be opened at this request stage"))
    return "A dispute cannot be opened at this stage of the request.";
  if (message.includes("verified handoff cannot"))
    return "A verified handoff can no longer be reported as failed.";
  if (message.includes("paid handoff cannot"))
    return "A handoff with confirmed payment can no longer be reported as failed.";
  if (message.includes("receipt total exceeds"))
    return "The receipt total is above the approved purchase limit. Request a higher limit before continuing.";
  if (message.includes("current cash-advance limit"))
    return "Confirm the current cash-advance limit before continuing.";
  if (message.includes("already has a pending price-change"))
    return "This task already has a price change waiting for the Requestor.";
  if (message.includes("new maximum must be higher"))
    return "Enter a new maximum that is higher than the current limit.";
  if (message.includes("not awaiting confirmation"))
    return "This request is no longer awaiting your confirmation.";
  if (message.includes("private location details are incomplete"))
    return "The Requestor must add complete private pickup or delivery details before this task can start.";
  if (message.includes("location details can no longer be changed"))
    return "Private location details cannot be changed after the Runner has started work.";
  if (message.includes("valid request scenario"))
    return "Choose the request scenario that best matches the task.";
  if (message.includes("does not match the selected scenario"))
    return "Review the task type and payment setup; they do not match the selected scenario.";
  if (message.includes("ready pickup-and-delivery"))
    return "A ready pickup-and-delivery request should not include a purchase expense.";
  if (message.includes("required approximate delivery zone"))
    return "Choose the approximate delivery zone before continuing.";
  if (message.includes("required approximate pickup or task zone"))
    return "Choose the approximate pickup or task zone before continuing.";
  if (message.includes("exact delivery point"))
    return "Choose the exact delivery point on the map before continuing.";
  if (message.includes("exact pickup or task point"))
    return "Choose the exact pickup or task point on the map before continuing.";
  if (message.includes("general area can be identified"))
    return "Search for the primary location on the map and choose a result so its general area can be identified.";
  if (message.includes("selected task contact must be the payer"))
    return "Use the handoff contact as payer, or choose the Requestor and confirm attendance.";
  if (message.includes("confirm that the requestor will be present"))
    return "Confirm that you will attend the handoff, or choose the task contact as payer.";
  if (message.includes("pickup address"))
    return "Enter a valid exact pickup address.";
  if (message.includes("delivery or destination address"))
    return "Enter a valid exact delivery or destination address.";
  if (message.includes("only an authenticated runner"))
    return "Only the assigned signed-in Runner can perform this action.";
  if (message.includes("only the assigned runner"))
    return "Only the assigned signed-in Runner can perform this action.";
  if (message.includes("only the requestor can decide"))
    return "Only the Requestor who posted this task can decide the price change.";
  if (message.includes("only the requestor"))
    return "Only the Requestor who posted this request can confirm completion.";
  if (message.includes("row-level security") || error?.code === "42501")
    return "Your account does not have permission to perform this action.";
  if (message.includes("fetch") || message.includes("network"))
    return "We could not reach the server. Check your connection and try again.";
  return `We could not ${action}. Please try again.`;
}
