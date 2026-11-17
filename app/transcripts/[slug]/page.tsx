import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TalkTranscript from "@/components/TalkTranscript";
import TalkSummary from "@/components/TalkSummary";
import { getTalkOverview } from "@/lib/talk-summaries";
import { transcripts } from "@/lib/transcripts";
import { getTranscriptParagraphs } from "@/lib/transcript-content";

export const dynamicParams = false;

export function generateStaticParams() {
  return transcripts.filter((item) => item.videoId).map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const transcript = transcripts.find((item) => item.slug === slug && item.videoId);
  if (!transcript) notFound();
  return {
    title: `${transcript.title} — Summary & Transcript`,
    description: getTalkOverview(transcript.key).summary,
    alternates: { canonical: `https://desci.nyc${transcript.pagePath}` },
  };
}

export default async function TranscriptPage({ params }: Props) {
  const { slug } = await params;
  const transcript = transcripts.find((item) => item.slug === slug && item.videoId);
  if (!transcript) notFound();
  const paragraphs = await getTranscriptParagraphs(transcript.key);

  return (
    <main className="min-h-screen px-4 pb-20 pt-12 md:pb-28 md:pt-20">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8">
        <Link href="/#past-events" className="w-fit text-sm uppercase text-stone-400 hover:text-[#5cdb68]">&larr; Back to videos</Link>
        <header className="border-l-4 border-[#0FA711] pl-4 md:pl-6">
          <p className="mb-3 text-sm uppercase tracking-widest text-[#5cdb68]">Talk &amp; transcript</p>
          <h1 className="font-Jersey25 text-4xl leading-tight md:text-6xl">{transcript.title}</h1>
          <p className="mt-3 text-lg text-stone-400">{transcript.speaker}</p>
        </header>
        <nav aria-label="Talk resources" className="flex flex-wrap gap-5 text-sm text-[#5cdb68]">
          <a href="#summary" className="underline underline-offset-4">Summary &amp; takeaways</a>
          <a href="#transcript" className="underline underline-offset-4">Read transcript</a>
          <a href={transcript.downloadPath} download className="underline underline-offset-4">Download text</a>
          <a href={`https://www.youtube.com/watch?v=${transcript.videoId}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Watch on YouTube</a>
        </nav>
        <div className="aspect-video overflow-hidden border border-[#303030] bg-black">
          <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${transcript.videoId}`} title={transcript.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </div>
        <TalkSummary talkKey={transcript.key} />
        <TalkTranscript transcript={transcript} paragraphs={paragraphs} />
      </div>
    </main>
  );
}
