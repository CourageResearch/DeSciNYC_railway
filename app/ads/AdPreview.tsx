"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImageIcon, X } from "lucide-react";
import type { AdsBreakdownRow } from "@/lib/ads-types";

export default function AdPreview({
  row,
  onClose,
}: {
  row: AdsBreakdownRow;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const title = row.creativeHeadline || row.adName || row.creativeTheme || "Ad preview";
  const platform = row.platform === "meta" ? "Meta" : row.platform === "x" ? "X" : row.platform;
  let destination: URL | null = null;
  try {
    const url = new URL(row.destinationUrl || "");
    if (url.protocol === "https:" || url.protocol === "http:") destination = url;
  } catch {
    // Older creatives may have no destination saved.
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="ad-preview-title"
      aria-describedby="ad-preview-description"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto border border-[#345143] bg-[#090D0B] p-0 text-white backdrop:bg-black/80"
    >
      <div>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#22362F] bg-[#090D0B] p-4">
          <div>
            <h2 id="ad-preview-title" className="font-Jersey10 text-3xl text-[#D7F171]">Ad preview</h2>
            <p id="ad-preview-description" className="mt-1 text-xs text-[#8BA59B]">
              {platform} creative · Appearance varies by placement.
            </p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close ad preview"
            className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#345143] text-[#B8C7C0] hover:bg-[#17251F] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D7F171]"
          >
            <X size={20} />
          </button>
        </header>
        <div className="p-4 sm:p-6">
          <article className="overflow-hidden rounded-lg border border-[#2A3B34] bg-[#0C1310]">
            <div className="flex items-center gap-3 p-4">
              <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D7F171] font-Jersey10 text-2xl text-black">D</div>
              <div>
                <div className="text-sm font-bold">DeSciNYC</div>
                <div className="text-xs text-[#8BA59B]">Sponsored · {platform}</div>
              </div>
            </div>
            {row.creativeBody ? (
              <p className="whitespace-pre-wrap break-words px-4 pb-4 text-sm leading-relaxed text-[#E5EDE8]">{row.creativeBody}</p>
            ) : (
              <p className="px-4 pb-4 text-xs text-[#8BA59B]">Ad copy is not available for this creative.</p>
            )}
            {row.creativeImageUrl && !imageFailed ? (
              // External ad images come from multiple platform and storage hosts.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.creativeImageUrl}
                alt={row.creativeImageLabel || title}
                onError={() => setImageFailed(true)}
                className="max-h-[55dvh] w-full object-contain bg-black"
              />
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 bg-[#060807] p-6 text-sm text-[#8BA59B]">
                <ImageIcon size={32} aria-hidden="true" />
                {imageFailed ? "This ad image could not be loaded." : "No image is available for this creative."}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#2A3B34] p-4">
              <div className="min-w-0 flex-1 basis-48">
                {destination ? <div className="mb-1 break-all text-xs uppercase text-[#8BA59B]">{destination.hostname}</div> : null}
                <h3 className="break-words text-lg font-bold">{title}</h3>
              </div>
              {destination ? (
                <a href={destination.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-[#345143] px-3 py-2 text-sm text-[#D7F171] hover:bg-[#17251F]">
                  Open destination <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </article>
          {row.creativeTheme || row.creativeImageLabel ? (
            <p className="mt-4 text-xs text-[#8BA59B]">{[row.creativeTheme, row.creativeImageLabel].filter(Boolean).join(" / ")}</p>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
