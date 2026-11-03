import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import * as attribution from "../lib/attribution.ts";
import * as traffic from "../lib/attribution-traffic.ts";

async function loadModule(file, dependencies) {
  const { outputText } = ts.transpileModule(await readFile(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, URL, URLSearchParams, Date, console,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const parser = await loadModule("lib/luma-attribution.ts", {
  "@/lib/attribution": attribution,
  "@/lib/x-conversions": {
    sha256Hex: hash,
    hashEmailForX: (value) => value ? hash(value.toLowerCase()) : null,
  },
});
const clickId = "e9cb0dd8-1e9a-4132-9d7e-d845af4a021c";
const description = "[Read about space](https://example.com/space?utm_source=luma) then join our reception.";

for (const source of ["twitter_ads", "instagram_ads"]) {
  test(`${source} Luma registration keeps exact click attribution despite article links`, () => {
    const result = parser.parseLumaConversionPayload({
      type: "ticket.registered",
      data: {
        event: { api_id: "evt-9OpRa1KTEFHva0s", description },
        url: "https://luma.com/descinyc54?utm_source=luma",
        custom_source: `${source}__click_${clickId}`,
        created_at: "2026-11-03T15:00:00Z",
      },
    });
    assert.equal(result.tracking.utm_source, source);
    assert.equal(result.tracking.utm_id, clickId);
    assert.equal(attribution.resolveAttributionEvent({lumaEventId:result.lumaEventId}).slug, "descinyc54");
  });
}

test("event descriptions never manufacture a paid or organic source", () => {
  for (const text of [description, "https://example.com/?utm_source=twitter_ads"]) {
    const result = parser.parseLumaConversionPayload({data:{event:{description:text}}});
    assert.equal(result.tracking.utm_source, undefined);
  }
});

test("tracking URLs still supply campaign, creative and platform click identifiers", () => {
  const result = parser.parseLumaConversionPayload({data:{landing_url:
    "https://desci.nyc/descinyc54?utm_source=instagram_ads&utm_campaign=descinyc54_science_evening&utm_content=descinyc54_earthrise&fbclid=example"
  }});
  assert.equal(result.tracking.utm_campaign,"descinyc54_science_evening");
  assert.equal(result.tracking.utm_content,"descinyc54_earthrise");
  assert.equal(result.tracking.fbclid,"example");
});

test("preview crawlers do not create click rows, while normal browsers still do", async () => {
  let writes = 0;
  const db = await loadModule("lib/attribution-db.ts", {
    "@/lib/attribution": attribution,
    "@/lib/attribution-traffic": traffic,
    "@/lib/db": { hasDatabaseConfig:()=>true, query:async()=>{writes++;return {rows:[{inserted:true}]};} },
  });
  const input = { clickId, event:attribution.ATTRIBUTION_EVENTS.descinyc54,
    landingUrl:"https://desci.nyc/descinyc54",landingPath:"/descinyc54",tracking:{utm_source:"instagram_ads"} };
  for (const userAgent of ["facebookexternalhit/1.1", "Twitterbot/1.0", "Mozilla/5.0 (compatible; meta-externalads/1.1)"]) {
    const result = await db.recordAttributionClick({...input,userAgent});
    assert.equal(result.stored,false);
  }
  assert.equal(writes,0);
  for (const userAgent of ["Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1", "Mozilla/5.0 [FBAN/FBIOS;FBAV/500.0.0]", null]) {
    const result = await db.recordAttributionClick({...input,userAgent});
    assert.equal(result.stored,true);
  }
  assert.equal(writes,3);
});
