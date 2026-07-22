import type { AdminRole } from "@/app/lib/admin";

/*
 * Provider-neutral data layer for Cube Labs.
 *
 * Feature code (pages, server actions) talks ONLY to these interfaces via
 * getData(). No page imports Supabase directly. Swapping backends means writing
 * one new implementation of CubeLabsData — self-hosted Supabase, Postgres +
 * PostgREST + GoTrue, or another provider — with zero feature rewrites.
 *
 * `AccessContext` carries whatever the active provider needs to authorize a
 * call. For token-based providers (Supabase and most alternatives) that is a
 * bearer access token.
 */
export type AccessContext = { accessToken?: string | null };

export type AuthUser = { id: string; email?: string };

export type AdRecord = {
  id: string;
  name: string;
  advertiser: string | null;
  ad_type: string;
  placement: string;
  headline: string | null;
  body: string | null;
  button_text: string | null;
  destination_url: string | null;
  image_mobile_url: string | null;
  image_desktop_url: string | null;
  disclosure: string | null;
  priority: number;
  is_active: boolean;
  is_test: boolean;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
};

export type AdInput = {
  name: string;
  placement: string;
  advertiser: string | null;
  ad_type: string;
  headline: string | null;
  body: string | null;
  button_text: string | null;
  destination_url: string | null;
  image_mobile_url: string | null;
  image_desktop_url: string | null;
  disclosure: string | null;
  priority: number;
  is_active: boolean;
  is_test: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string;
};

export type VideoRecord = {
  id: string;
  title: string;
  youtube_id: string;
  description: string | null;
  category: string | null;
  placement: string;
  priority: number;
  is_active: boolean;
  is_test: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export type VideoInput = {
  title: string;
  youtube_id: string;
  description: string | null;
  category: string | null;
  placement: string;
  priority: number;
  is_active: boolean;
  is_test: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string;
};

export type PromoSlideRecord = {
  id: string;
  carousel_key: string;
  title: string;
  subtitle: string | null;
  link_url: string | null;
  image_mobile_url: string | null;
  image_desktop_url: string | null;
  advertiser: string | null;
  disclosure: string | null;
  priority: number;
  is_active: boolean;
  is_test: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export type PromoSlideInput = {
  carousel_key: string;
  title: string;
  subtitle: string | null;
  link_url: string | null;
  image_mobile_url: string | null;
  image_desktop_url: string | null;
  advertiser: string | null;
  disclosure: string | null;
  priority: number;
  is_active: boolean;
  is_test: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string;
};

export type AuditRecord = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  success: boolean;
  created_at: string;
};

export type AuditInput = {
  actor_id: string;
  actor_role: string;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  previous_value?: unknown;
  new_value?: unknown;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  success?: boolean;
};

export type DashboardMetrics = {
  players: number;
  solves: number;
  solves_solved: number;
  ads_active: number;
  ad_clicks: number;
  ad_impressions: number;
};

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * The full data contract. A provider implements every group; unimplemented
 * pieces throw a clear "not supported by <provider>" error rather than failing
 * silently, so a partial migration is obvious.
 */
export interface CubeLabsData {
  readonly name: string;

  auth: {
    currentUser(ctx: AccessContext): Promise<AuthUser | null>;
  };

  profiles: {
    getRole(ctx: AccessContext, userId: string): Promise<AdminRole | null>;
    countAll(ctx: AccessContext): Promise<number | null>;
  };

  ads: {
    list(ctx: AccessContext): Promise<AdRecord[]>;
    create(ctx: AccessContext, input: AdInput): Promise<{ id: string }>;
    setActive(ctx: AccessContext, id: string, active: boolean): Promise<void>;
    remove(ctx: AccessContext, id: string): Promise<void>;
    /** Public: live ads for a placement (no auth token needed). */
    liveByPlacement(placement: string): Promise<AdRecord[]>;
    /** Public: a single live ad by id, or null. */
    publicById(id: string): Promise<AdRecord | null>;
    /** Public: increment a click or impression counter. */
    trackEvent(id: string, event: "click" | "impression"): Promise<void>;
  };

  videos: {
    list(ctx: AccessContext): Promise<VideoRecord[]>;
    create(ctx: AccessContext, input: VideoInput): Promise<{ id: string }>;
    setActive(ctx: AccessContext, id: string, active: boolean): Promise<void>;
    remove(ctx: AccessContext, id: string): Promise<void>;
    /** Public: live videos for a placement. */
    liveByPlacement(placement: string): Promise<VideoRecord[]>;
  };

  promoSlides: {
    list(ctx: AccessContext): Promise<PromoSlideRecord[]>;
    create(ctx: AccessContext, input: PromoSlideInput): Promise<{ id: string }>;
    setActive(ctx: AccessContext, id: string, active: boolean): Promise<void>;
    remove(ctx: AccessContext, id: string): Promise<void>;
    /** Public: live slides for a carousel. */
    liveByCarousel(carouselKey: string): Promise<PromoSlideRecord[]>;
  };

  audit: {
    recent(ctx: AccessContext, limit: number): Promise<AuditRecord[]>;
    write(ctx: AccessContext, entry: AuditInput): Promise<boolean>;
  };

  metrics: {
    dashboard(ctx: AccessContext): Promise<DashboardMetrics | null>;
  };

  /** Optional email transport. Present only if the provider ships one. */
  email?: {
    send(message: EmailMessage): Promise<void>;
  };
}
