import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
  getAdminEmailPreferences,
  isAdminEmailNotificationType,
  updateAdminEmailPreferences,
  type AdminEmailNotificationType,
} from "@/lib/admin-email-preferences";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getAdminEmailPreferences());
  } catch (error) {
    console.error("Failed to load email preferences:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const rawPreferences =
      body && typeof body === "object" ? body.preferences : null;
    const updates: Partial<Record<AdminEmailNotificationType, boolean>> = {};

    if (!rawPreferences || typeof rawPreferences !== "object") {
      return NextResponse.json(
        { error: "Preferences are required" },
        { status: 400 }
      );
    }

    for (const [type, enabled] of Object.entries(rawPreferences)) {
      if (isAdminEmailNotificationType(type) && typeof enabled === "boolean") {
        updates[type] = enabled;
      }
    }

    return NextResponse.json(await updateAdminEmailPreferences(updates));
  } catch (error) {
    console.error("Failed to update email preferences:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update email preferences",
      },
      { status: 500 }
    );
  }
}
