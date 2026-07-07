import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AttributionEventLanding from "@/components/AttributionEventLanding";
import AttributionRedirectHandoff from "@/components/AttributionRedirectHandoff";
import {
  captureAttributionAndBuildRedirectUrl,
  shouldShowAttributionPreview,
  type AttributionSearchParams,
} from "@/lib/attribution-redirect";
import {
  ATTRIBUTION_EVENTS,
  extractTrackingParams,
  withTrackingDefaults,
} from "@/lib/attribution";

export const dynamic = "force-dynamic";
const event = ATTRIBUTION_EVENTS.descinyc49;

export const metadata: Metadata = {
  title: event.title,
  description: event.description,
  alternates: {
    canonical: `/${event.slug}`,
  },
};

type PageProps = {
  searchParams?: Promise<AttributionSearchParams>;
};

export default async function DeSciNYC49Page({ searchParams }: PageProps) {
  const params = (await searchParams) || {};
  const tracking = withTrackingDefaults(extractTrackingParams(params), event);

  if (!shouldShowAttributionPreview(params)) {
    const redirectUrl = await captureAttributionAndBuildRedirectUrl({
      event,
      params,
    });

    if (process.env.X_ADS_PIXEL_ID) {
      return (
        <AttributionRedirectHandoff
          event={event}
          redirectUrl={redirectUrl}
          pixelId={process.env.X_ADS_PIXEL_ID}
        />
      );
    }

    redirect(redirectUrl);
  }

  return <AttributionEventLanding event={event} tracking={tracking} />;
}
