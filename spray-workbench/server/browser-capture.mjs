import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

let context; let page; let state = { status: "未启动", source: "generic", url: "", title: "", lastCaptureAt: null, count: 0, error: null };
const profileDir = resolve(".local-data/browser-profile");
const blockedHosts = /^(localhost|127\.|0\.0\.0\.0$|\[?::1\]?|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|fc|fd|fe80)/i;
/** Public-web only: shortcut URLs cannot reach files, browser internals, loopback or private networks. */
export function validateUrl(value) { try { const url = new URL(value); if (!/^https?:$/.test(url.protocol) || blockedHosts.test(url.hostname) || url.username || url.password) return null; return url; } catch { return null; } }
export function detectSource(url = "") { const host = new URL(url).hostname.toLowerCase(); return ["etsy","amazon","tiktok","instagram","pinterest","facebook-marketplace","makerworld","printables","thingiverse","myminifactory","cults3d"].find((id) => host.includes(id.replace("-marketplace", ""))) ?? "generic"; }
export function searchUrl(source, query) { const q = encodeURIComponent(query); return ({ etsy:`https://www.etsy.com/search?q=${q}`, amazon:`https://www.amazon.com/s?k=${q}`, tiktok:`https://www.tiktok.com/search?q=${q}`, instagram:`https://www.instagram.com/explore/tags/${q.replace(/%23/g, "")}/`, pinterest:`https://www.pinterest.com/search/pins/?q=${q}`, makerworld:`https://makerworld.com/en/search/models?keyword=${q}`, printables:`https://www.printables.com/search/models?q=${q}`, thingiverse:`https://www.thingiverse.com/search?q=${q}`, myminifactory:`https://www.myminifactory.com/search/?query=${q}`, cults3d:`https://cults3d.com/en/search?q=${q}` })[source]; }
function activePage() { return context?.pages().find((entry) => !entry.isClosed()); }
async function ensurePage() {
  const browser = context?.browser();
  if (context && browser?.isConnected()) {
    page = !page?.isClosed() ? page : activePage() ?? await context.newPage();
    return page;
  }
  context = undefined; page = undefined;
  await mkdir(profileDir, { recursive: true });
  context = await chromium.launchPersistentContext(profileDir, { headless: false, viewport: { width: 1440, height: 900 } });
  context.on("close", () => { context = undefined; page = undefined; state = { ...state, status: "浏览器已关闭" }; });
  page = activePage() ?? await context.newPage();
  return page;
}
export async function launch() { const reused = Boolean(context?.browser()?.isConnected()); await ensurePage(); state = { ...state, status: reused ? "正在复用已有浏览器窗口" : "浏览器运行中", error: null }; return state; }
export async function open(url, source) { if (!validateUrl(url)) throw new Error("只允许访问公开的 http/https 网站，且默认不允许本地网络地址。"); const target = await ensurePage(); state.status = "正在打开网页"; await target.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); state = { ...state, status: "页面已就绪，可手动登录或搜索", source: source || detectSource(target.url()), url: target.url(), title: await target.title() }; return state; }
export async function capture({ maxScrolls = 0, scrollDelayMs = 1500, maxItems = 100 } = {}) { if (!page || page.isClosed()) throw new Error("浏览器页面未打开，请先启动并打开网页。"); state.status = "正在抓取当前可见内容"; const rounds = Math.min(Math.max(0, Number(maxScrolls) || 0), 5); for (let i = 0; i < rounds; i += 1) { await page.mouse.wheel(0, 800); await page.waitForTimeout(Math.min(Math.max(500, Number(scrollDelayMs) || 1500), 5000)); }
  const items = await page.locator("a").evaluateAll((links, limit) => links.map((link) => { const text = (link.innerText || link.getAttribute("aria-label") || "").trim(); const image = link.querySelector("img"); const parent = link.parentElement; const nearby = parent?.innerText || ""; const price = nearby.match(/(?:CA\$|US\$|\$|£|€)\s?\d+(?:[.,]\d+)?/)?.[0]; return { title: text.slice(0, 160), url: link.href, imageUrl: image?.currentSrc || image?.src, priceText: price, source: location.hostname }; }).filter((item) => item.title && item.url && /^https?:/.test(item.url)).slice(0, limit), Math.min(Math.max(1, Number(maxItems) || 100), 100));
  const unique = [...new Map(items.map((item) => [item.url, item])).values()]; const pageText = (await page.locator("body").innerText({ timeout: 3000 }).catch(() => "")).slice(0, 20000); const warnings = unique.length ? ["通用提取器仅读取当前已加载页面中的链接与可见文本，请在导入前确认。"] : ["未检测到可确认的商品链接。请手动滚动、搜索或选择支持的页面。"]; if (/captcha|verify you are human|验证码|人机验证/i.test(pageText)) warnings.push("页面可能存在验证码，请在可见浏览器中手动完成后再抓取。"); if (/sign in|log in|登录|登入/i.test(pageText)) warnings.push("页面可能需要登录，请手动登录后再抓取。"); state = { ...state, status: "抓取完成，等待确认导入", url: page.url(), title: await page.title(), lastCaptureAt: new Date().toISOString(), count: unique.length }; return { state, items: unique, warnings }; }
export async function screenshot() { if (!page || page.isClosed()) throw new Error("浏览器页面未打开。"); return page.screenshot({ type: "png" }); }
export async function stop() { if (context) await context.close(); context = undefined; page = undefined; state = { ...state, status: "已停止" }; return state; }
export const browserStatus = () => state;
