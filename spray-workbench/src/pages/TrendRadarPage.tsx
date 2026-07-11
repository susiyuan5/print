import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendVisualStrip } from "../components/product/TrendVisualStrip";
import { PageHeader } from "../components/ui/PageHeader";
import { useWorkbench } from "../state/WorkbenchProvider";
import { createId } from "../utils/ids";
import { AMAZON_KEYWORDS, type CustomTrendShortcut, type TrendShortcut, type TrendShortcutPreferences, calculateRadarCounters, isPublicHttpUrl, loadShortcutPreferences, officialTrendShortcuts, recordShortcutOpen, saveShortcutPreferences, visibleShortcuts, buildSearchUrl } from "../utils/trendShortcuts";
import type { ProductOpportunity } from "../types/workbench";

type RawItem = { title: string; url: string; imageUrl?: string; priceText?: string; source: string; category?: string; keywords?: string[] };
type Match = { modelAssetId: string; score: number; matchedKeywords: string[] };
type Trend = { id: string; title: string; description?: string; category?: string; keywords?: string[]; imageUrl?: string; status: string; recommendation: string; sources: Array<{ platform: string; url: string; price?: number; currency?: string }>; firstSeenAt: string; heatScore?: number; competitionScore?: number; printabilityScore?: number; profitScore?: number; totalScore?: number; estimatedProfitMax?: number; ipRisk?: string; matchedModelAssetIds?: string[]; confirmedModelAssetId?: string; images?: Array<{ url: string; attribution?: string; sourceUrl?: string }>; modelMatches?: Match[]; conversionProductId?: string };
type State = { items: Trend[]; duplicateReviews: Array<{ id: string; raw: RawItem; existingItemId: string; score: number; reasons: string[]; status: string }>; captureHistory: Array<{ id: string; source: string; capturedAt: string; rawItemCount: number; importedItemCount: number }>; pendingCaptures: Array<{ id: string; items: RawItem[] }> };
type Capture = { id: string; items: RawItem[]; warnings: string[] };
const emptyState: State = { items: [], duplicateReviews: [], captureHistory: [], pendingCaptures: [] };
const unavailable = (value?: number) => value == null ? "暂无数据" : String(value);

function addOrRemove(values: string[], id: string) { return values.includes(id) ? values.filter((item) => item !== id) : [...values, id]; }

