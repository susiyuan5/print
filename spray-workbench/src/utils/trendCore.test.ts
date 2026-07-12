import { describe, expect, it } from "vitest";
// @ts-expect-error Server module is plain ESM and is exercised directly by Vitest.
import { canonicalUrl, conversionDecision, duplicateScore, filterItems, findDuplicate, matchModels, mergeInto, normalizeText, overlap, sortItems, tokens } from "../../server/trend-core.mjs";

const item = { id:"one", title:"Wall Mounted Desk Organizer", description:"Modular storage for a desk", keywords:["wall","desk","organizer"], imageUrl:"https://img/a.jpg", sources:[{platform:"etsy",url:"https://etsy.com/listing/1",price:20}], recommendation:"watch",status:"saved",note:"keep",firstSeenAt:"2026-01-01",lastSeenAt:"2026-01-01" };
describe("trend core",()=>{
  it("normalizes text",()=>expect(normalizeText("  Desk—Organizer! ")).toBe("desk organizer"));
  it("removes generic tokens",()=>expect(tokens("3D printable desk model")).toEqual(["desk"]));
  it("canonicalizes tracking URLs",()=>expect(canonicalUrl("https://www.etsy.com/listing/1?utm_source=x#top")).toBe("https://etsy.com/listing/1"));
  it("calculates token overlap",()=>expect(overlap(["desk","wall"],["desk","box"])).toBe(.5));
  it("detects exact URL duplicates",()=>expect(duplicateScore({url:"https://etsy.com/listing/1?ref=x",title:"other"},item).score).toBe(1));
  it("auto classifies high confidence",()=>expect(findDuplicate({url:"https://etsy.com/listing/1",title:item.title},[item])?.confidence).toBe("high"));
  it("creates medium review candidate",()=>expect(findDuplicate({url:"https://other.com/a",title:"Wall Desk Organizer",description:item.description,keywords:["wall","desk","organizer"]},[item])?.confidence).toBe("medium"));
  it("preserves user state while merging",()=>{const copy=structuredClone(item);mergeInto(copy,{source:"amazon",url:"https://amazon.com/x",title:item.title},"2026-02-01");expect(copy.status).toBe("saved");expect(copy.note).toBe("keep");expect(copy.sources).toHaveLength(2);});
  it("preserves a manual description while adding missing source translation metadata",()=>{const copy=structuredClone(item) as typeof item & { sourceDescription?: string; translationStatus?: string };mergeInto(copy,{source:"amazon",url:"https://amazon.com/x",title:item.title,description:"new translated text",sourceDescription:"Original source text",translationStatus:"translated"},"2026-02-01");expect(copy.description).toBe(item.description);expect(copy.sourceDescription).toBe("Original source text");expect(copy.translationStatus).toBe("translated");});
  it("preserves legacy items and appends attributed source image metadata",()=>{const copy=structuredClone(item) as typeof item & { images?: unknown[] };delete copy.images;mergeInto(copy,{source:"amazon",url:"https://amazon.com/x",title:item.title,imageUrl:"https://images.amazon.com/a.jpg",attribution:"Amazon"},"2026-02-01");expect(copy.imageUrl).toBe("https://img/a.jpg");expect(copy.images).toEqual([{url:"https://images.amazon.com/a.jpg",attribution:"Amazon",sourceUrl:"https://amazon.com/x",capturedAt:"2026-02-01"}]);});
  it("filters by keyword and status",()=>expect(filterItems([item],{keyword:"organizer",status:"saved"})).toHaveLength(1));
  it("sorts newest",()=>expect(sortItems([item,{...item,id:"two",firstSeenAt:"2026-02-01"}],"newest")[0].id).toBe("two"));
  it("matches local models deterministically",()=>expect(matchModels(item,[{id:"m",name:"Desk organizer",fileName:"organizer.stl",tags:["wall"]}],[],20)[0].modelAssetId).toBe("m"));
  it("excludes rejected matches",()=>expect(matchModels(item,[{id:"m",name:"Desk organizer",tags:["wall"]}],["m"],20)).toHaveLength(0));
  it("prevents duplicate conversion",()=>expect(conversionDecision({...item,status:"converted"},[],"m").action).toBe("existing"));
  it("creates design preparation without a model",()=>expect(conversionDecision(item,[],undefined)).toEqual({action:"design",status:"preparing"}));
  it("queues a confirmed model",()=>expect(conversionDecision(item,[],"m")).toEqual({action:"queue",status:"queued",modelAssetId:"m"}));
});
