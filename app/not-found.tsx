import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Home, Mail, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import HorizontalLines from "@/components/ui/HorizontalLines";
import VerticalLines from "@/components/ui/verticalLines";

const quickLinks = [
  { href: "/#subscribe", label: "Mailing list" },
  { href: "/#past-events", label: "Past events" },
  { href: "/#gallery", label: "Gallery" },
];

export default function NotFound() {
  return (
    <main className="relative isolate min-h-[calc(100svh-3.5rem)] overflow-hidden bg-black text-white">
      <div
        className="absolute inset-0 -z-30 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 18%, rgba(15, 167, 17, 0.35), transparent 28%), radial-gradient(circle at 84% 70%, rgba(204, 204, 204, 0.16), transparent 24%)",
        }}
      />
      <div
        className="absolute inset-0 -z-20 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15, 167, 17, 0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 167, 17, 0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <HorizontalLines />
      <VerticalLines />

      <section className="relative mx-auto grid w-full max-w-[1100px] gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-24">
        <div className="flex flex-col items-start">
          <div className="inline-flex items-center gap-2 border-y border-[#0FA711]/60 bg-[#0d230d]/80 px-3 py-2 text-sm text-[#9cff9e]">
            <SearchX className="h-4 w-4" aria-hidden="true" />
            Route not found
          </div>

          <h1 className="mt-6 font-Jersey25 text-7xl leading-none text-white sm:text-8xl lg:text-[10rem]">
            <span className="block text-[#0FA711]">404</span>
            <span className="block text-5xl sm:text-6xl lg:text-7xl">
              Page drifted off protocol.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-stone-300 sm:text-xl">
            The link may have moved, expired, or never existed. Head back to the
            main lab bench and we will get you pointed at the next gathering.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              asChild
              variant="green"
              size="lg"
              className="h-12 px-5 text-base font-bold normal-case"
            >
              <Link href="/">
                <Home className="h-4 w-4" aria-hidden="true" />
                Go home
              </Link>
            </Button>
            <Button
              asChild
              variant="gray"
              size="lg"
              className="h-12 px-5 text-base font-bold normal-case"
            >
              <Link href="/#subscribe">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Get updates
              </Link>
            </Button>
          </div>

          <div className="mt-10 w-full border-y border-[#CCCCCC]/35 py-4">
            <p className="text-sm uppercase text-stone-500">
              Useful coordinates
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group inline-flex items-center gap-2 text-stone-200 transition-colors hover:text-[#9cff9e]"
                >
                  {link.label}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="relative min-h-[340px] overflow-hidden border border-[#0FA711]/60 bg-[#041104] shadow-[0_0_60px_rgba(15,167,17,0.18)] sm:min-h-[440px]">
          <Image
            src="/images/eventphoto.png"
            alt="DeSciNYC meetup"
            fill
            priority
            sizes="(min-width: 1024px) 420px, 100vw"
            className="object-cover opacity-65 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-[#0d230d]/50" />
          <div className="absolute left-0 top-0 flex w-full flex-col gap-1 p-4">
            <div className="h-[2px] w-full bg-[#CCCCCC]" />
            <div className="h-[2px] w-4/5 bg-[#CCCCCC]/80" />
            <div className="h-[2px] w-3/5 bg-[#CCCCCC]/60" />
          </div>
          <div className="absolute right-4 top-4 border border-[#0FA711]/70 bg-black/70 px-3 py-2 font-VT323 text-xl text-[#9cff9e]">
            SIGNAL: 404
          </div>
          <div className="absolute bottom-0 left-0 right-0 border-t border-[#0FA711]/60 bg-black/80 p-5">
            <p className="font-Jersey10 text-4xl text-[#0FA711]">
              NYC science is still online.
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              Talks, demos, debates, and the occasional strange link. The good
              routes start from the homepage.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
