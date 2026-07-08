import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  getWebhookEventName,
  normalizeUazapiWebhookMessage,
  type UazapiWebhookEvent,
} from "../lib/uazapi";

const router: IRouter = Router();

function expectedSecret(): string | null {
  const secret = process.env.UAZAPI_WEBHOOK_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

router.post("/webhooks/uazapi", async (req, res) => {
  const secret = expectedSecret();
  if (secret) {
    const provided =
      req.header("x-webhook-secret")?.trim() ??
      (typeof req.query.secret === "string" ? req.query.secret.trim() : null);
    if (provided !== secret) {
      res.status(401).json({ error: "invalid_webhook_secret" });
      return;
    }
  }

  const payload = (req.body ?? {}) as UazapiWebhookEvent;
  const event = getWebhookEventName(payload);
  const instance = typeof payload.instance === "string" ? payload.instance : null;
  const normalized = normalizeUazapiWebhookMessage(
    payload,
    process.env.WHATSAPP_OWNER ?? "",
  );

  const externalId =
    normalized?.messageId ??
    (typeof payload.data?.["messageid"] === "string"
      ? payload.data["messageid"]
      : null);

  const inserted = await pool.query<{ id: string }>(
    `insert into webhook_events (source, event, instance, external_id, payload, status)
     values ($1, $2, $3, $4, $5::jsonb, $6)
     returning id`,
    [
      "uazapi",
      event,
      instance,
      externalId,
      JSON.stringify(payload),
      normalized ? "received" : "ignored",
    ],
  );
  const webhookEventId = inserted.rows[0]?.id;

  if (!normalized) {
    await pool.query(
      `update webhook_events
          set processed_at = now(), status = 'ignored'
        where id = $1`,
      [webhookEventId],
    );
    res.json({ ok: true, ignored: true, event });
    return;
  }

  if (!normalized.whatsappOwner) {
    await pool.query(
      `update webhook_events
          set processed_at = now(), status = 'error', error = $2
        where id = $1`,
      [webhookEventId, "WHATSAPP_OWNER is not configured"],
    );
    res.status(503).json({ error: "whatsapp_owner_not_configured" });
    return;
  }

  try {
    await pool.query(
      `insert into whatsapp_messages (
         whatsapp_owner, chat_type, chat_id, chat_name, contact_phone,
         sender_phone, sender_name, recipient_phone, direction, message_type,
         message, caption, media_url, media_mime_type, transcription, message_id,
         reply_to_message_id, forwarded, reaction, reacted_to_message_id, status,
         message_created_at, metadata
       ) values (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16,
         $17, $18, $19, $20, $21,
         $22, $23::jsonb
       )
       on conflict (message_id) do update set
         whatsapp_owner = excluded.whatsapp_owner,
         chat_type = excluded.chat_type,
         chat_id = excluded.chat_id,
         chat_name = excluded.chat_name,
         contact_phone = excluded.contact_phone,
         sender_phone = excluded.sender_phone,
         sender_name = excluded.sender_name,
         recipient_phone = excluded.recipient_phone,
         direction = excluded.direction,
         message_type = excluded.message_type,
         message = excluded.message,
         caption = excluded.caption,
         media_url = excluded.media_url,
         media_mime_type = excluded.media_mime_type,
         transcription = excluded.transcription,
         reply_to_message_id = excluded.reply_to_message_id,
         forwarded = excluded.forwarded,
         reaction = excluded.reaction,
         reacted_to_message_id = excluded.reacted_to_message_id,
         status = excluded.status,
         message_created_at = excluded.message_created_at,
         metadata = excluded.metadata,
         updated_at = now()`,
      [
        normalized.whatsappOwner,
        normalized.chatType,
        normalized.chatId,
        normalized.chatName,
        normalized.contactPhone,
        normalized.senderPhone,
        normalized.senderName,
        normalized.recipientPhone,
        normalized.direction,
        normalized.messageType,
        normalized.message,
        normalized.caption,
        normalized.mediaUrl,
        normalized.mediaMimeType,
        normalized.transcription,
        normalized.messageId,
        normalized.replyToMessageId,
        normalized.forwarded,
        normalized.reaction,
        normalized.reactedToMessageId,
        normalized.status,
        normalized.messageCreatedAt,
        JSON.stringify(normalized.metadata),
      ],
    );

    await pool.query(
      `update webhook_events
          set processed_at = now(), status = 'processed'
        where id = $1`,
      [webhookEventId],
    );

    res.json({ ok: true, event, messageId: normalized.messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    await pool.query(
      `update webhook_events
          set processed_at = now(), status = 'error', error = $2
        where id = $1`,
      [webhookEventId, message],
    );
    req.log?.error({ err }, "uazapi webhook persistence failed");
    res.status(500).json({ error: "webhook_persistence_failed" });
  }
});

export default router;
