import { Router, type IRouter, type Request } from "express";
import { isAuthDisabled } from "../lib/auth";

const router: IRouter = Router();

function getPublicBaseUrl(req: Request): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

router.get("/setup/status", (req, res) => {
  const webhookBaseUrl = `${getPublicBaseUrl(req)}/api/webhooks/uazapi`;
  const webhookUrl = process.env.UAZAPI_WEBHOOK_SECRET
    ? `${webhookBaseUrl}?secret=${encodeURIComponent(process.env.UAZAPI_WEBHOOK_SECRET)}`
    : webhookBaseUrl;
  res.json({
    mode: "single-user",
    authDisabled: isAuthDisabled(),
    databaseConfigured: Boolean(
      process.env.DATABASE_URL || process.env.SUPABASE_DB_URL,
    ),
    whatsappOwnerConfigured: Boolean(process.env.WHATSAPP_OWNER),
    uazapiConfigured: Boolean(
      process.env.UAZAPI_BASE_URL && process.env.UAZAPI_INSTANCE_TOKEN,
    ),
    webhookSecretConfigured: Boolean(process.env.UAZAPI_WEBHOOK_SECRET),
    webhookUrl,
    recommendedUazapiWebhookConfig: {
      url: webhookUrl,
      events: ["messages"],
      excludeMessages: ["wasSentByApi"],
    },
  });
});

export default router;
