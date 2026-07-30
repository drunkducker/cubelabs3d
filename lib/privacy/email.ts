import "server-only";

import { createHash, createHmac } from "node:crypto";
import { adminJson } from "./supabase-admin";

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN || "";
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || process.env.MAIL_FROM_EMAIL || "";

export function privacySiteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://cubelabs3d.vercel.app").replace(/\/$/, "");
}

export function isSesConfigured(): boolean {
  return Boolean(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && SES_FROM_EMAIL && AWS_REGION);
}

export async function deliverPrivacyEmail(input: {
  userId?: string | null;
  to: string;
  templateKey: string;
  subject: string;
  text: string;
  html?: string;
  payload?: Record<string, unknown>;
}): Promise<{ sent: boolean; messageId?: string | null; error?: string }> {
  const rows = await adminJson<Array<{ id: string }>>("/rest/v1/mail_messages?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: input.userId ?? null,
      recipient_email: input.to,
      template_key: input.templateKey,
      category: "privacy",
      subject: input.subject,
      provider: "aws-ses-v2",
      status: "sending",
      payload: input.payload ?? {},
    }),
  }).catch(() => []);
  const rowId = rows[0]?.id;

  if (!isSesConfigured()) {
    const error = "AWS SES delivery is not configured.";
    if (rowId) await patchMail(rowId, { status: "queued", error_message: error });
    return { sent: false, error };
  }

  try {
    const providerMessageId = await sendSesV2(input);
    if (rowId) {
      await patchMail(rowId, {
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
        error_message: null,
      });
    }
    return { sent: true, messageId: providerMessageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed.";
    if (rowId) await patchMail(rowId, { status: "failed", error_message: message });
    return { sent: false, error: message };
  }
}

async function patchMail(id: string, body: Record<string, unknown>) {
  await adminJson(`/rest/v1/mail_messages?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(body),
  }).catch(() => undefined);
}

async function sendSesV2(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<string | null> {
  const host = `email.${AWS_REGION}.amazonaws.com`;
  const endpoint = `https://${host}/v2/email/outbound-emails`;
  const payload = JSON.stringify({
    FromEmailAddress: SES_FROM_EMAIL,
    Destination: { ToAddresses: [input.to] },
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: input.text, Charset: "UTF-8" },
          ...(input.html ? { Html: { Data: input.html, Charset: "UTF-8" } } : {}),
        },
      },
    },
  });

  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(payload);

  const canonicalHeaderPairs: Array<[string, string]> = [
    ["content-type", "application/json"],
    ["host", host],
    ["x-amz-date", amzDate],
  ];
  if (AWS_SESSION_TOKEN) canonicalHeaderPairs.push(["x-amz-security-token", AWS_SESSION_TOKEN]);
  canonicalHeaderPairs.sort(([a], [b]) => a.localeCompare(b));

  const canonicalHeaders = canonicalHeaderPairs.map(([key, value]) => `${key}:${value.trim()}\n`).join("");
  const signedHeaders = canonicalHeaderPairs.map(([key]) => key).join(";");
  const canonicalRequest = [
    "POST",
    "/v2/email/outbound-emails",
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${AWS_REGION}/ses/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, "ses");
  const signature = hmacHex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Amz-Date": amzDate,
    Authorization: authorization,
  };
  if (AWS_SESSION_TOKEN) headers["X-Amz-Security-Token"] = AWS_SESSION_TOKEN;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: payload,
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `AWS SES failed with ${response.status}.`);
  const result = text ? (JSON.parse(text) as { MessageId?: string }) : {};
  return result.MessageId ?? null;
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key: Buffer, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

function getSignatureKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}
