import { NextRequest, NextResponse } from "next/server";
import {
  archiveGalleryImage,
  listAdminGalleryImages,
  saveGalleryImage,
} from "@/lib/gallery";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await listAdminGalleryImages());
  } catch (error) {
    console.error("Failed to list gallery images:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const formData = await req.formData();
    const files = formData.getAll("files").filter((value): value is File => {
      return value instanceof File;
    });

    const saved = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        continue;
      }

      saved.push(
        await saveGalleryImage({
          buffer: Buffer.from(await file.arrayBuffer()),
          contentType: file.type,
          fileName: file.name,
        })
      );
    }

    return NextResponse.json({ saved });
  } catch (error) {
    console.error("Failed to upload gallery image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { key } = await req.json();
    await archiveGalleryImage(String(key || ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to archive gallery image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to archive" },
      { status: 500 }
    );
  }
}
