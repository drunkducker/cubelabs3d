import "server-only";

import { adminRequest } from "./service-client";
import { ValidationError } from "./validation";

export type SiteSetting = {
  key: string;
  value: unknown;
  data_type: "string" | "number" | "boolean" | "json";
  category: string;
  is_public: boolean;
  is_secret: boolean;
  description: string | null;
  updated_at: string;
};

export async function getSettings(): Promise<SiteSetting[]> {
  try {
    return await adminRequest<SiteSetting[]>(
      `/rest/v1/site_settings?select=key,value,data_type,category,is_public,is_secret,description,updated_at&order=category,key`,
    );
  } catch {
    return [];
  }
}

/*
 * Upsert a non-secret setting. Refuses to write a value into a key flagged
 * is_secret — secrets belong in environment variables, never in a table row.
 */
export async function upsertSetting(input: {
  key: string;
  value: unknown;
  data_type: SiteSetting["data_type"];
  category: string;
  is_public: boolean;
  description?: string | null;
  updatedBy: string;
}): Promise<void> {
  const existing = await adminRequest<Array<{ is_secret: boolean }>>(
    `/rest/v1/site_settings?key=eq.${encodeURIComponent(input.key)}&select=is_secret`,
  ).catch(() => []);
  if (existing?.[0]?.is_secret) {
    throw new ValidationError("This setting is marked secret and cannot be edited from the dashboard.");
  }
  await adminRequest(`/rest/v1/site_settings`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      key: input.key,
      value: input.value,
      data_type: input.data_type,
      category: input.category,
      is_public: input.is_public,
      is_secret: false,
      description: input.description ?? null,
      updated_by: input.updatedBy,
      updated_at: new Date().toISOString(),
    }),
  });
}

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  environment: string;
  rollout_percentage: number;
  starts_at: string | null;
  ends_at: string | null;
  description: string | null;
  updated_at: string;
};

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    return await adminRequest<FeatureFlag[]>(
      `/rest/v1/feature_flags?select=key,enabled,environment,rollout_percentage,starts_at,ends_at,description,updated_at&order=key`,
    );
  } catch {
    return [];
  }
}
