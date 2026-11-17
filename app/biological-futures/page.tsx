import type { Metadata } from "next";
import Link from "next/link";
import { getEventMediaByPagePath, getMediaUrl } from "@/lib/media";
import { withUtmSource } from "@/lib/tracking";
import TalkTranscript from "@/components/TalkTranscript";
import { transcripts } from "@/lib/transcripts";
import { getTranscriptParagraphs } from "@/lib/transcript-content";

const pagePath = "/biological-futures";
const eventMedia = getEventMediaByPagePath(pagePath);

export const metadata: Metadata = {
  title: "Biological Futures: CRISPR",
  description: "Watch Dr. Jo Zayner's CRISPR talk at DeSciNYC and read the timestamped transcript.",
  alternates: {
    canonical: pagePath,
  },
};

export default async function BiologicalFuturesPage() {
  if (!eventMedia) {
    throw new Error("Biological Futures media is not configured");
  }

  const videoUrl = getMediaUrl(eventMedia.videoKey);
  const transcript = transcripts.find((item) => item.key === "crispr");
  const paragraphs = transcript ? await getTranscriptParagraphs(transcript.key) : [];

  return (
    <main className="min-h-[calc(100vh-3.5rem)] px-4 pb-20 pt-12 md:pb-28 md:pt-20">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
        <Link
          href="/#past-events"
          className="w-fit text-sm uppercase text-stone-400 transition-colors hover:text-[#0FA711] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0FA711]"
        >
          &larr; Back to videos
        </Link>

        <header className="flex flex-col gap-2 border-l-4 border-[#0FA711] pl-4 md:pl-6">
          <p className="text-sm uppercase tracking-[0.18em] text-[#0FA711]">
            Biological Futures
          </p>
          <h1 className="font-Jersey25 text-5xl leading-none tracking-wide md:text-7xl">
            CRISPR
          </h1>
          <p className="text-stone-400">Dr. Jo Zayner</p>
        </header>

        {transcript && (
          <a href="#transcript" className="w-fit text-sm text-[#5cdb68] underline underline-offset-4">Read transcript</a>
        )}
        <div className="overflow-hidden border border-[#202020] border-b-4 border-r-4 bg-black">
          <div className="aspect-video w-full bg-black">
            <video
              id="recording"
              tabIndex={0}
              className="h-full w-full object-contain"
              controls
              playsInline
              preload="metadata"
              poster={eventMedia.thumbnailPath}
              aria-label="CRISPR video with Dr. Jo Zayner"
            >
              <source src={videoUrl} type="video/mp4" />
              {transcript && <track kind="captions" src={transcript.captionsPath} srcLang="en" label="English (automatic)" />}
              <a href={videoUrl}>Open the video</a>
            </video>
          </div>
        </div>

        <Link
          href={withUtmSource(
            "https://lu.ma/descinyc19",
            "descinyc_website"
          )}
          target="_blank"
          rel="noopener"
          className="w-fit text-sm uppercase text-white transition-colors hover:text-[#0FA711] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0FA711]"
        >
          View Luma event
        </Link>
        {transcript && <TalkTranscript transcript={transcript} paragraphs={paragraphs} />}
      </div>
    </main>
  );
}
