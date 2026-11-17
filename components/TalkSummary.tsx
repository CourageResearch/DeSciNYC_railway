import { getTalkOverview } from "@/lib/talk-summaries";

export default function TalkSummary({ talkKey }: { talkKey: string }) {
  const overview = getTalkOverview(talkKey);

  return (
    <section id="summary" aria-labelledby="summary-heading" className="mx-auto w-full max-w-3xl scroll-mt-24 border-t border-[#303030] pt-8 font-sans">
      <h2 id="summary-heading" className="text-3xl font-semibold">Summary</h2>
      <p className="mt-4 text-base leading-8 text-stone-200">{overview.summary}</p>
      <h3 className="mt-7 text-xl font-semibold">Key takeaways</h3>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-7 text-stone-300 marker:text-[#5cdb68]">
        {overview.takeaways.map((takeaway) => <li key={takeaway} className="pl-1">{takeaway}</li>)}
      </ul>
    </section>
  );
}
