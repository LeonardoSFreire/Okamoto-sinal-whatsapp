function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main(): Promise<void> {
  const baseUrl = required("UAZAPI_BASE_URL").replace(/\/$/, "");
  const instanceToken = required("UAZAPI_INSTANCE_TOKEN");
  const publicBaseUrl = required("PUBLIC_BASE_URL").replace(/\/$/, "");
  const webhookSecret = process.env.UAZAPI_WEBHOOK_SECRET?.trim();
  const webhookUrl = webhookSecret
    ? `${publicBaseUrl}/api/webhooks/uazapi?secret=${encodeURIComponent(webhookSecret)}`
    : `${publicBaseUrl}/api/webhooks/uazapi`;

  const payload = {
    url: webhookUrl,
    events: ["messages", "messages_update"],
    excludeMessages: ["wasSentByApi"],
  };

  const response = await fetch(`${baseUrl}/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: instanceToken,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`UAZAPI webhook setup failed: ${response.status} ${text}`);
  }

  console.log("Webhook configurado com sucesso.");
  console.log(text);
}

void main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
