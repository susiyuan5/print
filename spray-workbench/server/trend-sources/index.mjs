export const sourceDefinitions = [
  ["google-trends", "Google 趋势", true], ["etsy", "Etsy", false], ["amazon", "Amazon", false],
  ["tiktok", "TikTok", false], ["pinterest", "Pinterest", false], ["facebook-marketplace", "Facebook Marketplace", false],
  ["makerworld", "MakerWorld", false], ["printables", "Printables", false], ["myminifactory", "MyMiniFactory", false], ["cults3d", "Cults3D", false],
];

export function createAdapters(settings = {}) {
  return sourceDefinitions.map(([id, name, defaultEnabled]) => ({
    id, name, enabled: settings[id] ?? defaultEnabled,
    async search() {
      return { items: [], error: "当前未配置合法的公开数据源或官方 API；未执行抓取。" };
    },
  }));
}
