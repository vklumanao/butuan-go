import { supabase } from "@/lib/supabase";
import { coarsenCoordinate } from "@/lib/geoUtils";
import {
  PAYMENT_ARRANGEMENTS,
  REQUEST_STATUSES,
} from "@/lib/requestConstants";

const REQUEST_SELECT = `
  id,
  requestor_id,
  runner_id,
  category_id,
  title,
  description,
  area,
  approximate_latitude,
  approximate_longitude,
  expense_budget,
  service_fee,
  due_at,
  status,
  cancellation_reason,
  accepted_at,
  started_at,
  submitted_at,
  completed_at,
  cancelled_at,
  failed_at,
  created_at,
  updated_at,
  category:categories(id, name, slug),
  payment_terms:request_payment_terms(
    request_id,
    arrangement,
    payer_type,
    maximum_advance,
    runner_consented_at,
    runner_consented_amount,
    receipt_evidence_required
  )
`;

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] || null : data;
}

function locationRpcParams(values) {
  return {
    p_fulfillment_type: values.fulfillmentType,
    p_pickup_address: values.pickupAddress.trim() || null,
    p_pickup_landmark: values.pickupLandmark.trim() || null,
    p_pickup_instructions: values.pickupInstructions.trim() || null,
    p_delivery_address: values.deliveryAddress.trim() || null,
    p_delivery_landmark: values.deliveryLandmark.trim() || null,
    p_delivery_instructions: values.deliveryInstructions.trim() || null,
    p_contact_name: values.contactName.trim(),
    p_contact_phone: values.contactPhone.trim(),
    // Coarsen in the browser before transmission; the RPC enforces the same
    // precision again so a modified client cannot persist an exact point.
    p_approximate_latitude: coarsenCoordinate(values.approximateLatitude),
    p_approximate_longitude: coarsenCoordinate(values.approximateLongitude),
  };
}

function paymentRpcParams(values) {
  return {
    p_payment_arrangement: values.paymentArrangement,
    p_payer_type: values.payerType,
    p_payer_name: values.payerName.trim() || null,
    p_payer_phone: values.payerPhone.trim() || null,
    p_merchant_reference: values.merchantReference.trim() || null,
  };
}

