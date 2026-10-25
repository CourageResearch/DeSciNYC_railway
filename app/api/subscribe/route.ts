import { NextRequest, NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/events";
import { getLumaEvent } from "@/lib/luma";
import { sendSubscriptionEmails } from "@/lib/form-email-notifications";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(() => null);
    const email = typeof data?.email === "string" ? data.email.trim() : "";

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    // Add to Luma
    const lumaApiKey = process.env.LUMA_API_KEY;
    const lumaWebsiteTag = process.env.LUMA_WEBSITE_TAG;
    
    if (!lumaApiKey || !lumaWebsiteTag) {
      console.error("Luma subscription configuration is incomplete");
      return NextResponse.json(
        { error: "Email signup is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    try {
      const lumaResponse = await fetch(
        "https://api.lu.ma/public/v1/calendar/import-people",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Luma-Api-Key": lumaApiKey,
          },
          body: JSON.stringify({
            tag_api_ids: [lumaWebsiteTag],
            infos: [{ email }],
          }),
          signal: AbortSignal.timeout(10_000),
        }
      );

      if (!lumaResponse.ok) {
        console.error("Luma rejected the subscription:", lumaResponse.status);
        return NextResponse.json(
          { error: "We couldn’t add you to the email list. Please try again." },
          { status: 502 }
        );
      }
    } catch (error) {
      console.error("Luma subscription request failed:", error);
      return NextResponse.json(
        { error: "Email signup is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    let nextEvent = null;
    // Event details are optional once the subscription has been saved.
    try {
      const upcomingEvents = await getUpcomingEvents();
      if (upcomingEvents && upcomingEvents.length > 0) {
        const nextUpcomingEvent = upcomingEvents[0];

        const lumaData = await getLumaEvent(
          nextUpcomingEvent.luma_id,
          nextUpcomingEvent.luma_url
        );

        if (lumaData?.event) {
          nextEvent = {
            name: lumaData.event.name || "Upcoming DeSciNYC event",
            url: nextUpcomingEvent.luma_url,
          };
        }
      }
    } catch (error) {
      console.error("Unable to include upcoming event in welcome email:", error);
    }

    // Email delivery is kept separate from the completed Luma subscription.
    // A provider outage should not tell someone that their subscription failed.
    try {
      await sendSubscriptionEmails({ email, nextEvent });
    } catch (error) {
      console.error("Failed to send subscription email:", error);
    }

    return NextResponse.json({ message: "Subscription successful" });
  } catch (error) {
    console.error("Error in subscription process:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
