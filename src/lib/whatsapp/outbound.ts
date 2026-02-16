import { sendWhatsAppMessage, sendWhatsAppButtons } from "./client";
import {
  addContact,
  findContactByName,
  markContactMessaged,
} from "@/lib/contacts/manager";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Outbound messaging — send messages to third parties on the user's behalf.
 *
 * Safety rules:
 * - NEVER auto-send without confirmation
 * - Always show message preview first
 * - Log all outbound messages with direction = 'outbound_proxy'
 */

export interface OutboundRequest {
  contactName: string;
  messageContent: string;
  userId: string;
  userPhone: string;
}

interface PendingQueueRow {
  id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Handle a send-on-behalf request.
 */
export async function handleSendRequest(request: OutboundRequest): Promise<void> {
  const contact = await findContactByName(request.userId, request.contactName);

  if (!contact) {
    await sendWhatsAppMessage(
      request.userPhone,
      `I don't have *${request.contactName}*'s number. What's their WhatsApp number?\n\n_Include country code, e.g., 919876543210_`,
    );

    await storePendingOutbound(request);
    return;
  }

  const pendingSendId = await storePendingSend({
    userId: request.userId,
    userPhone: request.userPhone,
    contactName: contact.name,
    contactNumber: contact.whatsapp_number,
    messageContent: request.messageContent,
  });

  await showSendPreview(
    request.userPhone,
    contact.name,
    request.messageContent,
    pendingSendId,
  );
}

/**
 * Handle follow-up text while waiting for contact number in pending_outbound flow.
 */
export async function handlePendingOutboundReply(
  userId: string,
  userPhone: string,
  text: string,
): Promise<boolean> {
  const pending = await getLatestPendingByType(userId, "pending_outbound");
  if (!pending) return false;

  const normalized = text.trim();

  if (/^cancel$/i.test(normalized)) {
    await updateQueueStatus(pending.id, "cancelled");
    await sendWhatsAppMessage(userPhone, "Cancelled. I won't send that message.");
    return true;
  }

  const cleanNumber = normalizePhoneNumber(normalized);
  if (!isValidWhatsAppNumber(cleanNumber)) {
    await sendWhatsAppMessage(
      userPhone,
      "That doesn't look like a valid WhatsApp number yet. Please include country code (digits only), or type *cancel*.",
    );
    return true;
  }

  const contactName = String(pending.payload.contactName ?? "Contact");
  const messageContent = String(pending.payload.messageContent ?? "");

  await addContact(userId, contactName, cleanNumber);
  await updateQueueStatus(pending.id, "processed");

  await handleSendRequest({
    userId,
    userPhone,
    contactName,
    messageContent,
  });

  return true;
}

/**
 * Handle interactive send confirmation actions.
 */
export async function handleSendConfirmation(
  userId: string,
  userPhone: string,
  buttonId: string,
): Promise<boolean> {
  const [action, queueId] = buttonId.split(":");
  if (!action || !queueId) return false;

  if (!["send_confirm", "send_edit", "send_cancel"].includes(action)) {
    return false;
  }

  const pending = await getPendingById(queueId);
  if (!pending) {
    await sendWhatsAppMessage(
      userPhone,
      "That action expired. Please ask me to send the message again.",
    );
    return true;
  }

  const payloadType = String(pending.payload.type ?? "");
  const payloadUserId = String(pending.payload.userId ?? "");
  if (payloadType !== "pending_send" || payloadUserId !== userId) {
    await sendWhatsAppMessage(userPhone, "That action is no longer valid.");
    return true;
  }

  if (action === "send_cancel") {
    await updateQueueStatus(queueId, "cancelled");
    await sendWhatsAppMessage(userPhone, "Cancelled. I won't send it.");
    return true;
  }

  if (action === "send_edit") {
    await updateQueueStatus(queueId, "cancelled");
    await sendWhatsAppMessage(
      userPhone,
      "Okay. Send your revised instruction and I'll prepare a new preview.",
    );
    return true;
  }

  const contactNumber = String(pending.payload.contactNumber ?? "");
  const messageContent = String(pending.payload.messageContent ?? "");

  await executeSend(userId, userPhone, contactNumber, messageContent);
  await updateQueueStatus(queueId, "processed");
  return true;
}

async function showSendPreview(
  userPhone: string,
  contactName: string,
  messageContent: string,
  pendingSendId: string,
): Promise<void> {
  await sendWhatsAppButtons(
    userPhone,
    `*Message to ${contactName}:*\n\n"${messageContent}"\n\n_Send this?_`,
    [
      { id: `send_confirm:${pendingSendId}`, title: "Send Now" },
      { id: `send_edit:${pendingSendId}`, title: "Edit" },
      { id: `send_cancel:${pendingSendId}`, title: "Cancel" },
    ],
  );
}

/**
 * Execute the actual send to a third party.
 */
export async function executeSend(
  userId: string,
  userPhone: string,
  contactNumber: string,
  messageContent: string,
): Promise<void> {
  try {
    await sendWhatsAppMessage(contactNumber, messageContent);

    const supabase = getSupabaseAdmin();
    await supabase.from("messages").insert({
      user_id: userId,
      direction: "outbound_proxy",
      message_type: "text",
      content: messageContent,
      metadata: {
        recipient: contactNumber,
        sent_on_behalf: true,
      },
    });

    const { data: contactByNumber } = await supabase
      .from("contacts")
      .select("id")
      .eq("owner_user_id", userId)
      .eq("whatsapp_number", contactNumber)
      .single();

    if (contactByNumber) {
      await markContactMessaged(contactByNumber.id as string);
    }

    await sendWhatsAppMessage(userPhone, "*Sent!* Message delivered. ✓");

    logger.info(
      { userId, contactNumber, contentLength: messageContent.length },
      "Outbound proxy message sent",
    );
  } catch (error) {
    logger.error({ error, userId, contactNumber }, "Failed to send outbound message");
    await sendWhatsAppMessage(
      userPhone,
      "_Couldn't send that message. Please try again._",
    );
  }
}

async function storePendingOutbound(request: OutboundRequest): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("message_queue").insert({
    payload: {
      type: "pending_outbound",
      userId: request.userId,
      userPhone: request.userPhone,
      contactName: request.contactName,
      messageContent: request.messageContent,
    },
    status: "pending",
  });
}

