import { NextRequest, NextResponse } from "next/server";
import { serveGalleryObject } from "@/lib/gallery";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    return await serveGalleryObject(key.join("/"));
  } catch (error) {
    console.error("Error serving gallery object:", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
