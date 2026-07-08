export interface UazapiWebhookEvent {
  event?: string;
  EventType?: string;
  instance?: string;
  data?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
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

function asNullableBoolean(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  return null;
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
  if (!content) {
    return (
      asString(data.caption) ??
      asString(data.body) ??
      asString(data.conversation) ??
      null
    );
  }

  return (
    asString(content.text) ??
    asString(content.caption) ??
    asString(content.body) ??
    asString(content.conversation) ??
    asString(content.message) ??
    asString(asRecord(content.extendedTextMessage)?.text) ??
    null
  );
}

function inferCaption(data: Record<string, unknown>): string | null {
  const content = asRecord(data.content);
  return asString(data.caption) ?? asString(content?.caption) ?? null;
}

function inferMediaUrl(data: Record<string, unknown>): string | null {
  return (
    asString(data.fileURL) ??
    asString(data.fileUrl) ??
    asString(data.mediaUrl) ??
    asString(asRecord(data.content)?.url) ??
    asString(asRecord(data.content)?.fileURL) ??
    asString(asRecord(data.content)?.fileUrl) ??
    null
  );
}

function inferMediaMimeType(data: Record<string, unknown>): string | null {
  return (
    asString(data.mimetype) ??
    asString(data.mimeType) ??
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
    asString(data.groupName) ??
    asString(data.wa_contactName) ??
    asString(data.wa_name) ??
    asString(data.name) ??
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
    asString(asRecord(input.payload)?.EventType) ??
    asString(asRecord(input.data)?.event) ??
    asString(asRecord(input.payload)?.event) ??
    "unknown"
  );
}

function findMessageRecord(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 3) return null;
  const record = asRecord(value);
  if (!record) return null;

  const messageId =
    asString(record.messageid) ??
    asString(record.messageId) ??
    asString(record.id) ??
    asString(asRecord(record.key)?.id);
  const chatId =
    asString(record.chatid) ??
    asString(record.chatId) ??
    asString(record.wa_chatid) ??
    asString(record.remoteJid) ??
    asString(asRecord(record.key)?.remoteJid);
  if (messageId && chatId) return record;

  for (const key of ["data", "payload", "message", "msg"]) {
    const nested = findMessageRecord(record[key], depth + 1);
    if (nested) return nested;
  }

  return null;
}

function inferMessageId(data: Record<string, unknown>): string | null {
  return (
    asString(data.messageid) ??
    asString(data.messageId) ??
    asString(data.id) ??
    asString(asRecord(data.key)?.id) ??
    asString(asRecord(data.key)?.ID) ??
    null
  );
}

function inferChatId(data: Record<string, unknown>): string | null {
  return (
    asString(data.chatid) ??
    asString(data.chatId) ??
    asString(data.wa_chatid) ??
    asString(data.remoteJid) ??
    asString(asRecord(data.key)?.remoteJid) ??
    asString(asRecord(data.key)?.remoteJID) ??
    null
  );
}

function inferDirection(
  data: Record<string, unknown>,
): "inbound" | "outbound" {
  const fromMe =
    asNullableBoolean(data.fromMe) ??
    asNullableBoolean(asRecord(data.key)?.fromMe) ??
    false;
  return fromMe ? "outbound" : "inbound";
}

function inferChatType(data: Record<string, unknown>, chatId: string): "private" | "group" {
  const isGroup =
    asNullableBoolean(data.isGroup) ??
    asNullableBoolean(data.wa_isGroup) ??
    (chatId.endsWith("@g.us") || chatId.endsWith("@temp"));
  return isGroup ? "group" : "private";
}

function inferSenderPhone(data: Record<string, unknown>): string | null {
  return (
    normalizePhone(asString(data.sender_pn)) ??
    normalizePhone(asString(data.sender)) ??
    normalizePhone(asString(data.from)) ??
    normalizePhone(asString(data.participant)) ??
    normalizePhone(asString(asRecord(data.key)?.participant)) ??
    normalizePhone(asString(asRecord(data.key)?.Participant)) ??
    null
  );
}

export function normalizeUazapiWebhookMessage(
  input: UazapiWebhookEvent,
  whatsappOwner: string,
): NormalizedWhatsappMessage | null {
  const event = getWebhookEventName(input);
  if (event !== "messages" && event !== "message" && event !== "messages_update") {
    return null;
  }

  const data =
    findMessageRecord(input.data) ??
    findMessageRecord(input.payload) ??
    findMessageRecord(input);
  if (!data) return null;

  const messageId = inferMessageId(data);
  const chatId = inferChatId(data);
  if (!messageId || !chatId) return null;

  const senderPhone = inferSenderPhone(data);
  const direction = inferDirection(data);
  const chatType = inferChatType(data, chatId);
  const reactionTarget = asString(data.reaction);
  const isReaction = Boolean(reactionTarget);
  const messageType = asString(data.messageType) ?? "text";

  return {
    whatsappOwner,
    chatType,
    chatId,
    chatName: inferChatName(data),
    contactPhone: chatType === "group" ? null : normalizePhone(chatId),
    senderPhone,
    senderName:
      asString(data.senderName) ??
      asString(data.pushName) ??
      asString(data.wa_contactName),
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
      raw_type: messageType,
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
