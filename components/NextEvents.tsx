import Link from "next/link";
import QRCode from "./QRCode";
import Image from "next/image";
import Heading from "./ui/heading";
import { Button } from "./ui/button";
import { type EventRecord, getUpcomingEvents } from "@/lib/events";
import { type LumaEventResponse, getLumaEvent } from "@/lib/luma";

// const scheduleLines = [
//   { time: "7:00 - 8:00 PM", activity: "Networking" },
//   { time: "8:00 - 9:00 PM", activity: "Main talk" },
//   { time: "9:00+ PM", activity: "More chatting" }
// ];

const NextEvents = async () => {
  let upcomingEvents: EventRecord[] = [];
  try {
    upcomingEvents = await getUpcomingEvents();
  } catch (error) {
    console.error("Error fetching events:", error);
    return (
      <div className="flex flex-col gap-4 pb-20 md:pb-40 px-4 md:px-0">
        <Heading title="Next Events" />
        <div className="border border-[#202020] p-4">
          <p className="text-xl text-red-500">
            Error loading events. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // If no upcoming events, show a message
  if (upcomingEvents.length === 0) {
    return (
      <div className="flex flex-col gap-4 pb-20 md:pb-40 px-4 md:px-0">
        <Heading title="Next Events" />
        <div className="border border-[#202020] p-4">
          <p className="text-xl">
            No upcoming events scheduled. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  type EventWithLumaData = EventRecord & {
    lumaEvent: LumaEventResponse["event"] | null;
  };

  // Fetch Luma event data for each event
  const eventsWithLumaData: EventWithLumaData[] = await Promise.all(
    upcomingEvents.map(async (event) => {
      try {
        const lumaData = await getLumaEvent(event.luma_id, event.luma_url);
        return {
          ...event,
          lumaEvent: lumaData?.event || null
        };
      } catch (error) {
        console.error(`Failed to fetch Luma data for event ${event.luma_id}:`, error);
        return {
          ...event,
          lumaEvent: null,
        };
      }
    })
  );

  // Sort events by lumaEvent.start_at (ascending)
  eventsWithLumaData.sort((a, b) => {
    const aDate = a.lumaEvent?.start_at ? new Date(a.lumaEvent.start_at).getTime() : 0;
    const bDate = b.lumaEvent?.start_at ? new Date(b.lumaEvent.start_at).getTime() : 0;
    return aDate - bDate;
  });

  return (
    <div className="flex flex-col gap-4 pb-20 md:pb-40 px-4 md:px-0">
      <Heading title="Next Events" />
      {/* Event Cards */}
      <div className="flex flex-col gap-4">
        {eventsWithLumaData.map((event) => (
          <div
            key={event.event_uuid || event.id || event.luma_id}
            className="flex flex-col md:flex-row border-b md:border border-[#202020] p-4 gap-4"
          >
            <div className="flex flex-col justify-center gap-2 w-full md:w-3/5">
              <h4 className="font-Jersey10 text-4xl">
                {event.title}
              </h4>
              <p className="text-muted-foreground font-bold text-xl">
                {event.lumaEvent?.start_at ? new Date(event.lumaEvent.start_at).toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true,
                  timeZone: event.lumaEvent.timezone || 'America/New_York'
                }) : ''}
              </p>
              <QRCode url={event.luma_url + "?utm_source=qr"} />
              <Link
                href={event.luma_url}
                target="_blank"
                className="w-min mt-4"
              >
                <Button
                  variant="green"
                  size="lg"
                  className="h-12 text-xl font-bold w-full md:w-96 bg-[#0FA711]/60 text-white"
                >
                  RSVP
                </Button>
              </Link>
            </div>
            <div className="flex flex-col gap-2 items-center justify-center w-full md:w-2/5">
              {event.lumaEvent?.cover_url ? (
                <div className="relative w-full aspect-square">
                  <Image
                    src={event.lumaEvent.cover_url}
                    alt="Event Image"
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                  <p className="text-gray-500">No image available</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextEvents;
