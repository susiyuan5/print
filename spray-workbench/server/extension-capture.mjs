export function isChromeExtensionOrigin(origin = "") {
  return /^chrome-extension:\/\/[a-p]{32}$/i.test(origin);
}

export function normalizeExtensionCapture(payload = {}, { validateUrl, detectSource, now = new Date().toISOString() }) {
  if (!validateUrl(payload.pageUrl)) throw new Error("页面地址必须是公网 http 或 https");
  const source = detectSource(payload.pageUrl);
  const items = (Array.isArray(payload.items) ? payload.items : []).slice(0, 100)
    .filter((item) => item && typeof item.title === "string" && validateUrl(item.url))
    .map((item) => ({
      title: item.title.trim().slice(0, 160),
      url: item.url,
      imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : undefined,
      priceText: typeof item.priceText === "string" ? item.priceText : undefined,
      description: typeof item.description === "string" ? item.description.replace(/\s+/g, " ").trim().slice(0, 1_200) || undefined : undefined,
      sourceDescription: typeof item.sourceDescription === "string" ? item.sourceDescription.replace(/\s+/g, " ").trim().slice(0, 1_200) || undefined : undefined,
      descriptionLanguage: typeof item.descriptionLanguage === "string" ? item.descriptionLanguage.slice(0, 20) : undefined,
      translationStatus: ["translated", "not-needed", "unavailable", "failed"].includes(item.translationStatus) ? item.translationStatus : undefined,
      descriptionReadStatus: ["success", "failed"].includes(item.descriptionReadStatus) ? item.descriptionReadStatus : undefined,
      source,
      attribution: source,
      keywords: Array.isArray(item.keywords) ? item.keywords.filter((keyword) => typeof keyword === "string").slice(0, 20) : undefined,
    }))
    .filter((item) => item.title);
  if (!items.length) throw new Error("当前页面没有可确认的公网商品链接");
  return {
    source,
    url: payload.pageUrl,
    pageTitle: typeof payload.pageTitle === "string" ? payload.pageTitle.slice(0, 200) : "",
    extensionVersion: typeof payload.extensionVersion === "string" ? payload.extensionVersion.slice(0, 20) : undefined,
    capturedAt: now,
    items,
    warnings: ["由当前 Chrome 标签页扩展手动提交；请在导入前确认内容。", ...(items.some((item) => item.descriptionReadStatus === "failed") ? ["部分项目未能读取详情页 Description，未使用榜单卡片文字冒充说明。"] : []), ...(items.some((item) => item.translationStatus === "unavailable" || item.translationStatus === "failed") ? ["部分说明无法使用 Chrome 本机翻译，已保留来源原文。"] : [])],
  };
}
