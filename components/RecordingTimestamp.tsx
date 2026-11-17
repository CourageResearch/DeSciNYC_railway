"use client";

export default function RecordingTimestamp({ seconds, label }: { seconds: number; label: string }) {
  return (
    <a
      href="#recording"
      aria-label={`Watch at ${label}`}
      className="mb-2 inline-block font-mono text-sm text-[#5cdb68] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:pt-1"
      onClick={() => {
        const recording = document.getElementById("recording");
        if (recording instanceof HTMLVideoElement) {
          recording.currentTime = seconds;
          recording.focus({ preventScroll: true });
          void recording.play().catch(() => { /* Native controls remain available. */ });
        }
      }}
    >
      {label}
    </a>
  );
}