async function storePendingSend(input: {
  userId: string;
  userPhone: string;
  contactName: string;
  contactNumber: string;
  messageContent: string;
}): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("message_queue")
    .insert({
      payload: {
        type: "pending_send",
        userId: input.userId,
        userPhone: input.userPhone,
        contactName: input.contactName,
        contactNumber: input.contactNumber,
        messageContent: input.messageContent,
      },
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    logger.error({ error, userId: input.userId }, "Failed to store pending send confirmation");
    throw new Error("Failed to store pending send confirmation");
  }

  return data.id as string;
}

async function getPendingById(id: string): Promise<PendingQueueRow | null> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("message_queue")
    .select("id, payload, created_at")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    payload: (data.payload ?? {}) as Record<string, unknown>,
    created_at: data.created_at as string,
  };
}

async function getLatestPendingByType(
  userId: string,
  type: "pending_outbound" | "pending_send",
): Promise<PendingQueueRow | null> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("message_queue")
    .select("id, payload, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  for (const row of data ?? []) {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    if (payload.type === type && payload.userId === userId) {
      return {
        id: row.id as string,
        payload,
        created_at: row.created_at as string,
      };
    }
  }

  return null;
}

async function updateQueueStatus(
  queueId: string,
  status: "pending" | "processed" | "cancelled" | "failed",
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("message_queue")
    .update({
      status,
      processed_at: status === "processed" ? new Date().toISOString() : null,
    })
    .eq("id", queueId);
}

function normalizePhoneNumber(input: string): string {
  return input.replace(/[\s\-\(\)\+]/g, "");
}

function isValidWhatsAppNumber(input: string): boolean {
  return /^\d{8,15}$/.test(input);
}
