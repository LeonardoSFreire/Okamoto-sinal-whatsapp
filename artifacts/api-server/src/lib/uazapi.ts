export interface UazapiWebhookEvent {
  event?: string;
  EventType?: string;
  instance?: string;
  data?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface NormalizedWhatsappMessage {
  whatsappOwner: string;
  chatType: "private" | "group";
  chatId: string;
  chatName: string | null;
  contactPhone: string | null;
  senderPhone: string | null;
  senderName: string | null;
  recipientPhone: string | null;
  direction: "inbound" | "outbound";
  messageType: string;
  message: string | null;
  caption: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  transcription: string | null;
  messageId: string;
  replyToMessageId: string | null;
  forwarded: boolean;
  reaction: string | null;
  reactedToMessageId: string | null;
  status: string | null;
  messageCreatedAt: Date;
  metadata: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

function normalizeTimestamp(value: unknown): Date {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n > 10_000_000_000 ? n : n * 1000);
}

function inferMessageText(data: Record<string, unknown>): string | null {
  const direct = asString(data.text);
  if (direct) return direct;

  const content = asRecord(data.content);
  if (!content) return null;

  return (
    asString(content.text) ??
    asString(content.caption) ??
    asString(content.body) ??
    asString(content.conversation) ??
    null
  );
}

function inferCaption(data: Record<string, unknown>): string | null {
  const content = asRecord(data.content);
  return asString(content?.caption) ?? null;
}

function inferMediaUrl(data: Record<string, unknown>): string | null {
  return (
    asString(data.fileURL) ??
    asString(asRecord(data.content)?.url) ??
    asString(asRecord(data.content)?.fileURL) ??
    null
  );
}

function inferMediaMimeType(data: Record<string, unknown>): string | null {
  return (
    asString(asRecord(data.content)?.mimetype) ??
    asString(asRecord(data.content)?.mimeType) ??
    null
  );
}

function inferReactionValue(data: Record<string, unknown>): string | null {
  const content = asRecord(data.content);
  return asString(content?.text) ?? asString(content?.reaction) ?? null;
}

function inferChatName(data: Record<string, unknown>): string | null {
  return (
    asString(data.chatName) ??
    asString(data.wa_contactName) ??
    asString(data.senderName) ??
    null
  );
}

function inferRecipientPhone(
  data: Record<string, unknown>,
  direction: "inbound" | "outbound",
  chatId: string,
  senderPhone: string | null,
): string | null {
  if (direction === "outbound") {
    return normalizePhone(chatId) ?? normalizePhone(asString(data.to));
  }
  return normalizePhone(asString(data.to)) ?? senderPhone;
}

export function getWebhookEventName(input: UazapiWebhookEvent): string {
  return (
    asString(input.event) ??
    asString(input.EventType) ??
    asString(asRecord(input.data)?.EventType) ??
    "unknown"
  );
}

export function normalizeUazapiWebhookMessage(
  input: UazapiWebhookEvent,
  whatsappOwner: string,
): NormalizedWhatsappMessage | null {
  const event = getWebhookEventName(input);
  if (event !== "messages" && event !== "message") return null;

  const data = asRecord(input.data) ?? asRecord(input);
  if (!data) return null;

  const messageId = asString(data.messageid) ?? asString(data.id);
  const chatId = asString(data.chatid);
  if (!messageId || !chatId) return null;

  const senderPhone =
    normalizePhone(asString(data.sender_pn)) ??
    normalizePhone(asString(data.sender)) ??
    normalizePhone(asString(data.from));
  const direction = asBoolean(data.fromMe) ? "outbound" : "inbound";
  const reactionTarget = asString(data.reaction);
  const isReaction = Boolean(reactionTarget);
  const messageType = asString(data.messageType) ?? "text";

  return {
    whatsappOwner,
    chatType: asBoolean(data.isGroup) ? "group" : "private",
    chatId,
    chatName: inferChatName(data),
    contactPhone: asBoolean(data.isGroup) ? null : normalizePhone(chatId),
    senderPhone,
    senderName: asString(data.senderName),
    recipientPhone: inferRecipientPhone(data, direction, chatId, senderPhone),
    direction,
    messageType,
    message: inferMessageText(data),
    caption: inferCaption(data),
    mediaUrl: inferMediaUrl(data),
    mediaMimeType: inferMediaMimeType(data),
    transcription: null,
    messageId,
    replyToMessageId: asString(data.quoted),
    forwarded: asBoolean(data.forwarded),
    reaction: isReaction ? inferReactionValue(data) : null,
    reactedToMessageId: reactionTarget,
    status: asString(data.status),
    messageCreatedAt: normalizeTimestamp(data.messageTimestamp),
    metadata: {
      uazapi: {
        instance: asString(input.instance),
        event,
        wasSentByApi: data.wasSentByApi === true,
        source: asString(data.source),
        senderLid: asString(data.sender_lid),
        owner: asString(data.owner),
      },
      raw: data,
    },
  };
}
