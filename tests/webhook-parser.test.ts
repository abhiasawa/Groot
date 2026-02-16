import test from "node:test";
import assert from "node:assert/strict";
import { parseWebhookPayloads } from "../src/lib/whatsapp/webhook-parser.ts";
import type { WhatsAppWebhookPayload } from "../src/types/whatsapp.ts";

test("parseWebhookPayloads returns all messages in a payload", () => {
  const payload: WhatsAppWebhookPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "entry-1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "123",
                phone_number_id: "456",
              },
              contacts: [
                {
                  wa_id: "15551234567",
                  profile: { name: "Ava" },
                },
              ],
              messages: [
                {
                  from: "15551234567",
                  id: "msg-1",
                  timestamp: "1710000000",
                  type: "text",
                  text: { body: "hello" },
                },
                {
                  from: "15551234567",
                  id: "msg-2",
                  timestamp: "1710000001",
                  type: "text",
                  text: { body: "second" },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const parsed = parseWebhookPayloads(payload);

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]?.messageId, "msg-1");
  assert.equal(parsed[1]?.messageId, "msg-2");
  assert.equal(parsed[0]?.displayName, "Ava");
});
