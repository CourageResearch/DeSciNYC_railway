import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("the homepage thumbnail opens the dedicated Biological Futures player", async () => {
  const [pastEvents, videoPage, media] = await Promise.all([
    readFile("components/PastEvents.tsx", "utf8"),
    readFile("app/biological-futures/page.tsx", "utf8"),
    readFile("lib/media.ts", "utf8"),
    access("public/images/events/descinyc19-biological-futures.png"),
  ]);

  assert.equal(pastEvents.includes("<video"), false);
  assert.equal(pastEvents.includes("eventMedia.thumbnailPath"), true);
  assert.equal(pastEvents.includes("href={eventMedia.pagePath}"), true);
  assert.equal(media.includes('pagePath: "/biological-futures"'), true);
  assert.equal(
    media.includes(
      'thumbnailPath: "/images/events/descinyc19-biological-futures.png"'
    ),
    true
  );
  assert.equal(videoPage.includes("<video"), true);
  assert.equal(videoPage.includes("controls"), true);
  assert.equal(videoPage.includes("getMediaUrl(eventMedia.videoKey)"), true);
});