export function TrendRadarPage() {
  const { data, dispatch, setNotice } = useWorkbench();
  const navigate = useNavigate();
  const [state, setState] = useState<State>(emptyState);
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("generic");
  const [capture, setCapture] = useState<Capture>();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [edits, setEdits] = useState<Record<number, Partial<RawItem>>>({});
  const [message, setMessage] = useState("浏览器未启动");
  const [busy, setBusy] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState<boolean>();
  const [amazonKeyword, setAmazonKeyword] = useState(AMAZON_KEYWORDS[0]);
  const [preferences, setPreferences] = useState<TrendShortcutPreferences>(() => loadShortcutPreferences());
  const [custom, setCustom] = useState({ label: "", platform: "", url: "", description: "" });

  const call = async (path: string, body?: unknown, method = "POST") => {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error ?? "请求失败");
    return result;
  };
  const savePreferences = (next: TrendShortcutPreferences) => { setPreferences(next); saveShortcutPreferences(next); };
  const load = async () => {
    try {
      const result = await call("/api/trend-radar/results", undefined, "GET");
      setState({ items: result.items ?? [], duplicateReviews: result.duplicateReviews ?? [], captureHistory: result.captureHistory ?? [], pendingCaptures: result.pendingCaptures ?? [] });
      setServiceAvailable(true);
    } catch {
      setServiceAvailable(false);
      setMessage("网页抓取需要本地服务。请通过本地启动脚本打开工作台。");
    }
  };
  useEffect(() => { void load(); }, []);

  const openPage = async (targetUrl = url, targetSource = source, shortcutId?: string) => {
    if (!isPublicHttpUrl(targetUrl)) return setMessage("打开失败：仅允许公网 HTTP/HTTPS 地址。");
    setBusy(true); setMessage("正在启动浏览器");
    try {
      await call("/api/browser/status", undefined, "GET");
      setServiceAvailable(true);
      await call("/api/browser/launch");
      setMessage("正在打开榜单");
      const result = await call("/api/browser/open", { url: targetUrl, source: targetSource });
      setUrl(targetUrl); setSource(targetSource); setMessage(result.status ? `页面已打开；${result.status}` : "页面已打开；需要手动登录或验证时，请在可见浏览器中完成。");
      if (shortcutId) savePreferences(recordShortcutOpen(preferences, shortcutId));
    } catch (error) {
      setServiceAvailable(false);
      setMessage(error instanceof Error ? `打开失败：${error.message}` : "打开失败");
    } finally { setBusy(false); }
  };
  const openShortcut = (shortcut: TrendShortcut | CustomTrendShortcut) => void openPage(shortcut.url, shortcut.platform.toLowerCase(), shortcut.id);
  const amazonShortcut: TrendShortcut = { id: "amazon-demand", group: "market-validation", platform: "Amazon", label: "Amazon · 实用产品需求", url: buildSearchUrl("https://www.amazon.com/s", "k", amazonKeyword), keyword: amazonKeyword, description: "验证大众实用产品需求" };
  const shortcuts = useMemo(() => visibleShortcuts(preferences), [preferences]);
  const byGroup = (group: "model-ranking" | "market-validation") => shortcuts.filter((shortcut) => "group" in shortcut && shortcut.group === group && shortcut.id !== "amazon-demand");
  const customShortcuts = shortcuts.filter((shortcut) => !officialTrendShortcuts.some((official) => official.id === shortcut.id));
  const allKnown = [...officialTrendShortcuts, ...preferences.custom];
  const recent = preferences.recentIds.map((id) => allKnown.find((shortcut) => shortcut.id === id)).filter(Boolean) as Array<TrendShortcut | CustomTrendShortcut>;

  const capturePage = async (scroll = false) => {
    setBusy(true);
    try {
      const result = await call(scroll ? "/api/browser/scroll-capture" : "/api/browser/capture", scroll ? { maxScrolls: 5, scrollDelayMs: 1500, maxItems: 100 } : {});
      const preview = await call(`/api/browser/captures/${result.captureId}`, undefined, "GET");
      setCapture(preview.capture); setSelected(new Set(preview.capture.items.map((_: RawItem, index: number) => index))); setMessage("抓取完成，等待确认"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "抓取失败"); } finally { setBusy(false); }
  };
  const cancel = async () => { if (capture) await call(`/api/browser/captures/${capture.id}`, undefined, "DELETE"); setCapture(undefined); setMessage("已取消本次抓取"); await load(); };
  const confirm = async () => { if (!capture) return; setBusy(true); try { const result = await call(`/api/browser/captures/${capture.id}/import`, { selectedIndexes: [...selected], edits }); setMessage(`成功导入 ${result.imported} 条；跳过 ${result.skipped} 条。`); if (!result.errors?.length) setCapture(undefined); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "导入失败，预览已保留"); } finally { setBusy(false); } };
  const findMatches = async (item: Trend) => { await call(`/api/trend-radar/items/${item.id}/matches`, { assets: data.modelAssets ?? [] }); await load(); };
  const setMatch = async (item: Trend, modelAssetId: string) => { await call(`/api/trend-radar/items/${item.id}/match`, { modelAssetId }); await load(); };
  const rejectMatch = async (item: Trend, modelAssetId: string) => { await call(`/api/trend-radar/items/${item.id}/reject-match`, { modelAssetId }); await load(); };
  const convert = async (item: Trend) => {
    if (item.conversionProductId) return navigate(`/product-radar/${item.conversionProductId}`);
    if (!item.confirmedModelAssetId) return setMessage("请先确认本地模型；若要自行设计，请在模型库创建模型后再加入生产。");
    const productId = createId("product"); const modelAssetId = item.confirmedModelAssetId; const importedAt = new Date().toISOString();
    const product: ProductOpportunity = { id: productId, name: item.title, category: item.category ?? "趋势产品", markets: ["Canada"], productRole: "profit", description: item.description ?? "来自趋势产品雷达", targetCustomer: "待验证", customerProblem: "待验证", customizationOptions: [], demandScore: item.heatScore ?? 0, competitionScore: item.competitionScore ?? 0, profitScore: item.profitScore ?? 0, shippingScore: 0, videoScore: 0, customizationScore: 0, repeatabilityScore: item.printabilityScore ?? 0, licenseStatus: "unknown", ipRisk: "high", complianceRisk: "low", riskTags: [], sourceLinks: item.sources.map((entry) => entry.url), sourceImages: (item.images?.length ? item.images : item.imageUrl ? [{ url: item.imageUrl, kind: "source", attribution: item.sources[0]?.platform, sourceUrl: item.sources[0]?.url, capturedAt: item.firstSeenAt }] : []), evidenceNotes: [], status: "watching", productionStatus: "queued", radarItemId: item.id, modelAssetId, modelAssetIds: [modelAssetId], radarProvenance: { title: item.title, platforms: item.sources.map((entry) => entry.platform), sourceLinks: item.sources.map((entry) => entry.url), firstSeenAt: item.firstSeenAt, totalScore: item.totalScore }, marketData: { platforms: item.sources.map((entry) => entry.platform), productLinks: item.sources.map((entry) => entry.url), capturedAt: item.firstSeenAt, importedAt, firstDiscoveredAt: item.firstSeenAt, price: item.sources[0]?.price, currency: item.sources[0]?.currency, keywords: item.keywords ?? [], imageUrl: item.images?.[0]?.url ?? item.imageUrl, matchedModelAssetId: modelAssetId, radarScores: { heat: item.heatScore, competition: item.competitionScore, printability: item.printabilityScore, profit: item.profitScore, total: item.totalScore } } };
    dispatch({ type: "upsertProductOpportunity", product });
    await call(`/api/trend-radar/items/${item.id}/convert`, { modelAssetId, productId }); setNotice("已加入打印队列。"); navigate(`/product-radar/${productId}`);
  };
  const addCustom = (event: React.FormEvent) => { event.preventDefault(); if (!custom.label.trim() || !custom.platform.trim() || !custom.description.trim() || !isPublicHttpUrl(custom.url)) return setMessage("自定义快捷入口需要名称、平台、说明和有效的公网 HTTP/HTTPS URL。"); const shortcut: CustomTrendShortcut = { id: createId("shortcut"), label: custom.label.trim(), platform: custom.platform.trim(), url: custom.url.trim(), description: custom.description.trim() }; savePreferences({ ...preferences, custom: [...preferences.custom, shortcut] }); setCustom({ label: "", platform: "", url: "", description: "" }); };
  const toggleHidden = (id: string) => savePreferences({ ...preferences, hiddenIds: addOrRemove(preferences.hiddenIds, id) });
  const moveShortcut = (id: string, direction: -1 | 1) => { const ordered = [...shortcuts.map((shortcut) => shortcut.id)]; const index = ordered.indexOf(id); const target = index + direction; if (target < 0 || target >= ordered.length) return; [ordered[index], ordered[target]] = [ordered[target], ordered[index]]; savePreferences({ ...preferences, order: ordered }); };
  const restoreDefaults = () => savePreferences({ recentIds: preferences.recentIds, custom: preferences.custom, hiddenIds: [], order: [], lastOpenedId: preferences.lastOpenedId, lastOpenedAt: preferences.lastOpenedAt });
  const counters = calculateRadarCounters(state);

  const ShortcutCard = ({ shortcut }: { shortcut: TrendShortcut | CustomTrendShortcut }) => <article className="shortcut-card"><strong>{shortcut.platform}</strong><b>{shortcut.label}</b><small>{shortcut.description}</small><div className="button-row"><button className="button primary" disabled={busy || serviceAvailable !== true} onClick={() => openShortcut(shortcut)}>打开榜单</button><button className="button ghost" onClick={() => moveShortcut(shortcut.id, -1)}>↑</button><button className="button ghost" onClick={() => moveShortcut(shortcut.id, 1)}>↓</button><button className="button danger" onClick={() => toggleHidden(shortcut.id)}>隐藏</button></div></article>;
  return <>
    <PageHeader title="趋势产品雷达" description="可见浏览器抓取 → 确认导入 → 去重 → 模型匹配 → 加入现有生产流程" />
    <section className="panel radar-summary"><span>最近抓取时间：{counters.latestCapturedAt ? new Date(counters.latestCapturedAt).toLocaleString() : "暂无数据"}</span><span>本次抓取数量：{counters.latestCaptureCount}</span><span>待确认数量：{counters.pendingCount}</span><span>已导入数量：{counters.importedCount}</span><span>疑似重复数量：{counters.duplicateCount}</span><span>已转入生产数量：{counters.convertedCount}</span></section>
    {serviceAvailable === false && <section className="panel service-warning"><strong>网页抓取需要本地服务。请通过本地启动脚本打开工作台。</strong><p>已保存的趋势数据仍可查看；GitHub Pages 页面不能启动本地浏览器抓取。</p></section>}
    <section className="panel"><h2>热门榜单快捷入口</h2><div className="shortcut-groups"><div><h3>3D 模型热榜</h3><div className="shortcut-grid">{byGroup("model-ranking").map((shortcut) => <ShortcutCard key={shortcut.id} shortcut={shortcut} />)}</div></div><div><h3>实体商品验证</h3><div className="shortcut-grid">{byGroup("market-validation").map((shortcut) => <ShortcutCard key={shortcut.id} shortcut={shortcut} />)}{shortcuts.some((shortcut) => shortcut.id === "amazon-demand") && <article className="shortcut-card"><strong>Amazon</strong><b>Amazon · 实用产品需求</b><small>验证大众实用产品需求</small><select value={amazonKeyword} onChange={(event) => setAmazonKeyword(event.target.value)}>{AMAZON_KEYWORDS.map((keyword) => <option key={keyword}>{keyword}</option>)}</select><div className="button-row"><button className="button primary" disabled={busy || serviceAvailable !== true} onClick={() => openShortcut(amazonShortcut)}>打开榜单</button><button className="button danger" onClick={() => toggleHidden("amazon-demand")}>隐藏</button></div></article>}</div></div>{customShortcuts.length > 0 && <div><h3>自定义</h3><div className="shortcut-grid">{customShortcuts.map((shortcut) => <ShortcutCard key={shortcut.id} shortcut={shortcut} />)}</div></div>}</div>
      {recent.length > 0 && <><h3>最近打开</h3><div className="button-row">{recent.map((shortcut) => <button className="button ghost" disabled={busy || serviceAvailable !== true} key={shortcut.id} onClick={() => openShortcut(shortcut)}>{shortcut.label}</button>)}</div></>}
      <div className="button-row"><button className="button ghost" onClick={restoreDefaults}>恢复默认入口</button></div>
      <form className="form-grid shortcut-form" onSubmit={addCustom}><input placeholder="名称" value={custom.label} onChange={(event) => setCustom({ ...custom, label: event.target.value })} /><input placeholder="平台" value={custom.platform} onChange={(event) => setCustom({ ...custom, platform: event.target.value })} /><input placeholder="https://…" value={custom.url} onChange={(event) => setCustom({ ...custom, url: event.target.value })} /><input placeholder="一句说明" value={custom.description} onChange={(event) => setCustom({ ...custom, description: event.target.value })} /><button className="button ghost">添加自定义入口</button></form>
    </section>
    <section className="panel"><h2>网页抓取</h2><p className="muted">请自行完成登录、Cookie 或验证码；系统不会绕过访问限制。</p><label>网页地址<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label><div className="button-row"><button className="button primary" disabled={busy || serviceAvailable !== true} onClick={() => void openPage()}>打开网页</button><button className="button ghost" disabled={busy || serviceAvailable !== true} onClick={() => void capturePage()}>抓取当前页</button><button className="button ghost" disabled={busy || serviceAvailable !== true} onClick={() => void capturePage(true)}>受控滚动抓取</button><button className="button danger" disabled={serviceAvailable !== true} onClick={() => void call("/api/browser/stop").then(() => setMessage("浏览器已停止"))}>停止</button></div><p>{message}</p></section>
    {capture && <section className="panel"><h2>抓取预览</h2><p>{capture.warnings.join("；")}</p><div className="button-row"><button className="button ghost" onClick={() => setSelected(new Set(capture.items.map((_, index) => index)))}>全选</button><button className="button ghost" onClick={() => setSelected(new Set())}>取消全选</button><button className="button danger" onClick={() => void cancel()}>取消抓取</button><button className="button primary" disabled={busy || !selected.size} onClick={() => void confirm()}>{busy ? "正在导入" : `确认导入（${selected.size}/${capture.items.length}）`}</button></div><div className="item-list">{capture.items.map((item, index) => { const current = { ...item, ...edits[index] }; const errors = [!current.title && "缺少标题", !current.source && "缺少来源", !isPublicHttpUrl(current.url) && "商品链接无效"].filter(Boolean); return <article className="list-card" key={`${item.url}-${index}`}><label><input type="checkbox" checked={selected.has(index)} onChange={(event) => setSelected((value) => { const next = new Set(value); event.target.checked ? next.add(index) : next.delete(index); return next; })} />选择</label>{current.imageUrl && <img src={current.imageUrl} alt="" style={{ maxWidth: 100 }} />}<input value={current.title} onChange={(event) => setEdits((value) => ({ ...value, [index]: { ...value[index], title: event.target.value } }))} /><input placeholder="分类" value={current.category ?? ""} onChange={(event) => setEdits((value) => ({ ...value, [index]: { ...value[index], category: event.target.value } }))} /><input placeholder="关键词（空格分隔）" value={(current.keywords ?? []).join(" ")} onChange={(event) => setEdits((value) => ({ ...value, [index]: { ...value[index], keywords: event.target.value.split(/\s+/).filter(Boolean) } }))} /><span>{current.priceText ?? "暂无数据"} · {current.source}</span>{errors.map((error) => <p className="error-text" key={String(error)}>{error}</p>)}</article>; })}</div></section>}
    <section className="radar-product-list">{state.items.map((item) => <article className="radar-product" key={item.id}><TrendVisualStrip title={item.title} sourceUrl={item.images?.[0]?.url ?? item.imageUrl} attribution={item.images?.[0]?.attribution ?? item.sources[0]?.platform} sourceLink={item.images?.[0]?.sourceUrl ?? item.sources[0]?.url} modelThumbnail={(data.workshopImages ?? []).find((image) => image.id === (data.modelAssets ?? []).find((asset) => asset.id === item.confirmedModelAssetId)?.thumbnailImageId)} prototype={(data.workshopImages ?? []).find((image) => image.productId === (data.productOpportunities ?? []).find((product) => product.radarItemId === item.id)?.id)} /><div className="card-top"><strong>{item.title}</strong><span>{item.recommendation}</span></div><p>热度 {unavailable(item.heatScore)} · 竞争 {unavailable(item.competitionScore)} · 可打印性 {unavailable(item.printabilityScore)} · 预计利润 {unavailable(item.estimatedProfitMax)}</p><p>来源：{item.sources.map((entry) => entry.platform).join("、")} · IP 风险：{item.ipRisk ?? "暂无数据"}</p><div className="button-row"><button className="button ghost" disabled={serviceAvailable !== true} onClick={() => void findMatches(item)}>匹配本地模型</button><button className="button primary" disabled={serviceAvailable !== true} onClick={() => void convert(item)}>{item.conversionProductId ? "查看生产记录" : "加入生产"}</button></div>{item.modelMatches?.map((match) => <div className="list-card" key={match.modelAssetId}><strong>{data.modelAssets?.find((model) => model.id === match.modelAssetId)?.name ?? match.modelAssetId}</strong><span>匹配 {match.score}% · {match.matchedKeywords.join("、")}</span><button className="button ghost" onClick={() => void setMatch(item, match.modelAssetId)}>确认匹配</button><button className="button danger" onClick={() => void rejectMatch(item, match.modelAssetId)}>拒绝</button></div>)}</article>)}</section>
  </>;
}
