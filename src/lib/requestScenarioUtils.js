import {
  FULFILLMENT_TYPES,
  PAYMENT_ARRANGEMENTS,
  REQUEST_SCENARIO_RULES,
  REQUEST_SCENARIOS,
} from "@/lib/requestConstants";

export function getLocationRequirements(fulfillmentType) {
  return {
    needsPickup: [
      FULFILLMENT_TYPES.PICKUP_ONLY,
      FULFILLMENT_TYPES.DELIVERY,
      FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
    ].includes(fulfillmentType),
    needsDestination: [
      FULFILLMENT_TYPES.DELIVERY,
      FULFILLMENT_TYPES.PURCHASE_AND_DELIVER,
      FULFILLMENT_TYPES.ON_SITE,
    ].includes(fulfillmentType),
  };
}

export function getScenarioRule(scenarioType) {
  return REQUEST_SCENARIO_RULES[scenarioType] || REQUEST_SCENARIO_RULES.CUSTOM;
}

export function getAllowedPaymentArrangements(scenarioType) {
  return getScenarioRule(scenarioType).allowedPaymentArrangements;
}

export function getHandoffContact(values) {
  if (values.fulfillmentType === FULFILLMENT_TYPES.PICKUP_ONLY) {
    return {
      name: values.pickupContactName || "",
      phone: values.pickupContactPhone || "",
    };
  }
  return {
    name: values.destinationContactName || "",
    phone: values.destinationContactPhone || "",
  };
}

export function inferScenarioType(fulfillmentType, paymentArrangement) {
  if (fulfillmentType === FULFILLMENT_TYPES.ON_SITE) {
    return REQUEST_SCENARIOS.ON_SITE;
  }
  if (
    fulfillmentType === FULFILLMENT_TYPES.DELIVERY &&
    paymentArrangement === PAYMENT_ARRANGEMENTS.NO_PURCHASE
  ) {
    return REQUEST_SCENARIOS.PICKUP_DELIVERY;
  }
  if (
    fulfillmentType === FULFILLMENT_TYPES.DELIVERY &&
    paymentArrangement === PAYMENT_ARRANGEMENTS.MERCHANT_PREPAID
  ) {
    return REQUEST_SCENARIOS.PREPAID_DELIVERY;
  }
  if (
    fulfillmentType === FULFILLMENT_TYPES.PURCHASE_AND_DELIVER &&
    paymentArrangement === PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
  ) {
    return REQUEST_SCENARIOS.BUY_DELIVERY;
  }
  return REQUEST_SCENARIOS.CUSTOM;
}

export function requestorIsHandoffContact(values) {
  return Boolean(values.contactIsRequestor);
}
