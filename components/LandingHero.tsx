import React from "react";
import Image from "next/image";
import { Button } from "./ui/button";
import VerticalLines from "./ui/verticalLines";
import Link from "next/link";
import MailingListForm from "./MailingListForm";

type HeroEvent = {
  url: string;
  startAt?: string | null;
  timezone?: string | null;
};

const logos = [
  {
    src: "/images/logo/endpoint-arena.svg",
    href: "https://endpointarena.com",
    alt: "Endpoint Arena",
  },

  // {
  //   src: "/images/logo/solana.png",
  //   href: null,
  // },
];

const LandingHero = async ({ event }: { event: HeroEvent | null }) => {
  const eventDate = event?.startAt ? new Date(event.startAt) : null;
  const hasEventDate = eventDate && !Number.isNaN(eventDate.getTime());
  const showSupportBanner = false;
  const rsvpHref = event?.url || "#subscribe";
  const opensNewTab = rsvpHref.startsWith("http");

  return (
    <div className="relative w-full overflow-hidden pt-16 pb-20 md:pt-24 md:pb-24">
      <VerticalLines fadeBottom />
      <div className="flex items-start justify-center mb-2 pt-8">
        <div className="hidden sm:flex-1 sm:flex flex-col gap-2">
          <div className="h-[2px] bg-[#cccccc]"></div>
          <div className="h-[2px] bg-[#cccccc]"></div>
          <div className="h-[2px] bg-[#cccccc]"></div>
        </div>
        <div className="max-w-[1100px] ml-auto w-full flex items-start">
          <div className="flex flex-col gap-4 max-w-[32rem] -mt-8">
            <h1 className="flex flex-col items-start justify-start capitalize text-6xl md:text-7xl mx-4 font-Jersey25 tracking-wide font-medium">
              <p>Welcome to</p>
              <p>Decentralized</p>
              <p>Science NYC</p>
            </h1>
            <p className="mx-4 text-stone-400">
              A monthly NYC meetup for science enthusiasts to learn, share
              projects, and socialize. Science is for everyone, and we try to
              make it accessible to all.
            </p>
            <div className="flex flex-col items-stretch justify-start gap-3 mx-4 mt-8 md:mt-24">
              <Link
                href={rsvpHref}
                className="w-full"
                target={opensNewTab ? "_blank" : undefined}
                rel={opensNewTab ? "noreferrer" : undefined}
              >
                <Button
                  variant="green"
                  size="lg"
                  className="w-full h-12 md:h-14 normal-case text-lg md:text-xl font-semibold flex-col gap-0"
                >
                  <p>RSVP to next event</p>
                  <p className="text-xs">
                    {hasEventDate
                      ? eventDate.toLocaleString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: event?.timezone || "America/New_York",
                          timeZoneName: "short",
                        })
                      : "Details on Lu.ma"}
                  </p>
                </Button>
              </Link>
              <MailingListForm
                id="subscribe"
                variant="hero"
                placeholder="Email for monthly NYC DeSci updates"
                buttonLabel="Join list"
                successMessage="You're on the list."
              />
            </div>
          </div>
          <div className="hidden sm:flex-1 sm:flex flex-col gap-2">
            <div className="h-[2px] bg-[#cccccc]"></div>
            <div className="h-[2px] bg-[#cccccc]"></div>
            <div className="h-[2px] bg-[#cccccc]"></div>
            <div className="flex items-center justify-center p-8">
              <Image
                src="/images/logo/nyc.png"
                alt="hero"
                width={800}
                height={800}
                quality={100}
                className="w-80 object-cover hidden md:block"
              />
            </div>
          </div>
        </div>

        <div className="hidden sm:flex-1 sm:flex flex-col gap-2">
          <div className="h-[2px] bg-[#cccccc]"></div>
          <div className="h-[2px] bg-[#cccccc]"></div>
          <div className="h-[2px] bg-[#cccccc]"></div>
        </div>
      </div>
      {showSupportBanner && (
        <div className="flex flex-col sm:flex-row justify-between bg-gradient-to-r from-[#0d230d]/60 from-10% via-[#004b00]/60 via-30% to-[#0d230d]/60 to-50% border-y border-[#0FA711]/60 h-14 items-center my-16 md:my-24">
          <div className="flex items-center max-w-[1100px] px-4 h-full mx-auto w-full">
            <div className="flex items-center justify-center gap-4 w-full">
              <p className="mt-0.5">Supported by:</p>
              {logos.map((logo, index) =>
                logo.href ? (
                  <Link href={logo.href} target="_blank" key={index}>
                    <Image
                      src={logo.src}
                      alt={logo.alt}
                      width={170}
                      height={60}
                      quality={100}
                      className="h-5 w-auto object-contain hover:scale-105 transition-all duration-300"
                    />
                  </Link>
                ) : (
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={170}
                    height={60}
                    quality={100}
                    key={index}
                    className="h-5 w-auto object-contain"
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-black/80 to-black"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
      >
        <div className="absolute inset-x-0 top-8 h-px bg-gradient-to-r from-transparent via-[#0FA711]/50 to-transparent" />
        <div className="mx-auto h-full max-w-[1100px] bg-[linear-gradient(90deg,transparent_0%,rgba(15,167,17,0.08)_22%,rgba(15,167,17,0.13)_50%,rgba(15,167,17,0.08)_78%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>
    </div>
  );
};

export default LandingHero;
