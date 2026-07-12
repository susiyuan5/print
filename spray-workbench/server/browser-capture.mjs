import { chromium } from "playwright";
import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const CDP_PORT = 9223;
export const CDP_ENDPOINT = `http://127.0.0.1:${CDP_PORT}`;
export const trendRadarChromeProfile = resolve(".local-data/trend-radar-chrome-profile");
const chromeCandidates = [
  process.env.TREND_RADAR_CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].filter(Boolean);

let browser; let context; let page; let chromeProcess;
let state = { status: "未启动", source: "generic", url: "", title: "", lastCaptureAt: null, count: 0, error: null };
const blockedHosts = /^(localhost|127\.|0\.0\.0\.0$|\[?::1\]?|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|fc|fd|fe80)/i;

export function validateUrl(value) { try { const url = new URL(value); if (!/^https?:$/.test(url.protocol) || blockedHosts.test(url.hostname) || url.username || url.password) return null; return url; } catch { return null; } }
export function detectSource(url = "") { const host = new URL(url).hostname.toLowerCase(); return ["etsy", "amazon", "tiktok", "instagram", "pinterest", "facebook-marketplace", "makerworld", "printables", "thingiverse", "myminifactory", "cults3d"].find((id) => host.includes(id.replace("-marketplace", ""))) ?? "generic"; }
export function searchUrl(source, query) { const q = encodeURIComponent(query); return ({ etsy: `https://www.etsy.com/search?q=${q}`, amazon: `https://www.amazon.com/s?k=${q}`, tiktok: `https://www.tiktok.com/search?q=${q}`, instagram: `https://www.instagram.com/explore/tags/${q.replace(/%23/g, "")}/`, pinterest: `https://www.pinterest.com/search/pins/?q=${q}`, makerworld: `https://makerworld.com/en/search/models?keyword=${q}`, printables: `https://www.printables.com/search/models?q=${q}`, thingiverse: `https://www.thingiverse.com/search?q=${q}`, myminifactory: `https://www.myminifactory.com/search/?query=${q}`, cults3d: `https://cults3d.com/en/search?q=${q}` })[source]; }

export function chromeLaunchArgs(profileDir = trendRadarChromeProfile) {
  return [`--remote-debugging-address=127.0.0.1`, `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profileDir}`, "--no-first-run", "--no-default-browser-check", "about:blank"];
}
export function browserReuseMode(connected, currentPageOpen) { return connected ? (currentPageOpen ? "reuse-page" : "reuse-window") : "launch-window"; }

