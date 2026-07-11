import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
// @ts-expect-error Server module is plain ESM.
import { readJson, writeAtomicJson } from "../../server/atomic-json.mjs";
describe("atomic trend persistence",()=>{
  it("writes and reloads state across restarts",async()=>{const dir=await mkdtemp(join(tmpdir(),"trend-"));const path=join(dir,"state.json");await writeAtomicJson(path,{items:[{id:"1"}],pendingCaptures:[{id:"c"}]});expect((await readJson(path,{items:[]})).pendingCaptures[0].id).toBe("c");expect(JSON.parse(await readFile(path,"utf8")).items[0].id).toBe("1");await rm(dir,{recursive:true,force:true});});
  it("loads legacy fallback when the file is absent",async()=>{const dir=await mkdtemp(join(tmpdir(),"trend-"));const path=join(dir,"missing.json");expect(await readJson(path,{items:[],duplicateReviews:[]})).toEqual({items:[],duplicateReviews:[]});await rm(dir,{recursive:true,force:true});});
});
