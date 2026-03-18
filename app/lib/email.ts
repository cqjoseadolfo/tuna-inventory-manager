type PendingActionEmailInput = {
  toEmail: string;
  toName?: string | null;
  assetName: string;
  actionTitle: string;
  actionDetail: string;
};

type GmailConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  senderEmail: string;
  appBaseUrl: string;
};

function readRuntimeVar(name: string) {
  return String((globalThis as any)[name] || (process.env as any)?.[name] || "").trim();
}

function readGmailConfig(): GmailConfig | null {
  const enabled = readRuntimeVar("EMAIL_NOTIFICATIONS_ENABLED");
  if (enabled && enabled.toLowerCase() !== "true") {
    return null;
  }

  const clientId = readRuntimeVar("GMAIL_CLIENT_ID");
  const clientSecret = readRuntimeVar("GMAIL_CLIENT_SECRET");
  const refreshToken = readRuntimeVar("GMAIL_REFRESH_TOKEN");
  const senderEmail = readRuntimeVar("GMAIL_SENDER_EMAIL");
  const appBaseUrl = readRuntimeVar("APP_BASE_URL") || "http://localhost:3000";

  if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
    return null;
  }

  return { clientId, clientSecret, refreshToken, senderEmail, appBaseUrl };
}

async function getGmailAccessToken(config: GmailConfig) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo obtener access token de Gmail: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Gmail no devolvió access_token");
  }

  return payload.access_token;
}

function encodeBase64UrlUtf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPendingActionHtml(input: PendingActionEmailInput, requestsUrl: string) {
  const safeName = escapeHtml((input.toName || "Compañero/a").trim());
  const safeAssetName = escapeHtml(String(input.assetName || "Activo"));
  const safeActionTitle = escapeHtml(String(input.actionTitle || "Acción pendiente"));
  const safeActionDetail = escapeHtml(String(input.actionDetail || "Revisa tu sección de Solicitudes."));
  const safeRequestsUrl = escapeHtml(requestsUrl);

  return `
<div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: #2400FF; color: #ffffff; padding: 16px 20px; font-weight: 700; letter-spacing: 0.02em;">Tuna Inventory Manager</div>
    <div style="padding: 20px; color: #0f172a; line-height: 1.5;">
      <p style="margin: 0 0 12px 0;">Hola ${safeName},</p>
      <p style="margin: 0 0 12px 0;">Tienes una acción pendiente en la aplicación.</p>
      <p style="margin: 0 0 6px 0;"><strong>Activo:</strong> ${safeAssetName}</p>
      <p style="margin: 0 0 6px 0;"><strong>Acción:</strong> ${safeActionTitle}</p>
      <p style="margin: 0 0 16px 0; color: #334155;">${safeActionDetail}</p>
      <a href="${safeRequestsUrl}" style="display: inline-block; background: #2400FF; color: #ffffff; text-decoration: none; border-radius: 10px; padding: 10px 16px; font-weight: 700;">
        Ir a Solicitudes
      </a>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b;">Si el botón no abre, usa este enlace: ${safeRequestsUrl}</p>
    </div>
  </div>
</div>`;
}

export async function sendPendingActionEmail(input: PendingActionEmailInput) {
  const config = readGmailConfig();
  if (!config || !input.toEmail) {
    return { sent: false, skipped: true as const };
  }

  const requestsUrl = `${config.appBaseUrl.replace(/\/$/, "")}/requests`;
  const subject = `Tuna Inventory: acción pendiente en Solicitudes`;
  const html = buildPendingActionHtml(input, requestsUrl);

  const rawMessage = [
    `From: Tuna Inventory Manager <${config.senderEmail}>`,
    `To: ${input.toEmail}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  const accessToken = await getGmailAccessToken(config);
  const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodeBase64UrlUtf8(rawMessage) }),
  });

  if (!sendResponse.ok) {
    const text = await sendResponse.text();
    throw new Error(`No se pudo enviar correo por Gmail API: ${sendResponse.status} ${text}`);
  }

  return { sent: true as const, skipped: false as const };
}
