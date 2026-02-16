import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface Contact {
  id: string;
  owner_user_id: string;
  name: string;
  whatsapp_number: string;
  is_approved: boolean;
  last_messaged_at: string | null;
}

/**
 * Find a contact by name (case-insensitive partial match).
 */
export async function findContactByName(
  userId: string,
  name: string,
): Promise<Contact | null> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_user_id", userId)
    .ilike("name", `%${name}%`)
    .limit(1)
    .single();

  return data as Contact | null;
}

/**
 * Add a new contact.
 */
export async function addContact(
  userId: string,
  name: string,
  whatsappNumber: string,
): Promise<Contact> {
  const supabase = getSupabaseAdmin();

  // Clean the phone number
  const cleanNumber = whatsappNumber.replace(/[\s\-\(\)\+]/g, "");

  const { data, error } = await supabase
    .from("contacts")
    .upsert(
      {
        owner_user_id: userId,
        name,
        whatsapp_number: cleanNumber,
        is_approved: true,
      },
      { onConflict: "owner_user_id,whatsapp_number" },
    )
    .select()
    .single();

  if (error || !data) {
    logger.error({ error, userId, name }, "Failed to add contact");
    throw new Error("Failed to add contact");
  }

  logger.info({ contactId: data.id, userId, name }, "Contact added");
  return data as Contact;
}

/**
 * List all contacts for a user.
 */
export async function listContacts(userId: string): Promise<Contact[]> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("is_approved", true)
    .order("name");

  return (data ?? []) as Contact[];
}

/**
 * Update the last_messaged_at timestamp for a contact.
 */
export async function markContactMessaged(contactId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("contacts")
    .update({ last_messaged_at: new Date().toISOString() })
    .eq("id", contactId);
}
