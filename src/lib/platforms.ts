import { IconType } from "react-icons";
import {
  FaGithub, FaGoogle, FaApple, FaMicrosoft, FaAws, FaCloudflare,
  FaXTwitter, FaFacebook, FaInstagram, FaDiscord, FaSlack,
  FaSteam, FaSpotify, FaTelegram, FaWeixin, FaAlipay, FaBilibili,
  FaWeibo, FaTiktok, FaLinkedin, FaReddit, FaYoutube, FaTwitch,
  FaDropbox, FaDocker, FaGitlab, FaWordpress, FaPaypal, FaAmazon, FaMeta,
} from "react-icons/fa6";
import {
  SiNetflix, SiNotion,
} from "react-icons/si";
import {
  HiServerStack, HiWifi, HiAtSymbol,
} from "react-icons/hi2";
import {
  LuBrain, LuBot, LuPaintbrush, LuDatabase, LuKeyRound, LuLandmark,
} from "react-icons/lu";

export interface PlatformInfo {
  id: string;
  name: string;
  color: string;
  url: string;
  icon?: IconType;
}

export const platformPresets: PlatformInfo[] = [
  { id: "github", name: "GitHub", color: "#181717", url: "https://github.com/login", icon: FaGithub },
  { id: "google", name: "Google", color: "#4285F4", url: "https://accounts.google.com", icon: FaGoogle },
  { id: "apple", name: "Apple", color: "#000000", url: "https://appleid.apple.com", icon: FaApple },
  { id: "microsoft", name: "Microsoft", color: "#00A4EF", url: "https://login.microsoftonline.com", icon: FaMicrosoft },
  { id: "aws", name: "AWS", color: "#FF9900", url: "https://console.aws.amazon.com", icon: FaAws },
  { id: "cloudflare", name: "Cloudflare", color: "#F38020", url: "https://dash.cloudflare.com/login", icon: FaCloudflare },
  { id: "twitter", name: "Twitter/X", color: "#000000", url: "https://x.com", icon: FaXTwitter },
  { id: "facebook", name: "Facebook", color: "#0866FF", url: "https://www.facebook.com", icon: FaFacebook },
  { id: "instagram", name: "Instagram", color: "#E4405F", url: "https://www.instagram.com", icon: FaInstagram },
  { id: "discord", name: "Discord", color: "#5865F2", url: "https://discord.com/login", icon: FaDiscord },
  { id: "slack", name: "Slack", color: "#4A154B", url: "https://slack.com/signin", icon: FaSlack },
  { id: "notion", name: "Notion", color: "#000000", url: "https://www.notion.so/login", icon: SiNotion },
  { id: "steam", name: "Steam", color: "#000000", url: "https://store.steampowered.com/login", icon: FaSteam },
  { id: "netflix", name: "Netflix", color: "#E50914", url: "https://www.netflix.com/login", icon: SiNetflix },
  { id: "spotify", name: "Spotify", color: "#1DB954", url: "https://accounts.spotify.com/login", icon: FaSpotify },
  { id: "telegram", name: "Telegram", color: "#26A5E4", url: "https://web.telegram.org", icon: FaTelegram },
  { id: "wechat", name: "微信", color: "#07C160", url: "https://weixin.qq.com", icon: FaWeixin },
  { id: "alipay", name: "支付宝", color: "#1677FF", url: "https://www.alipay.com", icon: FaAlipay },
  { id: "bilibili", name: "Bilibili", color: "#00A1D6", url: "https://www.bilibili.com", icon: FaBilibili },
  { id: "weibo", name: "微博", color: "#E6162D", url: "https://weibo.com", icon: FaWeibo },
  { id: "tiktok", name: "抖音/TikTok", color: "#000000", url: "https://www.tiktok.com", icon: FaTiktok },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", url: "https://www.linkedin.com/login", icon: FaLinkedin },
  { id: "reddit", name: "Reddit", color: "#FF4500", url: "https://www.reddit.com/login", icon: FaReddit },
  { id: "youtube", name: "YouTube", color: "#FF0000", url: "https://www.youtube.com", icon: FaYoutube },
  { id: "twitch", name: "Twitch", color: "#9146FF", url: "https://www.twitch.tv/login", icon: FaTwitch },
  { id: "dropbox", name: "Dropbox", color: "#0061FF", url: "https://www.dropbox.com/login", icon: FaDropbox },
  { id: "docker", name: "Docker", color: "#2496ED", url: "https://hub.docker.com", icon: FaDocker },
  { id: "gitlab", name: "GitLab", color: "#FC6D26", url: "https://gitlab.com/users/sign_in", icon: FaGitlab },
  { id: "wordpress", name: "WordPress", color: "#21759B", url: "https://wordpress.com/log-in", icon: FaWordpress },
  { id: "paypal", name: "PayPal", color: "#003087", url: "https://www.paypal.com/signin", icon: FaPaypal },
  { id: "amazon", name: "Amazon", color: "#FF9900", url: "https://www.amazon.com/ap/signin", icon: FaAmazon },
  // AI 平台
  { id: "chatgpt", name: "ChatGPT", color: "#10A37F", url: "https://chat.openai.com", icon: LuBot },
  { id: "gemini", name: "Gemini", color: "#4285F4", url: "https://gemini.google.com", icon: LuBrain },
  { id: "deepseek", name: "DeepSeek", color: "#4D6BFE", url: "https://chat.deepseek.com", icon: LuBrain },
  { id: "claude", name: "Claude", color: "#D97757", url: "https://claude.ai", icon: LuBrain },
  { id: "copilot", name: "Copilot", color: "#000000", url: "https://copilot.microsoft.com", icon: LuBot },
  { id: "midjourney", name: "Midjourney", color: "#000000", url: "https://www.midjourney.com", icon: LuPaintbrush },
  { id: "meta", name: "Meta", color: "#0668E1", url: "https://www.meta.ai", icon: FaMeta },
  // 通用类
  { id: "database", name: "数据库", color: "#336791", url: "", icon: LuDatabase },
  { id: "server", name: "服务器", color: "#607D8B", url: "", icon: HiServerStack },
  { id: "vpn", name: "VPN", color: "#4CAF50", url: "", icon: LuKeyRound },
  { id: "wifi", name: "WiFi", color: "#2196F3", url: "", icon: HiWifi },
  { id: "email", name: "邮箱", color: "#D44638", url: "", icon: HiAtSymbol },
  { id: "bank", name: "银行", color: "#1A237E", url: "", icon: LuLandmark },
];

export function getPlatformPreset(iconId: string, name: string): PlatformInfo | undefined {
  return platformPresets.find(
    (p) => p.id === iconId || p.name.toLowerCase() === name.toLowerCase()
  );
}

export function getPlatformColor(iconId: string, name: string): string {
  const preset = getPlatformPreset(iconId, name);
  if (preset) return preset.color;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#4F46E5", "#7C3AED", "#DB2777", "#DC2626", "#EA580C", "#D97706", "#65A30D", "#059669", "#0891B2", "#2563EB"];
  return colors[Math.abs(hash) % colors.length];
}
