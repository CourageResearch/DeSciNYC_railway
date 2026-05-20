import Store from "@/components/Store";
import SupportUs from "@/components/SupportUs";
import ContactUs from "@/components/ContactUs";
import NextEvents from "@/components/NextEvents";
import PastEvents from "@/components/PastEvents";
import LandingHero from "@/components/LandingHero";
import StayInTouch from "@/components/StayInTouch";
import PhotoGallery from "@/components/PhotoGallery";
import SuggestComponent from "@/components/SuggestSpeaker";
import SubscribeComponent from "@/components/SubscribeComponent";
import { type EventRecord, getUpcomingEvents } from "@/lib/events";
import { listGalleryImages } from "@/lib/gallery";
import { type LumaEventResponse, getLumaEvent } from "@/lib/luma";

export const dynamic = "force-dynamic";

type HeroEventCandidate = {
  event: EventRecord;
  lumaEvent: LumaEventResponse | null;
  startTime: number | null;
};

async function getHeroEvent(upcomingEvents: EventRecord[]) {
  if (upcomingEvents.length === 0) {
    return {
      url: "#subscribe",
      startAt: null,
      timezone: "America/New_York",
    };
  }

  const candidates = await Promise.all(
    upcomingEvents.map(async (event) => {
      const lumaEvent = await getLumaEvent(event.luma_id, event.luma_url);
      const startAt = lumaEvent?.event?.start_at || null;
      const startTime = startAt ? new Date(startAt).getTime() : null;

      return {
        event,
        lumaEvent,
        startTime:
          startTime !== null && !Number.isNaN(startTime) ? startTime : null,
      };
    })
  );

  const datedCandidates = candidates.filter(
    (
      candidate
    ): candidate is HeroEventCandidate & { startTime: number } =>
      candidate.startTime !== null
  );
  const now = Date.now();
  const futureCandidate = datedCandidates
    .filter((candidate) => candidate.startTime >= now)
    .sort((a, b) => a.startTime - b.startTime)[0];
  const latestCandidate = datedCandidates.sort(
    (a, b) => b.startTime - a.startTime
  )[0];
  const selected = futureCandidate || latestCandidate || candidates[0];
  const lumaEvent: LumaEventResponse | null = selected.lumaEvent;

  return {
    url: lumaEvent?.event?.url || selected.event.luma_url || "#subscribe",
    startAt: lumaEvent?.event?.start_at || null,
    timezone: lumaEvent?.event?.timezone || "America/New_York",
  };
}

const LandingPage = async () => {
  const upcomingEvents = await getUpcomingEvents();
  const heroEvent = await getHeroEvent(upcomingEvents);

  const images = await listGalleryImages();

  return (
    <div className="relative w-full h-screen">
      <LandingHero event={heroEvent} />
      <SubscribeComponent />
      <div className="max-w-[1100px] mx-auto">
        <NextEvents />
        <PastEvents />
        <PhotoGallery images={images} />
        <StayInTouch />
        <SupportUs />
        <Store />
        <SuggestComponent />
      </div>
      <ContactUs />
    </div>
  );
};

export default LandingPage;
