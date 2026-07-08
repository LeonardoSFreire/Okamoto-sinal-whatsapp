import {
  pgTable,
  bigint,
  text,
  boolean,
  timestamp,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";

// Source messages table. In single-user mode this table is owned by the app and
// populated by webhook ingestion, but it keeps the same shape the analytics and
// frontend already expect.
export const whatsappMessagesTable = pgTable("whatsapp_messages", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  whatsappOwner: text("whatsapp_owner").notNull(),
  chatType: text("chat_type").notNull(),
  chatId: text("chat_id").notNull(),
  chatName: text("chat_name"),
  contactPhone: text("contact_phone"),
  senderPhone: text("sender_phone"),
  senderName: text("sender_name"),
  recipientPhone: text("recipient_phone"),
  direction: text("direction"),
  messageType: text("message_type"),
  message: text("message"),
  caption: text("caption"),
  mediaUrl: text("media_url"),
  mediaMimeType: text("media_mime_type"),
  transcription: text("transcription"),
  messageId: text("message_id").notNull(),
  replyToMessageId: text("reply_to_message_id"),
  forwarded: boolean("forwarded").notNull(),
  reaction: text("reaction"),
  reactedToMessageId: text("reacted_to_message_id"),
  status: text("status"),
  messageCreatedAt: timestamp("message_created_at", { withTimezone: true }).notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export type WhatsappMessage = typeof whatsappMessagesTable.$inferSelect;
export type NewWhatsappMessage = typeof whatsappMessagesTable.$inferInsert;

export const webhookEventsTable = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  event: text("event").notNull(),
  instance: text("instance"),
  externalId: text("external_id"),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