async function resolveChromeExecutable() {
  for (const candidate of chromeCandidates) {
    try { await access(candidate, constants.X_OK); return candidate; } catch { /* try next path */ }
  }
  throw new Error("未找到 Google Chrome。请安装 Chrome，或设置 TREND_RADAR_CHROME_PATH 指向 chrome.exe。");
}
function activePage() { return context?.pages().find((entry) => !entry.isClosed()); }
function resetDisconnected() { browser = undefined; context = undefined; page = undefined; if (!chromeProcess?.killed) state = { ...state, status: "专用 Chrome 已关闭" }; }
async function connectToChrome() {
  if (browser?.isConnected()) return true;
  try {
    browser = await chromium.connectOverCDP(CDP_ENDPOINT);
    context = browser.contexts()[0];
    if (!context) throw new Error("Chrome 未提供可用浏览器上下文。");
    browser.on("disconnected", resetDisconnected);
    return true;
  } catch {
    browser = undefined; context = undefined; page = undefined;
    return false;
  }
}
async function waitForChrome() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await connectToChrome()) return;
    if (chromeProcess?.exitCode !== null && chromeProcess?.exitCode !== undefined) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`无法连接专用 Chrome（调试端口 ${CDP_PORT}）。请关闭占用该端口的程序后重试。`);
}
async function ensurePage() {
  const connected = await connectToChrome();
  const mode = browserReuseMode(connected, Boolean(page && !page.isClosed()));
  if (!connected) {
    const executable = await resolveChromeExecutable();
    await mkdir(trendRadarChromeProfile, { recursive: true });
    chromeProcess = spawn(executable, chromeLaunchArgs(), { windowsHide: false, stdio: "ignore" });
    chromeProcess.once("exit", resetDisconnected);
    await waitForChrome();
  }
  page = !page?.isClosed() ? page : activePage() ?? await context.newPage();
  return { page, mode };
}
export async function launch() {
  const { mode } = await ensurePage();
  state = { ...state, status: mode === "launch-window" ? "已启动趋势雷达专用 Chrome；请手动登录或完成人机验证" : "正在复用已有趋势雷达 Chrome 窗口", error: null };
  return state;
}
export async function open(url, source) {
  if (!validateUrl(url)) throw new Error("只允许访问公开的 http/https 网站，且默认不允许本地网络地址。");
  const target = await ensurePage();
  state.status = "正在打开网页";
  await target.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  state = { ...state, status: "页面已就绪，请在趋势雷达 Chrome 中手动登录或完成验证", source: source || detectSource(target.page.url()), url: target.page.url(), title: await target.page.title() };
  return state;
}
export async function capture({ maxScrolls = 0, scrollDelayMs = 1500, maxItems = 100 } = {}) {
  if (!page || page.isClosed()) throw new Error("趋势雷达 Chrome 页面未打开，请先启动并打开网页。");
  state.status = "正在抓取当前可见内容";
  const rounds = Math.min(Math.max(0, Number(maxScrolls) || 0), 5);
  for (let i = 0; i < rounds; i += 1) { await page.mouse.wheel(0, 800); await page.waitForTimeout(Math.min(Math.max(500, Number(scrollDelayMs) || 1500), 5000)); }
  const items = await page.locator("a").evaluateAll((links, limit) => links.map((link) => { const text = (link.innerText || link.getAttribute("aria-label") || "").trim(); const image = link.querySelector("img"); const parent = link.parentElement; const nearby = parent?.innerText || ""; const price = nearby.match(/(?:CA\$|US\$|\$|£|€)\s?\d+(?:[.,]\d+)?/)?.[0]; return { title: text.slice(0, 160), url: link.href, imageUrl: image?.currentSrc || image?.src, priceText: price, source: location.hostname }; }).filter((item) => item.title && item.url && /^https?:/.test(item.url)).slice(0, limit), Math.min(Math.max(1, Number(maxItems) || 100), 100));
  const unique = [...new Map(items.map((item) => [item.url, item])).values()];
  const pageText = (await page.locator("body").innerText({ timeout: 3000 }).catch(() => "")).slice(0, 20_000);
  const warnings = unique.length ? ["通用提取器仅读取当前已加载页面中的链接与可见文本，请在导入前确认。"] : ["未检测到可确认的商品链接。请手动滚动、搜索或选择支持的页面。"];
  if (/captcha|verify you are human|验证码|人机验证/i.test(pageText)) warnings.push("页面可能存在验证码，请在趋势雷达 Chrome 中手动完成后再抓取。");
  if (/sign in|log in|登录|登入/i.test(pageText)) warnings.push("页面可能需要登录，请手动登录后再抓取。");
  state = { ...state, status: "抓取完成，等待确认导入", url: page.url(), title: await page.title(), lastCaptureAt: new Date().toISOString(), count: unique.length };
  return { state, items: unique, warnings };
}
export async function screenshot() { if (!page || page.isClosed()) throw new Error("趋势雷达 Chrome 页面未打开。"); return page.screenshot({ type: "png" }); }
export async function stop() {
  if (browser?.isConnected()) await browser.close().catch(() => undefined);
  if (chromeProcess && !chromeProcess.killed && chromeProcess.pid) spawnSync("taskkill", ["/PID", String(chromeProcess.pid), "/T", "/F"], { windowsHide: true });
  chromeProcess = undefined; browser = undefined; context = undefined; page = undefined;
  state = { ...state, status: "已停止趋势雷达专用 Chrome" };
  return state;
}
export const browserStatus = () => state;
