/** 将 ISO 时间字符串格式化为中文本地时间。 */
export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

/** 计算行情数据相对当前时间的新鲜度文案。 */
export function freshnessText(value: string): string {
  const age = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(age) || age < 0) {
    return "时间未知";
  }
  const minutes = Math.floor(age / 60_000);
  if (minutes < 1) {
    return "刚刚";
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时前`;
}

/** 将行情来源标识统一转换为中文展示文案。 */
export function sourceLabel(source: string): string {
  if (source === "akshare") {
    return "AkShare 实时行情";
  }
  if (source === "tencent") {
    return "腾讯实时行情";
  }
  if (source === "deterministic-fallback") {
    return "确定性降级数据";
  }
  return source;
}
