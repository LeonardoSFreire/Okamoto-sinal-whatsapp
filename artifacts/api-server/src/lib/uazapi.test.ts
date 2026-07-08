import { describe, expect, it } from "vitest";
import {
  getWebhookEventName,
  normalizeUazapiWebhookMessage,
} from "./uazapi";

describe("uazapi webhook normalization", () => {
  it("normalizes an inbound text message into whatsapp_messages shape", () => {
    const normalized = normalizeUazapiWebhookMessage(
      {
        event: "messages",
        instance: "inst-1",
        data: {
          messageid: "wamid-123",
          chatid: "5511999999999@s.whatsapp.net",
          sender: "5511888888888@s.whatsapp.net",
          sender_pn: "5511888888888",
          senderName: "Maria",
          wa_contactName: "Maria",
          isGroup: false,
          fromMe: false,
          messageType: "text",
          messageTimestamp: 1_720_000_000_000,
          status: "Delivered",
          text: "Ola",
        },
      },
      "5511777777777",
    );

    expect(normalized).not.toBeNull();
    expect(normalized?.messageId).toBe("wamid-123");
    expect(normalized?.chatType).toBe("private");
    expect(normalized?.direction).toBe("inbound");
    expect(normalized?.message).toBe("Ola");
    expect(normalized?.senderPhone).toBe("5511888888888");
    expect(normalized?.contactPhone).toBe("5511999999999");
    expect(normalized?.whatsappOwner).toBe("5511777777777");
  });

  it("normalizes reaction events without losing the reacted message id", () => {
    const normalized = normalizeUazapiWebhookMessage(
      {
        EventType: "message",
        data: {
          messageid: "wamid-456",
          chatid: "grupo-1@g.us",
          sender: "5511888888888@s.whatsapp.net",
          senderName: "Joao",
          isGroup: true,
          fromMe: false,
          messageType: "reaction",
          reaction: "wamid-123",
          content: {
            text: "👍",
          },
        },
      },
      "5511777777777",
    );

    expect(getWebhookEventName({ EventType: "message" })).toBe("message");
    expect(normalized?.chatType).toBe("group");
    expect(normalized?.reactedToMessageId).toBe("wamid-123");
    expect(normalized?.reaction).toBe("👍");
  });
});
