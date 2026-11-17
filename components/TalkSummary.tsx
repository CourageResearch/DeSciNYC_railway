import { getTalkOverview } from "@/lib/talk-summaries";
import { formatTranscriptTime } from "@/lib/transcripts";
import TakeawayTimestamp from "./TakeawayTimestamp";

export default function TalkSummary({ talkKey, videoId }: { talkKey: string; videoId: string | null }) {
  const overview = getTalkOverview(talkKey);

  return (
    <section id="summary" aria-labelledby="summary-heading" className="mx-auto w-full max-w-3xl scroll-mt-24 border-t border-[#303030] pt-8 font-sans">
      <h2 id="summary-heading" className="text-3xl font-semibold">Summary</h2>
      <p className="mt-4 text-base leading-8 text-stone-200">{overview.summary}</p>
      <h3 className="mt-7 text-xl font-semibold">Key takeaways</h3>
      <p className="mt-2 text-sm leading-6 text-stone-400">Select a timestamp to jump to that part of the video.</p>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-stone-300 marker:text-[#5cdb68]">
        {overview.takeaways.map((takeaway) => (
          <li key={takeaway.text} className="pl-1">
            <TakeawayTimestamp seconds={takeaway.start} label={formatTranscriptTime(takeaway.start)} videoId={videoId} />
            <span>{takeaway.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
