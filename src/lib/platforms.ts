export interface PlatformInfo {
  id: string;
  name: string;
  color: string;
  url: string;
}

export const platformPresets: PlatformInfo[] = [
  { id: "github", name: "GitHub", color: "#181717", url: "https://github.com/login" },
  { id: "google", name: "Google", color: "#4285F4", url: "https://accounts.google.com" },
  { id: "apple", name: "Apple", color: "#000000", url: "https://appleid.apple.com" },
  { id: "microsoft", name: "Microsoft", color: "#00A4EF", url: "https://login.microsoftonline.com" },
  { id: "aws", name: "AWS", color: "#FF9900", url: "https://console.aws.amazon.com" },
  { id: "cloudflare", name: "Cloudflare", color: "#F38020", url: "https://dash.cloudflare.com/login" },
  { id: "twitter", name: "Twitter/X", color: "#000000", url: "https://x.com" },
  { id: "facebook", name: "Facebook", color: "#0866FF", url: "https://www.facebook.com" },
  { id: "instagram", name: "Instagram", color: "#E4405F", url: "https://www.instagram.com" },
  { id: "discord", name: "Discord", color: "#5865F2", url: "https://discord.com/login" },
  { id: "slack", name: "Slack", color: "#4A154B", url: "https://slack.com/signin" },
  { id: "notion", name: "Notion", color: "#000000", url: "https://www.notion.so/login" },
  { id: "steam", name: "Steam", color: "#000000", url: "https://store.steampowered.com/login" },
  { id: "netflix", name: "Netflix", color: "#E50914", url: "https://www.netflix.com/login" },
  { id: "spotify", name: "Spotify", color: "#1DB954", url: "https://accounts.spotify.com/login" },
  { id: "telegram", name: "Telegram", color: "#26A5E4", url: "https://web.telegram.org" },
  { id: "wechat", name: "微信", color: "#07C160", url: "https://weixin.qq.com" },
  { id: "alipay", name: "支付宝", color: "#1677FF", url: "https://www.alipay.com" },
  { id: "bilibili", name: "Bilibili", color: "#00A1D6", url: "https://www.bilibili.com" },
  { id: "chatgpt", name: "ChatGPT", color: "#10A37F", url: "https://chat.openai.com" },
  { id: "deepseek", name: "DeepSeek", color: "#4D6BFE", url: "https://chat.deepseek.com" },
  { id: "claude", name: "Claude", color: "#D97757", url: "https://claude.ai" },
];

export function getPlatformColor(iconId: string, name: string): string {
  const preset = platformPresets.find((p) => p.id === iconId || p.name.toLowerCase() === name.toLowerCase());
  if (preset) return preset.color;
  // Generate color from name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#4F46E5", "#7C3AED", "#DB2777", "#DC2626", "#EA580C", "#D97706", "#65A30D", "#059669", "#0891B2", "#2563EB"];
  return colors[Math.abs(hash) % colors.length];
}
