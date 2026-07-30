"use server";

import { redirect } from "next/navigation";
import { adminJson, uploadObject } from "@/lib/privacy/supabase-admin";
import { createPublicPrivacyRequest } from "@/lib/privacy/service";

const REQUEST_TYPES = [
  "export",
  "delete_data",
  "correction",
  "appeal",
  "authorized_agent",
  "parent_request",
] as const;
const REQUESTER_TYPES = ["self", "parent", "guardian", "authorized_agent"] as const;

type RequestType = (typeof REQUEST_TYPES)[number];
type RequesterType = (typeof REQUESTER_TYPES)[number];

export async function submitPublicPrivacyRequest(formData: FormData) {
  try {
    const requestType = enumField(formData, "request_type", REQUEST_TYPES);
    const requesterType = enumField(formData, "requester_type", REQUESTER_TYPES);
    const requesterName = text(formData, "requester_name", 120);
    const requesterEmail = email(formData, "requester_email");
    const subjectEmail = optionalEmail(formData, "subject_email");
    const relationship = text(formData, "relationship_to_subject", 160, false);
    const jurisdiction = text(formData, "jurisdiction", 32, false);
    const details = text(formData, "details", 4000, false);
    const appealOfRequestId = uuid(formData, "appeal_of_request_id", false);

    if ((requestType === "authorized_agent" || requesterType === "authorized_agent") && !subjectEmail) {
      throw new Error("Enter the account holder's email for an authorized-agent request.");
    }
    if ((requestType === "parent_request" || requesterType === "parent" || requesterType === "guardian") && !relationship) {
      throw new Error("Describe your relationship to the child or account holder.");
    }
    if (requestType === "appeal" && !appealOfRequestId) {
      throw new Error("Enter the case ID for the decision you are appealing.");
    }

    const correctionFields = requestType === "correction" ? correctionPayload(formData) : undefined;
    const result = await createPublicPrivacyRequest({
      requestType,
      requesterType,
      requesterName,
      requesterEmail,
      subjectEmail,
      relationshipToSubject: relationship,
      jurisdiction,
      appealOfRequestId,
      payload: {
        details,
        ...(correctionFields ? { fields: correctionFields } : {}),
        requested_from: "privacy_rights_portal",
      },
    });

    const evidence = formData.get("evidence");
    if (evidence instanceof File && evidence.size > 0) {
      const uploaded = await uploadEvidence(result.id, evidence);
      await adminJson(`/rest/v1/account_data_requests?id=eq.${encodeURIComponent(result.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          payload: {
            details,
            ...(correctionFields ? { fields: correctionFields } : {}),
            requested_from: "privacy_rights_portal",
            evidence_path: uploaded.path,
            evidence_mime_type: uploaded.mimeType,
            evidence_bytes: evidence.size,
          },
        }),
      });
    }

    redirect(`/privacy/requests?submitted=1&case=${encodeURIComponent(result.id)}&email_sent=${result.emailSent ? "1" : "0"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit the privacy request.";
    if (message === "NEXT_REDIRECT") throw error;
    redirect(`/privacy/requests?error=${encodeURIComponent(message)}`);
  }
}

function text(formData: FormData, name: string, max: number, required = true): string {
  const value = String(formData.get(name) ?? "").trim().slice(0, max);
  if (required && !value) throw new Error(`Complete the ${name.replaceAll("_", " ")} field.`);
  return value;
}

function email(formData: FormData, name: string): string {
  const value = text(formData, name, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid email address.");
  return value;
}

function optionalEmail(formData: FormData, name: string): string | null {
  const value = text(formData, name, 254, false).toLowerCase();
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Enter a valid account-holder email address.");
  return value;
}

function uuid(formData: FormData, name: string, required = true): string | null {
  const value = text(formData, name, 64, required);
  if (!value) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("Enter a valid case ID.");
  }
  return value;
}

function enumField<T extends readonly string[]>(formData: FormData, name: string, values: T): T[number] {
  const value = String(formData.get(name) ?? "");
  if (!values.includes(value)) throw new Error(`Choose a valid ${name.replaceAll("_", " ")}.`);
  return value as T[number];
}

function correctionPayload(formData: FormData): Record<string, string | null> | undefined {
  const fields: Record<string, string | null> = {};
  for (const [name, max] of [
    ["display_name", 60],
    ["username", 40],
    ["bio", 220],
    ["title", 80],
    ["favorite_puzzle", 20],
    ["region", 80],
    ["country_code", 2],
  ] as const) {
    const value = String(formData.get(`correct_${name}`) ?? "").trim();
    if (value) fields[name] = value.slice(0, max);
  }
  return Object.keys(fields).length ? fields : undefined;
}

async function uploadEvidence(requestId: string, file: File): Promise<{ path: string; mimeType: string }> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Supporting evidence must be 8 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectEvidenceType(bytes, file.type);
  if (!mimeType) throw new Error("Supporting evidence must be a PDF, JPEG, or PNG file.");
  const extension = mimeType === "application/pdf" ? "pdf" : mimeType === "image/jpeg" ? "jpg" : "png";
  const path = `${requestId}/authority.${extension}`;
  await uploadObject({
    bucket: "privacy-evidence",
    path,
    bytes,
    contentType: mimeType,
    upsert: true,
  });
  return { path, mimeType };
}

function detectEvidenceType(bytes: Uint8Array, claimed: string): string | null {
  let detected: string | null = null;
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") detected = "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) detected = "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) detected = "image/png";
  if (!detected || (claimed && claimed !== detected)) return null;
  return detected;
}
