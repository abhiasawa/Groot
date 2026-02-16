import { sendWhatsAppMessage, sendWhatsAppButtons } from "./client";
import { findContactByName, markContactMessaged } from "@/lib/contacts/manager";
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

/**
 * Handle a send-on-behalf request.
 * Returns true if the flow was handled (waiting for user action).
 */
export async function handleSendRequest(
  request: OutboundRequest,
): Promise<void> {
  const contact = await findContactByName(request.userId, request.contactName);

  if (!contact) {
    // Unknown contact — ask for number
    await sendWhatsAppMessage(
      request.userPhone,
      `I don't have *${request.contactName}*'s number. What's their WhatsApp number?\n\n_Include country code, e.g., 919876543210_`,
    );
    // Store pending outbound in message_queue for follow-up
    await storePendingOutbound(request);
    return;
  }

  // Known contact — show preview and ask for confirmation
  await showSendPreview(
    request.userPhone,
    contact.name,
    contact.whatsapp_number,
    request.messageContent,
  );
}

/**
 * Show message preview with confirmation buttons.
 */
async function showSendPreview(
  userPhone: string,
  contactName: string,
  contactNumber: string,
  messageContent: string,
): Promise<void> {
  await sendWhatsAppButtons(
    userPhone,
    `*Message to ${contactName}:*\n\n"${messageContent}"\n\n_Send this?_`,
    [
      { id: `send_confirm_${contactNumber}`, title: "Send Now" },
      { id: "send_edit", title: "Edit" },
      { id: "send_cancel", title: "Cancel" },
    ],
  );
}

/**
 * Execute the actual send to a third party.
 * Called after user confirms via button.
 */
export async function executeSend(
  userId: string,
  userPhone: string,
  contactNumber: string,
  messageContent: string,
): Promise<void> {
  try {
    // Send the message
    await sendWhatsAppMessage(contactNumber, messageContent);

    // Log as outbound_proxy
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

    // Update contact's last_messaged_at
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

/**
 * Store a pending outbound request for follow-up
 * (when we're waiting for the user to provide a contact number).
 */
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
