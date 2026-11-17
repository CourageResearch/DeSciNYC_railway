import type { Metadata } from "next";
import Link from "next/link";
import transcript from "@/data/talks/marko-jukic.json";
import { MARKO_TALK } from "@/lib/marko-talk";
import { getSlidesHref } from "@/lib/slides";

const pageUrl = `https://desci.nyc${MARKO_TALK.pagePath}`;
const videoUrl = `https://www.youtube.com/watch?v=${MARKO_TALK.videoId}`;
const thumbnail = `https://i.ytimg.com/vi/${MARKO_TALK.videoId}/maxresdefault.jpg`;
const description =
  "Watch Marko Jukic's DeSciNYC talk on space exploration, automation, and industrial civilization, with a one-minute video summary, recreated slides, and a timestamped transcript.";

export const metadata: Metadata = {
  title: `${MARKO_TALK.title} — Marko Jukic`,
  description,
  alternates: { canonical: pageUrl },
  openGraph: {
    title: `${MARKO_TALK.title} — Marko Jukic`,
    description,
    url: pageUrl,
    type: "video.other",
    images: [{ url: thumbnail, width: 1280, height: 720, alt: MARKO_TALK.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${MARKO_TALK.title} — Marko Jukic`,
    description,
    images: [thumbnail],
  },
};

const resourceClass =
  "rounded-sm border border-[#303030] px-4 py-3 text-sm uppercase transition-colors hover:border-[#0FA711] hover:text-[#5cdb68] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0FA711]";

export default function MarkoJukicTalkPage() {
  const summaryUrl = `https://www.youtube.com/shorts/${MARKO_TALK.summaryVideoId}`;
  const summaryEmbedUrl = `https://www.youtube-nocookie.com/embed/${MARKO_TALK.summaryVideoId}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: `${MARKO_TALK.title} — Marko Jukic`,
        description,
        inLanguage: "en",
        mainEntity: { "@id": `${pageUrl}#full-video` },
      },
      {
        "@type": "VideoObject",
        "@id": `${pageUrl}#full-video`,
        name: `${MARKO_TALK.title} — Marko Jukic`,
        description:
          "Marko Jukic's lecture, introductions, and audience Q&A at DeSciNYC 54 with Palladium in New York on November 14, 2026.",
        thumbnailUrl: [thumbnail],
        uploadDate: MARKO_TALK.videoPublishedAt,
        duration: "PT1H18M21S",
        embedUrl: `https://www.youtube-nocookie.com/embed/${MARKO_TALK.videoId}`,
        url: pageUrl,
        inLanguage: "en",
        creator: { "@type": "Person", name: MARKO_TALK.speaker },
        publisher: { "@type": "Organization", name: "DeSciNYC", url: "https://desci.nyc" },
        hasPart: transcript.chapters.map((chapter, i) => ({
          "@type": "Clip",
          name: chapter.title,
          startOffset: chapter.start,
          endOffset: transcript.chapters[i + 1]?.start ?? 4450,
          url: `${videoUrl}&t=${chapter.start}s`,
        })),
      },
      {
        "@type": "VideoObject",
        "@id": `${pageUrl}#summary-video`,
        name: `${MARKO_TALK.title} — one-minute video summary`,
        description: "A 60-second edit of Marko Jukic's original lecture, in his own voice, with captions.",
        thumbnailUrl: [`https://i.ytimg.com/vi/${MARKO_TALK.summaryVideoId}/hqdefault.jpg`],
        uploadDate: MARKO_TALK.summaryPublishedAt,
        duration: "PT1M",
        embedUrl: summaryEmbedUrl,
        url: summaryUrl,
        inLanguage: "en",
        creator: { "@type": "Person", name: MARKO_TALK.speaker },
        isBasedOn: { "@id": `${pageUrl}#full-video` },
      },
    ],
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-24 pt-12 md:pt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <Link href="/#marko-jukic" className="text-sm uppercase text-stone-400 hover:text-[#5cdb68]">
        &larr; Back to videos
      </Link>

      <header className="my-8 border-l-4 border-[#0FA711] pl-4 md:pl-6">
        <p className="mb-3 text-sm uppercase tracking-widest text-[#5cdb68]">DeSciNYC 54 × Palladium</p>
        <h1 className="max-w-4xl font-Jersey25 text-4xl leading-tight md:text-6xl">{MARKO_TALK.title}</h1>
        <p className="mt-4 font-sans text-lg text-stone-300">Marko Jukic · New York · November 14, 2026</p>
      </header>

      <nav aria-label="Talk resources" className="mb-8 flex flex-wrap gap-3">
        <a href="#full-talk" className={resourceClass}>Full video</a>
        <a href="#one-minute-summary" className={resourceClass}>1 min video</a>
        <a href="#transcript" className={resourceClass}>Transcript</a>
        <a href={getSlidesHref(MARKO_TALK.slides)} target="_blank" rel="noopener noreferrer" className={resourceClass}>Slides (PDF)</a>
      </nav>

      <section id="full-talk" aria-label="Full talk video" className="scroll-mt-24">
        <div className="aspect-video overflow-hidden border border-[#303030] bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${MARKO_TALK.videoId}`}
            title={`${MARKO_TALK.title} — full talk by Marko Jukic`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-sans text-sm text-stone-400 underline hover:text-white">Watch on YouTube</a>
      </section>

      <section id="one-minute-summary" className="mt-16 scroll-mt-24 border-t border-[#303030] pt-10">
        <h2 className="font-Jersey25 text-3xl md:text-4xl">The talk in one minute</h2>
        <p className="mb-6 mt-2 font-sans text-stone-400">A 60-second edit from the recording, in Marko’s own voice.</p>
        <div className="aspect-[9/16] w-full max-w-[400px] overflow-hidden border border-[#303030] bg-black">
          <iframe
            className="h-full w-full"
            src={summaryEmbedUrl}
            title="One-minute video summary of Marko Jukic's talk"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            allowFullScreen
          />
        </div>
        <a href={summaryUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-sans text-sm text-stone-400 underline hover:text-white">Watch on YouTube</a>
      </section>

      <article id="transcript" className="mt-16 scroll-mt-24 border-t border-[#303030] pt-10 font-sans">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-Jersey25 text-3xl md:text-4xl">Read the transcript</h2>
          <a href={MARKO_TALK.transcriptDownload} download className="text-sm text-[#5cdb68] underline">Download transcript (.txt)</a>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400">{transcript.note}</p>

        <nav aria-label="Transcript chapters" className="my-8 grid gap-x-6 gap-y-3 border-y border-[#303030] py-6 text-sm md:grid-cols-2">
          {transcript.chapters.map((chapter) => (
            <a key={chapter.id} href={`#${chapter.id}`} className="flex gap-3 text-stone-300 hover:text-[#5cdb68]">
              <span className="w-14 shrink-0 font-mono text-[#5cdb68]">{chapter.timestamp}</span>
              <span>{chapter.title}</span>
            </a>
          ))}
        </nav>

        <div className="max-w-[800px]">
          {transcript.chapters.map((chapter) => (
            <section key={chapter.id} id={chapter.id} className="mb-12 scroll-mt-24">
              <h3 className="text-xl font-semibold text-white md:text-2xl">{chapter.title}</h3>
              <p className="mb-5 mt-1 text-sm text-stone-400">{chapter.speaker}</p>
              {chapter.paragraphs.map((paragraph) => (
                <p key={paragraph.start} id={`t-${Math.floor(paragraph.start)}`} className="mb-5 scroll-mt-24 text-base leading-8 text-stone-300">
                  <a
                    href={`${videoUrl}&t=${Math.floor(paragraph.start)}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Watch at ${paragraph.timestamp} on YouTube`}
                    className="mr-3 inline-block font-mono text-sm text-[#5cdb68] underline decoration-transparent hover:decoration-current"
                  >
                    {paragraph.timestamp}
                  </a>
                  {paragraph.text}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
