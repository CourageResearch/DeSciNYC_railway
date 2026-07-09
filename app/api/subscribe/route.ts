import { NextRequest, NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/events";
import { getLumaEvent } from "@/lib/luma";
import { sendSubscriptionEmails } from "@/lib/form-email-notifications";

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail } = await req.json();
    const email = String(rawEmail || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    // Add to Luma
    const lumaApiKey = process.env.LUMA_API_KEY;
    const lumaWebsiteTag = process.env.LUMA_WEBSITE_TAG;
    
    if (!lumaApiKey) {
      console.error("Luma API key not found");
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 500 }
      );
    }

    // Only try to add to Luma if we have both the API key and website tag
    if (lumaWebsiteTag) {
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
        }
      );

      if (!lumaResponse.ok) {
        const responseBody = await lumaResponse.text();
        console.error("Error adding email to Luma:", responseBody);
        return NextResponse.json(
          { error: "Failed to add to Luma" },
          { status: 400 }
        );
      }
    } else {
      console.warn("LUMA_WEBSITE_TAG not set - skipping Luma subscription");
    }

    const upcomingEvents = await getUpcomingEvents();

    let nextEvent = null;
    if (upcomingEvents && upcomingEvents.length > 0) {
      // Get the first upcoming event
      const nextUpcomingEvent = upcomingEvents[0];

      // Fetch Luma event details
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
