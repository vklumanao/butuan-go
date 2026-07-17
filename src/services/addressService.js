import { supabase } from "@/lib/supabase";

function normalizeRpcRow(data) {
  return Array.isArray(data) ? data[0] || null : data;
}

export async function getSavedAddresses() {
  return supabase
    .from("saved_addresses")
    .select(
      "id, label, recipient_name, phone_number, full_address, landmark, instructions, is_default, created_at, updated_at",
    )
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });
}

export async function saveSavedAddress(addressId, values) {
  const { data, error } = await supabase.rpc("save_saved_address", {
    p_address_id: addressId || null,
    p_label: values.label.trim(),
    p_recipient_name: values.recipientName.trim(),
    p_phone_number: values.phoneNumber.trim(),
    p_full_address: values.fullAddress.trim(),
    p_landmark: values.landmark.trim() || null,
    p_instructions: values.instructions.trim() || null,
    p_is_default: values.isDefault,
  });
  return { data: normalizeRpcRow(data), error };
}

export async function setDefaultSavedAddress(addressId) {
  const { data, error } = await supabase.rpc("set_default_saved_address", {
    p_address_id: addressId,
  });
  return { data: normalizeRpcRow(data), error };
}

export async function deleteSavedAddress(addressId) {
  return supabase.rpc("delete_saved_address", {
    p_address_id: addressId,
  });
}
