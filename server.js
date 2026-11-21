import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rateLimit } from "express-rate-limit";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.STEAM_API_KEY;

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 25,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, error: "Bạn tìm kiếm quá nhanh. Vui lòng thử lại sau một phút." }
});

function extractSteamId(input) {
  const value = String(input || "").trim();
  if (!value) throw new Error("Vui lòng nhập Steam ID hoặc đường dẫn hồ sơ.");

  // SteamID64: 17 chữ số, thường bắt đầu bằng 7656.
  const idMatch = value.match(/(?:^|\/)(7656119\d{10})(?:\/|$|\?)/);
  if (/^7656119\d{10}$/.test(value)) return value;
  if (idMatch) return idMatch[1];

  // Hỗ trợ URL vanity: steamcommunity.com/id/tennguoidung
  let vanity = value;
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      if (!/(^|\.)steamcommunity\.com$/i.test(url.hostname)) {
        throw new Error("Chỉ hỗ trợ đường dẫn hồ sơ steamcommunity.com.");
      }
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "profiles" && /^7656119\d{10}$/.test(parts[1] || "")) {
        return parts[1];
      }
      if (parts[0] === "id" && parts[1]) vanity = parts[1];
      else throw new Error("Đường dẫn Steam không hợp lệ. Hãy dùng /id/ten hoặc /profiles/SteamID64.");
    }
  } catch (error) {
    if (error.message.includes("Steam")) throw error;
    throw new Error("Đường dẫn không hợp lệ.");
  }

  vanity = vanity.replace(/^\/+|\/+$/g, "");
  if (/^[a-zA-Z0-9_-]{2,64}$/.test(vanity)) return { vanity };
  throw new Error("Không nhận dạng được Steam ID. Hãy nhập SteamID64 hoặc URL hồ sơ Steam.");
}

async function steamGet(endpoint, params) {
  const url = new URL(`https://api.steampowered.com/${endpoint}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Steam API hiện không phản hồi. Vui lòng thử lại.");
  return response.json();
}

app.get("/api/health", (_req, res) => res.json({ success: true, app: "GREEN APP" }));

app.post("/api/steam/lookup", lookupLimiter, async (req, res) => {
  try {
    if (!API_KEY || API_KEY === "PASTE_YOUR_STEAM_API_KEY_HERE") {
      return res.status(503).json({
        success: false,
        error: "Chưa cấu hình Steam API Key. Hãy tạo file .env và điền STEAM_API_KEY."
      });
    }

    const parsed = extractSteamId(req.body?.query);
    let steamId;

    if (typeof parsed === "string") {
      steamId = parsed;
    } else {
      const vanityData = await steamGet("ISteamUser/ResolveVanityURL/v1/", {
        key: API_KEY,
        vanityurl: parsed.vanity
      });
      const result = vanityData?.response;
      if (result?.success !== 1 || !result?.steamid) {
        return res.status(404).json({ success: false, error: "Không tìm thấy hồ sơ Steam công khai tương ứng." });
      }
      steamId = result.steamid;
    }

    const summaryData = await steamGet("ISteamUser/GetPlayerSummaries/v2/", {
      key: API_KEY,
      steamids: steamId
    });
    const player = summaryData?.response?.players?.[0];

    if (!player) {
      return res.status(404).json({ success: false, error: "Không tìm thấy tài khoản Steam này." });
    }

    const states = ["Offline", "Online", "Busy", "Away", "Snooze", "Looking to trade", "Looking to play"];
    const state = Number(player.personastate ?? 0);
    const isOnline = state !== 0;
    const lastLogoff = player.lastlogoff
      ? new Date(Number(player.lastlogoff) * 1000).toISOString()
      : null;

    res.json({
      success: true,
      profile: {
        steamId: player.steamid,
        name: player.personaname || "Không rõ",
        avatar: player.avatarfull || player.avatarmedium || "",
        profileUrl: player.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
        status: states[state] || "Không xác định",
        online: isOnline,
        activity: player.gameextrainfo ? `Đang chơi: ${player.gameextrainfo}` : (isOnline ? "Đang hoạt động trên Steam" : "Đang ngoại tuyến"),
        lastLogoff,
        createdAt: player.timecreated ? new Date(Number(player.timecreated) * 1000).toISOString() : null,
        country: player.loccountrycode || null,
        visibility: player.communityvisibilitystate === 3 ? "Công khai" : "Không công khai / giới hạn"
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || "Đã xảy ra lỗi khi tra cứu." });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, error: "Lỗi máy chủ. Vui lòng thử lại." });
});

app.listen(PORT, () => console.log(`GREEN APP đang chạy tại http://localhost:${PORT}`));
