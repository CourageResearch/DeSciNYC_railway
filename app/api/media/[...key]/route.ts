import { NextRequest, NextResponse } from "next/server";
import { getSignedMediaUrl } from "@/lib/media";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

async function redirectToMedia(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { key } = await params;
    const objectKey = `media/${key.join("/")}`;
    const signedUrl = await getSignedMediaUrl(
      objectKey,
      request.method === "HEAD" ? "HEAD" : "GET"
    );

    if (!signedUrl) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: signedUrl,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("Error signing media URL:", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return redirectToMedia(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return redirectToMedia(request, context);
}
