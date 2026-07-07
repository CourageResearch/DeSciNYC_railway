"use client";

import { useEffect } from "react";
import type { AttributionEventConfig } from "@/lib/attribution";

type TwqWindow = Window & {
  twq?: (...args: unknown[]) => void;
};

type AttributionRedirectHandoffProps = {
  event: AttributionEventConfig;
  redirectUrl: string;
  pixelId?: string | null;
};

const PIXEL_WAIT_MS = 1800;
const PIXEL_POLL_MS = 100;

export default function AttributionRedirectHandoff({
  event,
  redirectUrl,
  pixelId,
}: AttributionRedirectHandoffProps) {
  useEffect(() => {
    const cleanPixelId = pixelId?.trim();
    let pixelPoll: number | null = null;

    const markPixel = () => {
      const twqWindow = window as TwqWindow;

      if (cleanPixelId && typeof twqWindow.twq === "function") {
        twqWindow.twq("config", cleanPixelId);
        return;
      }

      pixelPoll = window.setTimeout(markPixel, PIXEL_POLL_MS);
    };

    markPixel();
    const timeout = window.setTimeout(() => {
      window.location.assign(redirectUrl);
    }, PIXEL_WAIT_MS);

    return () => {
      window.clearTimeout(timeout);

      if (pixelPoll) {
        window.clearTimeout(pixelPoll);
      }
    };
  }, [pixelId, redirectUrl]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-lg border border-[#0FA711]/60 bg-[#030603] p-6 text-center">
        <p className="mb-2 font-Jersey10 text-3xl text-[#86f086]">
          Opening checkout
        </p>
        <h1 className="mb-5 font-Jersey25 text-5xl leading-none text-[#0FA711]">
          {event.title}
        </h1>
        <a
          href={redirectUrl}
          className="inline-flex min-h-12 items-center justify-center border border-[#0FA711] bg-[#0FA711] px-5 py-3 text-lg font-bold text-black transition hover:bg-[#86f086] focus:outline-none focus:ring-2 focus:ring-[#e7f7e7]"
        >
          Continue to tickets
        </a>
      </div>
    </main>
  );
}
