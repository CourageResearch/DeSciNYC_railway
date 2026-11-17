import index from "@/data/transcripts/index.json";

export type TranscriptInfo = {
  key: string;
  slug: string;
  title: string;
  speaker: string;
  videoId: string | null;
  eventUrl: string;
  pagePath: string;
  downloadPath: string;
  captionsPath: string;
  generated: boolean;
  edited?: boolean;
  source: string;
  paragraphCount: number;
  wordCount: number;
  lumaId?: string;
};

export type TranscriptParagraph = { start: number; end: number; text: string };
export const transcripts: TranscriptInfo[] = index;

export function getEventTranscript(event: { yt_uuid: string | null; luma_id: string }) {
  return transcripts.find((item) =>
    (item.videoId && item.videoId === event.yt_uuid) ||
    (item.lumaId && item.lumaId === event.luma_id)
  );
}

export function formatTranscriptTime(seconds: number) {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${remaining}` : `${minutes}:${remaining}`;
}
