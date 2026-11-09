import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { query } from "./db";

export type SiteSettings = {
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  footer_text: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export const getSiteSettings = cache(async (): Promise<
  | { status: "available"; settings: SiteSettings | null }
  | { status: "unavailable" }
> => {
  await connection();
  try {
    const result = await query<SiteSettings>(
      `SELECT company_name, phone, email, address, footer_text, seo_title, seo_description
       FROM app_site_settings WHERE id = 1`,
    );
    return { status: "available", settings: result.rows[0] ?? null };
  } catch (error) {
    console.error(JSON.stringify({
      event: "site_settings_read_failed",
      reason: error instanceof Error ? error.message : "unknown",
    }));
    return { status: "unavailable" };
  }
});
