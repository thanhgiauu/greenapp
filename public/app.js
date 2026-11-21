const $ = (id) => document.getElementById(id);
const input = $("steamQuery"), button = $("searchBtn"), result = $("result"), message = $("message");
const HISTORY_KEY = "green-app-steam-history";

function showMessage(text) {
  message.textContent = text;
  message.classList.remove("hidden");
  result.classList.add("hidden");
}
function hideMessage() { message.classList.add("hidden"); }

function formatDate(iso) {
  if (!iso) return "Steam không cung cấp";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Không xác định";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function timeAgo(iso) {
  if (!iso) return "Steam không cung cấp";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Vừa hoạt động";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 30 * 86400) return `${Math.floor(seconds / 86400)} ngày trước`;
  return formatDate(iso);
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(profile) {
  const list = getHistory().filter(x => x.steamId !== profile.steamId);
  list.unshift({ steamId: profile.steamId, name: profile.name, profileUrl: profile.profileUrl });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 8)));
  renderHistory();
}
function renderHistory() {
  const list = getHistory();
  $("history").innerHTML = "";
  if (!list.length) {
    $("history").innerHTML = '<p class="empty">Chưa có lịch sử tìm kiếm.</p>';
    return;
  }
  list.forEach(item => {
    const row = document.createElement("button");
    row.className = "history-item";
    row.type = "button";
    const left = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = item.name;
    const id = document.createElement("small");
    id.textContent = item.steamId;
    left.append(name, id);
    const right = document.createElement("span");
    right.textContent = "TRA CỨU ↗";
    row.append(left, right);
    row.addEventListener("click", () => { input.value = item.steamId; lookup(); });
    $("history").append(row);
  });
}
function displayProfile(p) {
  $("avatar").src = p.avatar || "/green-logo.svg";
  $("avatar").onerror = () => { $("avatar").src = "/green-logo.svg"; };
  $("playerName").textContent = p.name;
  $("status").textContent = p.status;
  $("status").classList.toggle("offline", !p.online);
  $("activity").textContent = p.activity;
  $("steamId").textContent = p.steamId;
  $("lastActive").textContent = p.online ? "Đang hoạt động" : timeAgo(p.lastLogoff);
  $("visibility").textContent = p.visibility;
  $("createdAt").textContent = formatDate(p.createdAt);
  $("profileLink").href = p.profileUrl;
  result.classList.remove("hidden");
  saveHistory(p);
}
async function lookup() {
  const query = input.value.trim();
  if (!query) return showMessage("Bạn chưa nhập Steam ID hoặc đường dẫn hồ sơ.");
  hideMessage();
  button.disabled = true;
  $("btnText").textContent = "ĐANG TÌM...";
  try {
    const response = await fetch("/api/steam/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || "Không thể tra cứu tài khoản.");
    displayProfile(data.profile);
  } catch (error) {
    showMessage(error.message || "Không thể kết nối máy chủ.");
  } finally {
    button.disabled = false;
    $("btnText").textContent = "TRA CỨU";
  }
}
button.addEventListener("click", lookup);
input.addEventListener("keydown", event => { if (event.key === "Enter") lookup(); });
$("clearHistory").addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});
document.addEventListener("click", async event => {
  const target = event.target.closest("[data-copy]");
  if (!target) return;
  const value = $(target.dataset.copy).textContent;
  try {
    await navigator.clipboard.writeText(value);
    target.textContent = "ĐÃ SAO CHÉP ✓";
    setTimeout(() => target.textContent = "SAO CHÉP", 1300);
  } catch { target.textContent = "KHÔNG SAO CHÉP ĐƯỢC"; }
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
renderHistory();
