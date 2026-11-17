"use client";

import type { MouseEvent } from "react";

export default function TakeawayTimestamp({ seconds, label, videoId }: {
  seconds: number;
  label: string;
  videoId: string | null;
}) {
  function jumpToVideo(event: MouseEvent<HTMLAnchorElement>) {
    // Keep normal link behavior for opening YouTube in another tab or window.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const recording = document.getElementById("recording");

    if (recording instanceof HTMLIFrameElement && videoId) {
      event.preventDefault();
      const url = new URL(recording.src);
      url.searchParams.set("start", String(seconds));
      url.searchParams.set("autoplay", "1");
      recording.src = url.toString();
    } else if (recording instanceof HTMLVideoElement) {
      event.preventDefault();
      if (recording.readyState >= 1) {
        recording.currentTime = seconds;
      } else {
        recording.addEventListener("loadedmetadata", () => { recording.currentTime = seconds; }, { once: true });
      }
      void recording.play().catch(() => { /* The native play control remains available. */ });
    } else {
      return;
    }

    recording.scrollIntoView({ block: "start" });
    recording.focus({ preventScroll: true });
  }

  return (
    <a
      href={videoId ? `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s` : "#recording"}
      onClick={jumpToVideo}
      aria-label={`Watch takeaway at ${label}`}
      className="mr-2 inline-block whitespace-nowrap rounded-sm font-mono text-sm text-[#5cdb68] underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {label}
    </a>
  );
}
