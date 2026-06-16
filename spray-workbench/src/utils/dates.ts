export function nowIso() {
  return new Date().toISOString();
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value: string) {
  if (!value) return "未填写";
  return new Intl.DateTimeFormat("zh-CN").format(new Date(value));
}
