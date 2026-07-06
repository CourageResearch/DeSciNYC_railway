import "server-only";

import type { QueryResultRow } from "pg";
import { hasDatabaseConfig, query } from "@/lib/db";

export const ADMIN_EMAIL_NOTIFICATION_TYPES = [
  {
    type: "contact",
    label: "Contact form submissions",
    description: "Messages from the website contact form.",
  },
  {
    type: "subscribe",
    label: "Email list signups",
    description: "New people added through the public subscribe flow.",
  },
  {
    type: "speaker_suggestion",
    label: "Speaker suggestions",
    description: "Speaker ideas submitted through the site.",
  },
  {
    type: "ad_click",
    label: "Ad clicks",
    description: "Paid-social click captures before a Luma registration.",
  },
  {
    type: "ad_registration",
    label: "Ad registrations",
    description: "Luma registrations attributed to paid social.",
  },
] as const;

export type AdminEmailNotificationType =
  (typeof ADMIN_EMAIL_NOTIFICATION_TYPES)[number]["type"];

export type AdminEmailPreference = {
  type: AdminEmailNotificationType;
  label: string;
  description: string;
  enabled: boolean;
};

type PreferenceRow = QueryResultRow & {
  email_type: string;
  enabled: boolean;
};

const NOTIFICATION_TYPE_SET = new Set<string>(
  ADMIN_EMAIL_NOTIFICATION_TYPES.map((item) => item.type)
);

export function isAdminEmailNotificationType(
  value: unknown
): value is AdminEmailNotificationType {
  return typeof value === "string" && NOTIFICATION_TYPE_SET.has(value);
}

function defaultPreferences() {
  return ADMIN_EMAIL_NOTIFICATION_TYPES.map((definition) => ({
    ...definition,
    enabled: true,
  }));
}

async function ensurePreferenceTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_email_preferences (
      email_type text PRIMARY KEY,
      enabled boolean NOT NULL DEFAULT true,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await query(
    `
      INSERT INTO admin_email_preferences (email_type, enabled)
      SELECT unnest($1::text[]), true
      ON CONFLICT (email_type) DO NOTHING
    `,
    [ADMIN_EMAIL_NOTIFICATION_TYPES.map((item) => item.type)]
  );
}

export async function getAdminEmailPreferences() {
  if (!hasDatabaseConfig()) {
    return {
      databaseConfigured: false,
      preferences: defaultPreferences(),
    };
  }

  try {
    await ensurePreferenceTable();
    const { rows } = await query<PreferenceRow>(
      `
        SELECT email_type, enabled
        FROM admin_email_preferences
        WHERE email_type = ANY($1::text[])
      `,
      [ADMIN_EMAIL_NOTIFICATION_TYPES.map((item) => item.type)]
    );
    const stored = new Map(rows.map((row) => [row.email_type, row.enabled]));

    return {
      databaseConfigured: true,
      preferences: ADMIN_EMAIL_NOTIFICATION_TYPES.map((definition) => ({
        ...definition,
        enabled: stored.get(definition.type) ?? true,
      })),
    };
  } catch (error) {
    console.error("Failed to load admin email preferences:", error);
    return {
      databaseConfigured: false,
      preferences: defaultPreferences(),
    };
  }
}

export async function updateAdminEmailPreferences(
  updates: Partial<Record<AdminEmailNotificationType, boolean>>
) {
  if (!hasDatabaseConfig()) {
    throw new Error("DATABASE_URL is not configured");
  }

  await ensurePreferenceTable();

  const entries = Object.entries(updates).filter(
    (entry): entry is [AdminEmailNotificationType, boolean] => {
      return isAdminEmailNotificationType(entry[0]) && typeof entry[1] === "boolean";
    }
  );

  if (entries.length > 0) {
    await query(
      `
        INSERT INTO admin_email_preferences (email_type, enabled)
        SELECT *
        FROM unnest($1::text[], $2::boolean[])
        ON CONFLICT (email_type) DO UPDATE
          SET enabled = EXCLUDED.enabled,
              updated_at = now()
      `,
      [entries.map(([type]) => type), entries.map(([, enabled]) => enabled)]
    );
  }

  return getAdminEmailPreferences();
}

export async function shouldSendAdminEmailNotification(
  type: AdminEmailNotificationType
) {
  if (!hasDatabaseConfig()) {
    return true;
  }

  try {
    const { rows } = await query<PreferenceRow>(
      `
        SELECT enabled
        FROM admin_email_preferences
        WHERE email_type = $1
        LIMIT 1
      `,
      [type]
    );

    return rows[0]?.enabled ?? true;
  } catch (error) {
    console.error(`Failed to check admin email preference for ${type}:`, error);
    return true;
  }
}
