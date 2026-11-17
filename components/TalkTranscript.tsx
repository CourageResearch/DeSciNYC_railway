import { formatTranscriptTime, type TranscriptInfo, type TranscriptParagraph } from "@/lib/transcripts";
import RecordingTimestamp from "./RecordingTimestamp";

export default function TalkTranscript({ transcript, paragraphs }: {
  transcript: TranscriptInfo;
  paragraphs: TranscriptParagraph[];
}) {
  return (
    <section id="transcript" className="mx-auto w-full max-w-3xl scroll-mt-8 border-t border-[#303030] pt-8 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold">Transcript</h2>
        <a href={transcript.downloadPath} download className="text-sm text-[#5cdb68] underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
          Download text
        </a>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-stone-400">
        {transcript.generated ? "Automatically generated transcript. May contain errors." : "Transcript from the video captions."}
        {transcript.videoId ? " Select a timestamp to watch that moment on YouTube." : " Select a timestamp to watch that moment in the recording."}
      </p>
      <div className="mt-8 space-y-7">
        {paragraphs.map((paragraph, index) => (
          <div key={index} id={`t-${index}`} className="scroll-mt-8 sm:grid sm:grid-cols-[4.5rem_1fr] sm:gap-4">
            {transcript.videoId ? (
              <a href={`https://www.youtube.com/watch?v=${transcript.videoId}&t=${Math.floor(paragraph.start)}s`} target="_blank" rel="noopener noreferrer" aria-label={`Watch at ${formatTranscriptTime(paragraph.start)} on YouTube`} className="mb-2 inline-block font-mono text-sm text-[#5cdb68] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:pt-1">
                {formatTranscriptTime(paragraph.start)}
              </a>
            ) : (
              <RecordingTimestamp seconds={paragraph.start} label={formatTranscriptTime(paragraph.start)} />
            )}
            <p className="min-w-0 break-words text-base leading-8 text-stone-200">{paragraph.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
