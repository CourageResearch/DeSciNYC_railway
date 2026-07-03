import Image from "next/image";
import Link from "next/link";
import AttributionCheckoutButton from "@/components/AttributionCheckoutButton";
import {
  type AttributionEventConfig,
  type TrackingParams,
} from "@/lib/attribution";

type AttributionEventLandingProps = {
  event: AttributionEventConfig;
  tracking: TrackingParams;
};

export default function AttributionEventLanding({
  event,
  tracking,
}: AttributionEventLandingProps) {
  const eventDate = new Date(event.startsAt);
  const hasEventDate = !Number.isNaN(eventDate.getTime());

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="relative overflow-hidden border-b border-[#0FA711]/40">
        <div className="absolute inset-x-0 top-0 h-px bg-[#e7f7e7]" />
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1180px] grid-cols-1 items-center gap-10 px-4 py-10 md:grid-cols-[1fr_0.78fr] md:px-6 md:py-16">
          <div className="flex flex-col gap-7">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#c9f5c9]">
              <span className="border border-[#0FA711]/70 px-3 py-1 font-Jersey10 text-xl uppercase tracking-normal text-[#86f086]">
                DeSciNYC
              </span>
              {hasEventDate ? (
                <>
                  <span>
                    {eventDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      timeZone: "America/New_York",
                    })}
                  </span>
                  <span className="text-[#666]">/</span>
                  <span>
                    {eventDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/New_York",
                    })}{" "}
                    ET
                  </span>
                </>
              ) : (
                <span>Details on Luma</span>
              )}
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-Jersey25 text-6xl leading-[0.9] text-[#0FA711] md:text-8xl">
                {event.title}
              </h1>
              <p className="max-w-2xl text-lg leading-7 text-zinc-300 md:text-xl">
                {event.description}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <AttributionCheckoutButton
                event={event}
                initialTracking={tracking}
                className="inline-flex min-h-14 items-center justify-center border border-[#0FA711] bg-[#0FA711] px-6 py-3 text-center text-lg font-bold text-black transition hover:bg-[#86f086] focus:outline-none focus:ring-2 focus:ring-[#e7f7e7]"
              >
                Get tickets
              </AttributionCheckoutButton>
              <Link
                href="/"
                className="inline-flex min-h-14 items-center justify-center border border-zinc-700 px-6 py-3 text-center text-lg font-bold text-zinc-100 transition hover:border-[#86f086] hover:text-[#86f086]"
              >
                See DeSciNYC
              </Link>
            </div>
            <dl className="grid max-w-2xl grid-cols-1 gap-4 border-t border-zinc-800 pt-5 text-sm text-zinc-300 sm:grid-cols-3">
              <div>
                <dt className="mb-1 text-[#86f086]">Speaker</dt>
                <dd>{event.speaker || "DeSciNYC"}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[#86f086]">Focus</dt>
                <dd>{event.focus}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[#86f086]">Registration</dt>
                <dd>Tickets on Luma</dd>
              </div>
            </dl>
          </div>
          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute -inset-3 border border-[#0FA711]/30" />
            <Image
              src={event.posterImage}
              alt={event.imageAlt}
              width={1043}
              height={1042}
              priority
              className="relative aspect-square w-full border border-[#0FA711] bg-white object-cover"
            />
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 px-4 py-12 text-zinc-300 md:grid-cols-3 md:px-6">
        {event.audienceCards.map((card) => (
          <div key={card.title} className="border-t border-zinc-800 pt-4">
            <h2 className="mb-3 font-Jersey10 text-3xl text-white">
              {card.title}
            </h2>
            <p>{card.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
