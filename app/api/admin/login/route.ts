import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, setAdminSession } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!checkAdminPassword(String(password || ""))) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    await setAdminSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json(
      { error: "Admin auth is not configured" },
      { status: 500 }
    );
  }
}