export async function getCategories() {
  return supabase
    .from("categories")
    .select("id, name, slug, description, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
}

export async function createRequest(values) {
  const { data, error } = await supabase.rpc(
    "create_request_with_payment_terms",
    {
      p_category_id: Number(values.categoryId),
      p_title: values.title.trim(),
      p_description: values.description.trim(),
      p_area: values.area.trim(),
      p_expense_budget: Number(values.expenseBudget),
      p_service_fee: Number(values.serviceFee),
      p_due_at: values.dueAt ? new Date(values.dueAt).toISOString() : null,
      ...locationRpcParams(values),
      ...paymentRpcParams(values),
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function updateOpenRequest(requestId, values) {
  const { data, error } = await supabase.rpc(
    "update_open_request_with_payment_terms",
    {
      p_request_id: requestId,
      p_category_id: Number(values.categoryId),
      p_title: values.title.trim(),
      p_description: values.description.trim(),
      p_area: values.area.trim(),
      p_expense_budget: Number(values.expenseBudget),
      p_service_fee: Number(values.serviceFee),
      p_due_at: values.dueAt ? new Date(values.dueAt).toISOString() : null,
      ...locationRpcParams(values),
      ...paymentRpcParams(values),
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function getRequestLocation(requestId) {
  return supabase
    .from("request_locations")
    .select(
      "request_id, fulfillment_type, pickup_address, pickup_landmark, pickup_instructions, delivery_address, delivery_landmark, delivery_instructions, contact_name, contact_phone, created_at, updated_at",
    )
    .eq("request_id", requestId)
    .maybeSingle();
}

export async function getRequestPaymentDetails(requestId) {
  return supabase
    .from("request_payment_details")
    .select(
      "request_id, payer_name, payer_phone, merchant_reference, created_at, updated_at",
    )
    .eq("request_id", requestId)
    .maybeSingle();
}

export async function getRequestPriceChanges(requestId) {
  return supabase
    .from("request_price_changes")
    .select(
      "id, request_id, runner_id, previous_maximum, proposed_maximum, reason, status, response_note, resolved_at, created_at, updated_at",
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
}

export async function getRequestReceipts(requestId) {
  return supabase
    .from("request_receipts")
    .select(
      "id, request_id, uploaded_by, storage_path, file_name, mime_type, file_size, purchase_amount, note, created_at",
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
}

export async function getRequestHandoffState(requestId) {
  return supabase.rpc("get_request_handoff_state", {
    p_request_id: requestId,
  });
}

export async function getRequestSettlement(requestId) {
  return supabase
    .from("request_settlements")
    .select(
      "request_id, expected_amount, runner_received_amount, runner_confirmed_at, requestor_confirmed_at, created_at, updated_at",
    )
    .eq("request_id", requestId)
    .maybeSingle();
}

export async function getRequestFailure(requestId) {
  return supabase
    .from("request_failures")
    .select(
      "id, request_id, reported_by, reason_code, description, acknowledged_at, acknowledgment_note, created_at, updated_at",
    )
    .eq("request_id", requestId)
    .maybeSingle();
}

export async function getRequestDisputes(requestId) {
  return supabase
    .from("request_disputes")
    .select(
      "id, request_id, opened_by, reported_user_id, category, description, status, resolution_outcome, resolution_note, resolved_by, resolved_at, created_at, updated_at",
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
}

export async function saveRequestLocation(requestId, values) {
  const { data, error } = await supabase.rpc(
    "save_request_location_and_geography",
    {
      p_request_id: requestId,
      ...locationRpcParams(values),
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function cancelRequestBeforeStart(requestId, reason) {
  const { data, error } = await supabase.rpc("cancel_open_request", {
    p_request_id: requestId,
    p_reason: reason.trim(),
  });
  return { data: normalizeRpcRow(data), error };
}

export async function releaseAcceptedRequest(requestId, reason) {
  const { data, error } = await supabase.rpc("release_accepted_request", {
    p_request_id: requestId,
    p_reason: reason.trim(),
  });
  return { data: normalizeRpcRow(data), error };
}

export async function acceptRequest(requestId, cashAdvanceConsent = false) {
  const { data, error } = await supabase.rpc(
    "accept_request_with_payment_terms",
    {
      p_request_id: requestId,
      p_cash_advance_consent: cashAdvanceConsent,
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function confirmRequestCashAdvance(requestId) {
  const { data, error } = await supabase.rpc(
    "confirm_request_cash_advance",
    {
      p_request_id: requestId,
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function regenerateRequestHandoffCode(requestId) {
  return supabase.rpc("regenerate_request_handoff_code", {
    p_request_id: requestId,
  });
}

export async function verifyRequestHandoff(requestId, handoffCode) {
  return supabase.rpc("verify_request_handoff", {
    p_request_id: requestId,
    p_handoff_code: handoffCode,
  });
}

export async function confirmRequestSettlementReceived(requestId, amount) {
  const { data, error } = await supabase.rpc(
    "confirm_request_settlement_received",
    {
      p_request_id: requestId,
      p_received_amount: Number(amount),
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function reportRequestFailure(
  requestId,
  reasonCode,
  description,
) {
  const { data, error } = await supabase.rpc("report_request_failure", {
    p_request_id: requestId,
    p_reason_code: reasonCode,
    p_description: description.trim(),
  });
  return { data: normalizeRpcRow(data), error };
}

export async function acknowledgeRequestFailure(failureId, note) {
  const { data, error } = await supabase.rpc(
    "acknowledge_request_failure",
    {
      p_failure_id: failureId,
      p_note: note.trim() || null,
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function openRequestDispute(requestId, category, description) {
  const { data, error } = await supabase.rpc("open_request_dispute", {
    p_request_id: requestId,
    p_category: category,
    p_description: description.trim(),
  });
  return { data: normalizeRpcRow(data), error };
}

export async function withdrawRequestDispute(disputeId) {
  const { data, error } = await supabase.rpc(
    "withdraw_request_dispute",
    {
      p_dispute_id: disputeId,
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function requestPriceChange(requestId, proposedMaximum, reason) {
  const { data, error } = await supabase.rpc("request_price_change", {
    p_request_id: requestId,
    p_proposed_maximum: Number(proposedMaximum),
    p_reason: reason.trim(),
  });
  return { data: normalizeRpcRow(data), error };
}

export async function resolveRequestPriceChange(
  priceChangeId,
  approve,
  responseNote,
) {
  const { data, error } = await supabase.rpc("resolve_request_price_change", {
    p_price_change_id: priceChangeId,
    p_approve: approve,
    p_response_note: responseNote.trim() || null,
  });
  return { data: normalizeRpcRow(data), error };
}

export async function withdrawRequestPriceChange(priceChangeId) {
  const { data, error } = await supabase.rpc(
    "withdraw_request_price_change",
    {
      p_price_change_id: priceChangeId,
    },
  );
  return { data: normalizeRpcRow(data), error };
}

function receiptExtension(mimeType) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return extensions[mimeType] || "file";
}

export async function uploadRequestReceipt(
  requestId,
  userId,
  file,
  purchaseAmount,
  note,
) {
  const storagePath = `${requestId}/${userId}/${crypto.randomUUID()}.${receiptExtension(file.type)}`;
  const uploadResult = await supabase.storage
    .from("request-receipts")
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadResult.error) return { data: null, error: uploadResult.error };

  const { data, error } = await supabase.rpc("add_request_receipt", {
    p_request_id: requestId,
    p_storage_path: storagePath,
    p_file_name: file.name,
    p_mime_type: file.type,
    p_file_size: file.size,
    p_purchase_amount: Number(purchaseAmount),
    p_note: note.trim() || null,
  });

  if (error) {
    await supabase.storage.from("request-receipts").remove([storagePath]);
  }

  return { data: normalizeRpcRow(data), error };
}

export async function getRequestReceiptSignedUrl(storagePath) {
  return supabase.storage
    .from("request-receipts")
    .createSignedUrl(storagePath, 60);
}

export async function deleteRequestReceipt(receipt) {
  const storageResult = await supabase.storage
    .from("request-receipts")
    .remove([receipt.storage_path]);
  if (storageResult.error) {
    return { data: null, error: storageResult.error };
  }

  const { data, error } = await supabase.rpc("delete_request_receipt", {
    p_receipt_id: receipt.id,
  });
  return { data: normalizeRpcRow(data), error };
}

export async function startRequest(requestId) {
  const { data, error } = await supabase.rpc(
    "start_request_with_payment_terms",
    {
      p_request_id: requestId,
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function submitRequestCompletion(requestId) {
  const { data, error } = await supabase.rpc(
    "submit_request_completion_with_handoff",
    {
      p_request_id: requestId,
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function confirmRequestCompletion(
  requestId,
  receiptsReviewed = false,
  paymentConfirmed = false,
) {
  const { data, error } = await supabase.rpc(
    "confirm_request_completion_with_settlement",
    {
      p_request_id: requestId,
      p_receipts_reviewed: receiptsReviewed,
      p_payment_confirmed: paymentConfirmed,
    },
  );
  return { data: normalizeRpcRow(data), error };
}

export async function getMyRequests(userId) {
  return supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("requestor_id", userId)
    .order("created_at", { ascending: false });
}

export async function getAvailableRequests(userId, categoryId) {
  let query = supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("status", REQUEST_STATUSES.OPEN)
    .neq("requestor_id", userId);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  return query
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
}

export async function getRunnerTasks(userId) {
  return supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("runner_id", userId)
    .order("updated_at", { ascending: false });
}

export async function getRequestById(requestId) {
  return supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("id", requestId)
    .single();
}

export async function getRequestorRequestById(requestId, userId) {
  return supabase
    .from("requests")
    .select(REQUEST_SELECT)
    .eq("id", requestId)
    .eq("requestor_id", userId)
    .single();
}

export async function getRunnerRequestById(requestId, userId) {
  const result = await getRequestById(requestId);
  if (result.error || !result.data) return result;
  const isAssignedTask = result.data.runner_id === userId;
  const isEligibleOpenRequest =
    result.data.status === REQUEST_STATUSES.OPEN &&
    result.data.requestor_id !== userId;
  if (!isAssignedTask && !isEligibleOpenRequest) {
    return {
      data: null,
      error: {
        code: "PGRST116",
        message: "This request does not belong to the current Runner workspace",
      },
    };
  }
  return result;
}

export async function getRequestUpdates(requestId) {
  return supabase
    .from("request_updates")
    .select("id, event_type, from_status, to_status, note, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
}

export async function getRequestParticipants(requestId) {
  return supabase.rpc("get_request_participants", {
    p_request_id: requestId,
  });
}

export async function getRequestorSummary(userId) {
  const { data, error } = await supabase
    .from("requests")
    .select(
      "status, due_at, completed_at, expense_budget, service_fee, payment_terms:request_payment_terms(arrangement, maximum_advance)",
    )
    .eq("requestor_id", userId);
  if (error) return { data: null, error };

  const now = new Date();
  const dueSoonLimit = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const plannedStatuses = [
    REQUEST_STATUSES.OPEN,
    REQUEST_STATUSES.ACCEPTED,
    REQUEST_STATUSES.IN_PROGRESS,
    REQUEST_STATUSES.AWAITING_CONFIRMATION,
  ];
  const counts = {
    open: 0,
    accepted: 0,
    inProgress: 0,
    awaitingConfirmation: 0,
    dueSoon: 0,
    completedThisMonth: 0,
    plannedExpenseBudget: 0,
    plannedServiceFees: 0,
  };

  for (const request of data || []) {
    if (request.status === REQUEST_STATUSES.OPEN) counts.open += 1;
    if (request.status === REQUEST_STATUSES.ACCEPTED) counts.accepted += 1;
    if (request.status === REQUEST_STATUSES.IN_PROGRESS) counts.inProgress += 1;
    if (request.status === REQUEST_STATUSES.AWAITING_CONFIRMATION)
      counts.awaitingConfirmation += 1;

    if (plannedStatuses.includes(request.status)) {
      const plannedExpense =
        request.payment_terms?.arrangement ===
        PAYMENT_ARRANGEMENTS.RUNNER_ADVANCE
          ? request.payment_terms.maximum_advance
          : request.expense_budget;
      counts.plannedExpenseBudget += Number(plannedExpense) || 0;
      counts.plannedServiceFees += Number(request.service_fee) || 0;

      if (request.due_at) {
        const dueAt = new Date(request.due_at);
        if (dueAt > now && dueAt <= dueSoonLimit) counts.dueSoon += 1;
      }
    }

    if (
      request.status === REQUEST_STATUSES.COMPLETED &&
      request.completed_at &&
      new Date(request.completed_at) >= currentMonthStart
    ) {
      counts.completedThisMonth += 1;
    }
  }

  counts.plannedTotal = counts.plannedExpenseBudget + counts.plannedServiceFees;
  return { data: counts, error: null };
}

export async function getRunnerSummary(userId) {
  const [availableResult, tasksResult] = await Promise.all([
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", REQUEST_STATUSES.OPEN)
      .neq("requestor_id", userId),
    supabase.from("requests").select("status").eq("runner_id", userId),
  ]);
  if (availableResult.error)
    return { data: null, error: availableResult.error };
  if (tasksResult.error) return { data: null, error: tasksResult.error };
  const counts = { available: 0, accepted: 0, inProgress: 0, completed: 0 };
  counts.available = availableResult.count || 0;
  for (const request of tasksResult.data || []) {
    if (request.status === REQUEST_STATUSES.ACCEPTED) counts.accepted += 1;
    if (
      [
        REQUEST_STATUSES.IN_PROGRESS,
        REQUEST_STATUSES.AWAITING_CONFIRMATION,
      ].includes(request.status)
    )
      counts.inProgress += 1;
    if (request.status === REQUEST_STATUSES.COMPLETED) counts.completed += 1;
  }
  return { data: counts, error: null };
}

const NEXT_ACTION_SELECT = "id, title, status, due_at, updated_at";

function prioritizeRequests(requests, priorities) {
  return [...requests]
    .sort((first, second) => {
      const priorityDifference =
        priorities[first.status] - priorities[second.status];
      if (priorityDifference !== 0) return priorityDifference;
      return (
        new Date(second.updated_at).getTime() -
        new Date(first.updated_at).getTime()
      );
    })
    .slice(0, 3);
}

export async function getRequestorNextActions(userId) {
  const priorities = {
    [REQUEST_STATUSES.FAILED]: 0,
    [REQUEST_STATUSES.AWAITING_CONFIRMATION]: 1,
  };
  const { data, error } = await supabase
    .from("requests")
    .select(NEXT_ACTION_SELECT)
    .eq("requestor_id", userId)
    .in("status", Object.keys(priorities));
  if (error) return { data: null, error };
  return { data: prioritizeRequests(data || [], priorities), error: null };
}

export async function getRunnerNextActions(userId) {
  const priorities = {
    [REQUEST_STATUSES.IN_PROGRESS]: 0,
    [REQUEST_STATUSES.ACCEPTED]: 1,
    [REQUEST_STATUSES.FAILED]: 2,
    [REQUEST_STATUSES.AWAITING_CONFIRMATION]: 3,
  };
  const { data, error } = await supabase
    .from("requests")
    .select(NEXT_ACTION_SELECT)
    .eq("runner_id", userId)
    .in("status", Object.keys(priorities));
  if (error) return { data: null, error };
  return { data: prioritizeRequests(data || [], priorities), error: null };
}

export async function getRunnerCapacity(userId) {
  const { data, error } = await supabase
    .from("requests")
    .select("id, title, status, updated_at")
    .eq("runner_id", userId)
    .in("status", [REQUEST_STATUSES.ACCEPTED, REQUEST_STATUSES.IN_PROGRESS])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data || null, error };
}
