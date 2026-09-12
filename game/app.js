import {
  Game,
  currentQuest,
  BUILDS,
  RECIPES,
  ITEMS,
  SHRINES,
  HOME,
  BEACON,
  height,
  biome,
  clamp,
  dist,
} from "./world.js";
import { OnlineRoom, LocalRoom } from "./online.js";
import { IslandAudio } from "./audio.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const ICONS = {
  bow: '<path d="M5 3q22 9 0 18L10 12Z M3 12h18m-4-3 4 3-4 3"/>',
  pistol: '<path d="M3 6h18v6H11l-2 8H4l2-8H3Z M12 12v4h4v-4"/>',
  shotgun: '<path d="M2 7h20v4H11l-3 4-2 6H2l3-10 M12 11v4h5v-4"/>',
  wood: '<path d="m5 5 11 11M4 9l5-5 12 12-5 5Z"/><path d="m8 12 4-4m0 8 4-4"/>',
  stone:
    '<path d="m4 9 6-6 8 2 4 10-6 6-12-3Z"/><path d="m4 9 7 5 7-9m-7 9 5 7"/>',
  crystal:
    '<path d="m12 2 7 7-2 10-5 3-5-3L5 9Z"/><path d="m12 2-2 8 2 12 2-12-2-8m-7 7 5 1m4 0 5-1"/>',
  sword:
    '<path d="m14 4 6-1-1 6-9 9-4-4Z"/><path d="m4 13 7 7M3 21l4-4m5-5 6-6"/>',
  axe: '<path d="M6 21 18 3m-8 1 3 1 6 4 2 2-4 4-2-3-6-4-3-1Z"/>',
  build: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7m-3-17v5"/>',
  bag: '<rect x="5" y="7" width="14" height="15" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2M5 12h14M9 16h6"/>',
  berry:
    '<circle cx="8" cy="14" r="4"/><circle cx="15" cy="15" r="4"/><path d="M12 11V5m0 2C9 3 7 3 5 5c1 3 4 3 7 2Zm0 0c3-4 5-4 7-2-1 3-4 3-7 2Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
  volume:
    '<path d="m11 5-6 4H2v6h3l6 4ZM15 8a6 6 0 0 1 0 8m3-12a11 11 0 0 1 0 16"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4Zm5 4 6 6m0-6-6 6"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 17h5a2 2 0 1 1-2 2"/>',
  hand: '<path d="M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-4a2 2 0 0 1 4 0v8c0 5-3 7-7 7s-6-4-8-7l-2-3c-1-2 2-3 3-1l2 2"/>',
  fire: '<path d="M13 2s2 5-2 8c0-3-3-4-3-4S2 12 5 18c3 6 14 5 15-2 1-5-4-7-4-7s1 3-1 4c0-5-2-11-2-11Z"/>',
  tent: '<path d="m3 21 9-18 9 18ZM8 21l4-9 4 9M8 3l4 5 4-5"/>',
  lamp: '<path d="M9 3h6M12 3v3m-5 4 5-4 5 4v7H7Zm0 7-2 3h14l-2-3m-5 0v-5"/>',
  fence: '<path d="M3 21V5l2-2 2 2v16M17 21V5l2-2 2 2v16M7 9h10M7 16h10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16"/>',
};
function icon(name) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.crystal}</svg>`;
}
function fillIcons(root = document) {
  root
    .querySelectorAll("[data-icon]")
    .forEach((e) => (e.innerHTML = icon(e.dataset.icon)));
}
fillIcons();
$("#sound").innerHTML = icon("volume");
$("#pause").innerHTML = icon("pause");
const SAVE_KEY = "wildhaven-island-v1",
  PREF_KEY = "wildhaven-preferences-v1";
let game = new Game(),
  view = null,
  started = false,
  paused = false,
  mode = "adventure",
  tool = "sword",
  destination = null,
  attackTarget = null,
  gatherTarget = null,
  selectedBuild = null,
  buildAngle = 0,
  buildPoint = null,
  settings = {},
  saveData = null,
  keys = new Set(),
  stick = { x: 0, y: 0 },
  holdingAttack = false,
  holdingInteract = false,
  lastMove = { x: 0, z: 1 },
  lastFrame = performance.now(),
  hudTimer = 0,
  saveTimer = 0,
  mapTimer = 0,
  saveFailed = false,
  backgrounded = false,
  autoActionTimer = 0;
let online = null,
  remoteActors = new Map(),
  lastOnlineStatus = "",
  lastRespawns = 0;
const audio = new IslandAudio();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("/sw.js").catch(() => {});
try {
  settings = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    saveData = JSON.parse(raw);
    new Game("adventure", saveData);
  }
} catch {
  saveData = null;
}
if (settings.sound === false) audio.enabled = false;
$("#sound").innerHTML = icon(audio.enabled ? "volume" : "muted");
let terrainMap = null;
function toast(text, tone = "normal") {
  const el = document.createElement("div");
  el.className = "toast " + tone;
  el.textContent = text;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), tone === "bad" ? 2600 : 1100);
  while ($("#toasts").children.length > 1)
    $("#toasts").firstElementChild.remove();
}
function events() {
  for (const e of game.events.splice(0)) {
    view.handle(e);
    audio.play(e.type);
    if (e.type === "toast") { toast(e.text, e.tone); const status=$("#craft-status"); if(status) status.textContent=e.text; }
    if (e.type === "discovery") {
      const el = $("#discovery");
      el.querySelector("strong").textContent = e.name;
      el.classList.add("show");
      clearTimeout(events.discoveryTimer);
      events.discoveryTimer = setTimeout(
        () => el.classList.remove("show"),
        3700,
      );
    }
    if (e.type === "victory") {
      save();
      setTimeout(() => {
        if (started) openVictory();
      }, 1800);
    }
    if (e.type === "build" || e.type === "home-change") save();
    if (e.type === "respawn") {
      destination = null;
      attackTarget = null;
      gatherTarget = null;
    }
    if (e.type === "shrine") save();
  }
}
function save() {
  if (!started) return;
  if (online) {
    $("#save-status").textContent = online.connected
      ? "联机世界已同步"
      : "正在重新连接";
    return;
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game.snapshot()));
    saveData = game.snapshot();
    $("#save-status").textContent = "旅程已保存";
    saveFailed = false;
  } catch {
    if (!saveFailed) toast("当前浏览器无法保存进度，关闭页面前请留意", "bad");
    saveFailed = true;
    $("#save-status").textContent = "进度未能保存";
  }
}
function saveSettings() {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(settings));
  } catch {}
}
async function fullScreen() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement) {
      if (el.requestFullscreen)
        await el.requestFullscreen({ navigationUI: "hide" });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    }
    if (screen.orientation?.lock) await screen.orientation.lock("landscape");
  } catch {
    /* iOS orientation follows the device. */
  }
}
$("#rotate-fullscreen").onclick = fullScreen;
function clearInput() {
  keys.clear();
  stick = { x: 0, y: 0 };
  holdingAttack = holdingInteract = false;
  $("#joystick-knob").style.transform = "";
  destination = null;
  attackTarget = null;
  gatherTarget = null;
}
function setPanel(title, content, eyebrow = "WILDHAVEN") {
  clearInput();
  paused = true;
  audio.setPaused(!online);
  $("#panel-title").textContent = title;
  $("#panel-eyebrow").textContent = eyebrow;
  $("#panel-content").innerHTML = content;
  delete $("#panel-content").dataset.buildingId;
  fillIcons($("#panel-content"));
  if (!$("#panel").open) $("#panel").showModal();
}
function closePanel() {
  if ($("#panel").open) $("#panel").close();
  paused = false;
  audio.setPaused(false);
  lastFrame = performance.now();
}
$("#close-panel").onclick = closePanel;
$("#panel").addEventListener("cancel", () => {
  paused = false;
  audio.setPaused(false);
  lastFrame = performance.now();
});
$("#panel").addEventListener("close", () => {
  paused = false;
  lastFrame = performance.now();
  audio.setPaused(false);
});
$("#panel").addEventListener("click", (e) => {
  if (e.target === $("#panel")) {
    const r = $("#panel").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closePanel();
  }
});
function resetView(next) {
  if (view) {
    view.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    view.renderer.dispose();
  }
  game = next;
  view = new ViewClass($("#world"), game);
  if (settings.quality) view.setQuality(settings.quality);
}
let ViewClass;
async function begin(resume = false) {
  if (online) {
    online.leave();
    online = null;
    remoteActors.clear();
    $("#party span").textContent = "联机";
  }
  if (matchMedia("(pointer:coarse)").matches) fullScreen();
  closePanel();
  if (resume && saveData) {
    try {
      resetView(new Game(saveData.mode, saveData));
    } catch {
      toast("存档无法读取，已准备一段新的旅程", "bad");
      resetView(new Game(mode));
    }
  } else if (started || game.elapsed > 0 || game.isGuest)
    resetView(new Game(mode));
  else game.mode = mode;
  started = true;
  paused = false;
  $("#welcome").hidden = true;
  $("#hud").hidden = false;
  $("#loading").hidden = true;
  clearInput();
  await audio.start();
  $("#sound").innerHTML = icon(audio.enabled ? "volume" : "muted");
  if (!resume) {
    showTutorial();
    toast(
      mode === "creative"
        ? "漫游模式：不会受伤，建造无需材料。"
        : "先采集身旁的树木和晶簇，开始你的旅程。",
      "good",
    );
  } else toast("欢迎回到霁野，旅程已恢复。", "good");
  hudUpdate();
  save();
}
function confirmNew() {
  if (!saveData) {
    begin(false);
    return;
  }
  setPanel(
    "开启新的旅程",
    `<p class="panel-intro">新的旅程会替换此设备上已有的进度。你也可以继续探索原来的岛屿。</p><div class="button-row"><button id="confirm-new" class="primary">开启新旅程</button><button id="keep-save" class="subtle">继续已有旅程</button></div>`,
  );
  $("#confirm-new").onclick = () => {
    mode = $(".mode.selected")?.dataset.mode || "adventure";
    begin(false);
  };
  $("#keep-save").onclick = () => begin(true);
}
$$(".mode").forEach(
  (b) =>
    (b.onclick = () => {
      mode = b.dataset.mode;
      $$(".mode").forEach((x) => x.classList.toggle("selected", x === b));
    }),
);
$("#start").onclick = () => confirmNew();
$("#continue").onclick = () => begin(true);
function showTutorial() {
  const el = document.createElement("div");
  el.className = "tutorial-tip";
  el.textContent = matchMedia("(pointer:coarse)").matches
    ? "左侧摇杆移动，选择“采集”后长按攻击键采集；小按钮用于上下风帆车。"
    : "WASD 移动 · 空格挥剑/采集 · E 上下车 · Shift 闪避。也可以点击地面前进。";
  $("#hud").append(el);
  setTimeout(() => el.remove(), 8500);
}
function openInventory(message = "") {
  if (typeof message !== "string") message = "";
  $(".quickbar").hidden = true;
  const p = game.player,
    w = p.weapon,
    cost = { wood: 5 * w, stone: 4 * w, crystal: 2 * w },
    nearBench = game.workbenchNearby();
  const durability = (name, t) =>
    `<div class="durability"><span>${name}</span><i><b style="width:${t.maxDurability ? Math.round((t.durability / t.maxDurability) * 100) : 0}%"></b></i><em>${Math.ceil(t.durability)}/${t.maxDurability}</em></div>`;
  setPanel(
    "随身行囊",
    `<p class="panel-intro">工具、武器、风帆小车和建筑都有耐久。星铁剑与篝火不会损坏。${game.creative ? "漫游中材料不会限制建造与升级。" : ""}</p><div class="inventory-list">${Object.entries(
      ITEMS,
    )
      .map(
        ([k, name]) =>
          `<div class="inventory-slot"><i data-icon="${k}"></i><strong>${game.creative ? "∞" : game.inventory[k]}</strong><span>${name}</span></div>`,
      )
      .join(
        "",
      )}</div><div class="upgrade-box"><h3>星铁剑 <span style="color:var(--accent)">· ${w} 阶</span></h3><p>基础伤害 ${22 + w * 6} · 每三次挥剑追加伤害。</p>${w < 5 ? `<div class="cost">升级需要：${costText(cost)}</div><div class="button-row"><button id="upgrade" class="primary" ${game.afford(cost) ? "" : "disabled"}>升级星铁剑</button></div>` : ""}</div><div class="craft-box"><h3>制作台 ${nearBench ? "· 已就绪" : "· 需要靠近野外工作台"}</h3>${durability("石斧", game.tools.axe)}${durability("猎人长矛", game.tools.spear)}<div class="craft-grid">${Object.entries(
      RECIPES,
    )
      .map(
        ([id, r]) =>
          `<button class="craft-card" data-craft="${id}" ${!game.creative && (!nearBench || !game.afford(r.cost)) ? "disabled" : ""}><i data-icon="${r.icon}"></i><strong>${r.name}</strong><small>${r.description}</small><span>${costText(r.cost)}</span><small>${r.ammo ? `持有 ${game.ammo[r.ammo] || 0} · 每次 +${r.amount}` : game.tools[id] ? `耐久 ${Math.ceil(game.tools[id].durability)}/${game.tools[id].maxDurability}` : "修理附近物品"}</small><strong>${!game.creative && !nearBench ? "需要靠近工作台" : !game.afford(r.cost) ? "材料不足" : "点击制作"}</strong></button>`,
      )
      .join(
        "",
      )}</div></div><div class="button-row">${game.global ? `<button id="reinforce-tent" class="subtle" ${game.activeTent() && game.player.score >= 100 ? "" : "disabled"}>100 积分延长帐篷 1 天</button>` : ""}<button id="eat-berry" class="subtle" ${!game.creative && game.inventory.berry < 1 ? "disabled" : ""}>食用浆果 · 恢复 40 生命</button></div>`,
    "INVENTORY",
  );
  const craftBox = $(".craft-box");
  const status = document.createElement("p");
  status.id = "craft-status"; status.setAttribute("role", "status");
  status.textContent = message || "选择配方制作；完成后会在这里显示结果。";
  craftBox.prepend(status);
  if ($("#upgrade"))
    $("#upgrade").onclick = () => {
      act("upgrade");
      events();
      save();
      openInventory();
    };
  $$("[data-craft]").forEach(
    (b) =>
      (b.onclick = () => {
        const recipe = b.dataset.craft;
        const success = act("craft", { recipe });
        events();
        save();
        const result = online && !online.host ? "制作请求已发送，等待房主确认…" : success ? `制作完成：${RECIPES[recipe].name}` : "制作失败，请检查材料和工作台距离";
        openInventory(result);
        $("#craft-status").scrollIntoView({block:"nearest"});
      }),
  );
  $("#eat-berry").onclick = () => {
    act("heal");
    events();
    save();
    openInventory();
  };
  if ($("#reinforce-tent"))
    $("#reinforce-tent").onclick = () => {
      act("reinforceTent");
      events();
      openInventory();
    };
}
function costText(cost) {
  return Object.entries(cost)
    .map(([k, n]) => `${ITEMS[k]} ${n}`)
    .join(" · ");
}
function openBuild() {
  $(".quickbar").hidden = true;
  setPanel(
    "在喜欢的地方，安家",
    `<p class="panel-intro">选择一种建筑，在身前的空地放置。${game.creative ? "当前为漫游模式，建造无需材料。" : "材料可以从岛屿中采集获得。"}</p><div class="build-grid">${Object.entries(
      BUILDS,
    )
      .map(
        ([type, b]) =>
          `<button class="build-card" data-build="${type}" ${game.afford(b.cost) ? "" : "disabled"}><i data-icon="${b.icon}"></i><small>${game.afford(b.cost) ? "可搭建" : "材料不足"}</small><h3>${b.name}</h3><p>${b.description}</p><span class="cost">${game.creative ? "自由建造" : costText(b.cost)}</span></button>`,
      )
      .join(
        "",
      )}</div><p class="panel-intro" style="font-size:12px;margin-top:20px;margin-bottom:0">帐篷可以设置重生点，也能从地图快速返回。每座岛最多放置 150 个建筑。</p>`,
    "MAKE IT YOURS",
  );
  const recycle = document.createElement("button");
  recycle.className = "subtle";
  recycle.textContent = "回收附近建筑";
  recycle.onclick = () => { act("recycle"); events(); save(); closePanel(); };
  $("#panel-content").append(recycle);
  const homeButton=document.createElement("button");homeButton.className="primary";homeButton.textContent="我的家园 · 管理与评分";homeButton.onclick=openHome;
  $("#panel-content").prepend(homeButton);
  const categories=document.createElement("div");categories.className="button-row";
  for(const [label,types] of [["营地",["fire","tent","workbench","fence","sailcart"]],["房屋",["floor","wall","door","roof","chest"]],["装饰",["lamp","planter","rug"]]]){
    const tab=document.createElement("button");tab.className="subtle";tab.textContent=label;
    tab.onclick=()=>{$$('[data-build]').forEach(b=>b.hidden=!types.includes(b.dataset.build));[...categories.children].forEach(el=>el.setAttribute("aria-pressed",String(el===tab)));};categories.append(tab);
  }
  $(".build-grid").before(categories);categories.children[1].click();
  const rotateHint=document.createElement("p");rotateHint.className="panel-intro";rotateHint.textContent="房屋先铺地板，再放墙、门和屋顶。模块自动对齐；放置时可旋转。";$("#panel-content").prepend(rotateHint);
  $$("[data-build]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedBuild = b.dataset.build;
        buildAngle = 0;
        view.setGhost(selectedBuild);
        $("#build-name").textContent = BUILDS[selectedBuild].name;
        $("#build-bar").hidden = false;
        closePanel();
        toast("移动调整位置，绿色表示可以放置。");
      }),
  );
}
function cancelBuild() {
  selectedBuild = null;
  buildPoint = null;
  view.setGhost(null);
  $("#build-bar").hidden = true;
}
function openHome() {
  const score=game.homeScore();
  const nearby=game.buildings.filter(b=>dist(b,game.player)<24).sort((a,b)=>dist(a,game.player)-dist(b,game.player));
  setPanel("我的家园",`<p class="panel-intro">附近 24 米 · 家园评分 ${score.score} · ${score.rooms} 间完整小屋 · ${score.variety} 种建筑。种类每种 10 分，完整房屋每间 25 分（最多 4 间），升级每级 3 分（最多 20 件）。</p><div class="button-row"><button id="home-photo" class="primary">保存营地预览</button><button id="home-build" class="subtle">继续建造</button></div><p id="home-feedback" role="status"></p><img id="home-preview" hidden alt="上次保存的营地画面" style="width:100%;max-width:360px;border-radius:12px"><div class="build-grid">${nearby.map(b=>`<button class="build-card" data-home-id="${escapeHtml(b.id)}"><h3>${BUILDS[b.type].name}</h3><p>${Math.ceil(dist(b,game.player))} 米 · ${game.ownsBuilding(b)?"我的建筑":"其他玩家"}</p><span>${b.level||1} 级 · 耐久 ${Math.ceil(b.durability)}/${b.maxDurability}</span></button>`).join("")||"<p>附近还没有建筑，先搭建一处营地。</p>"}</div>`,"HOME");
  $("#home-build").onclick=openBuild;
  const preview=$("#home-preview");
  try{const saved=localStorage.getItem("wildhaven-camp-preview");if(saved?.startsWith("data:image/jpeg;base64,")){preview.src=saved;preview.hidden=false;}}catch{}
  $("#home-photo").onclick=()=>{
    try {
      view.renderer.render(view.scene,view.camera);
      const canvas=document.createElement("canvas");canvas.width=480;canvas.height=270;
      canvas.getContext("2d").drawImage($("#world"),0,0,480,270);
      const data=canvas.toDataURL("image/jpeg",.7);localStorage.setItem("wildhaven-camp-preview",data);save();
      preview.src=data;preview.hidden=false;$("#home-feedback").textContent=online?"预览已保存在本机；联机世界由房主维护。":"营地预览与游戏进度已保存。";
    }catch{$("#home-feedback").textContent="保存预览失败，可能是本机存储空间不足。";}
  };
  $$('[data-home-id]').forEach(b=>b.onclick=()=>openBuilding(b.dataset.homeId));
}
function openBuilding(id, message="") {
  const b=game.buildings.find(b=>b.id===id);if(!b){openHome();return;}
  const usable=dist(b,game.player)<=4.5 && game.canUseBuilding(b),owner=game.ownsBuilding(b),level=b.level||1;
  setPanel(BUILDS[b.type].name,`<p class="panel-intro">${level} 级 · 耐久 ${Math.ceil(b.durability)}/${b.maxDurability} · 距离 ${Math.ceil(dist(b,game.player))} 米</p><p id="home-feedback" role="status">${escapeHtml(message||(!usable?"靠近建筑，并由主人授权后操作。":"选择下方操作。"))}</p>${b.type==="chest"?`<p>箱内 ${Object.values(b.storage||{}).reduce((a,v)=>a+v,0)}/200 · 每次存取 1 或 10 份材料</p><div class="home-storage">${Object.entries(ITEMS).map(([key,name])=>`<div><strong>${name}</strong><span>背包 ${game.inventory[key]||0} / 箱内 ${b.storage?.[key]||0}</span><div class="button-row">${[1,10].map(n=>`<button data-store="${key}" data-count="${n}" ${!usable||(game.inventory[key]||0)<n?"disabled":""}>存 ${n}</button><button data-take="${key}" data-count="${n}" ${!usable||(b.storage?.[key]||0)<n?"disabled":""}>取 ${n}</button>`).join("")}</div></div>`).join("")}</div>`:""}<div class="button-row">${b.type==="door"?`<button id="home-door" ${usable?"":"disabled"}>${b.open?"关门":"开门"}</button>`:""}${["floor","wall","door","roof"].includes(b.type)?`<button id="home-upgrade" ${usable&&owner&&level<3?"":"disabled"}>${level>=3?"已达强化 3 级":level===1?"升级石制 · 石材 8 木材 2":"升级强化 · 石材 12 晶石 4"}</button>`:""}<button id="home-recycle" ${usable&&owner?"":"disabled"}>回收建筑</button><button id="home-back">返回家园</button></div>${owner&&online?`<h3>授权队友</h3><p>允许指定队友操作这座建筑的门和箱子；升级和回收仍限主人。</p>${(online.peers||[]).filter(p=>p.id!==game.player.id).map(p=>`<button data-home-peer="${escapeHtml(p.id)}">${(b.guests||[]).includes(p.id)?"撤销授权":"允许使用"} · ${escapeHtml(p.name||p.id.slice(0,8))}</button>`).join("")}`:""}`,"HOME");
  const action=(operation,item,amount,peerId)=>{
    const ok=act("building",{buildingId:id,operation,item,amount,peerId});events();save();
    openBuilding(id,online&&!online.host?"请求已发送，等待同步…":ok?"操作完成":"操作未完成：检查距离、权限、材料；箱子需取空，地板需先拆除上方建筑。");
  };
  if($("#home-door"))$("#home-door").onclick=()=>action("door");
  if($("#home-upgrade"))$("#home-upgrade").onclick=()=>action("upgrade");
  $("#home-recycle").onclick=()=>action("recycle");$("#home-back").onclick=openHome;
  $$('[data-store]').forEach(el=>el.onclick=()=>action("store",el.dataset.store,Number(el.dataset.count)));
  $$('[data-take]').forEach(el=>el.onclick=()=>action("take",el.dataset.take,Number(el.dataset.count)));
  $$('[data-home-peer]').forEach(el=>el.onclick=()=>action("authorize",null,1,el.dataset.homePeer));
  $("#panel-content").dataset.buildingId=id;
  applyRoomSnapshot.homeSig=JSON.stringify([b,game.inventory]);
}
function placeBuild() {
  if (selectedBuild && buildPoint) {
    if (
      act("build", {
        buildType: selectedBuild,
        x: buildPoint.x,
        z: buildPoint.z,
        angle: buildAngle,
      })
    ) {
      if (!game.afford(BUILDS[selectedBuild].cost)) cancelBuild();
    }
    events();
  }
}
$("#place-build").onclick = placeBuild;
$("#rotate-building").onclick=()=>{buildAngle+=Math.PI/2;};
$("#cancel-build").onclick = cancelBuild;
function openJournal() {
  const n = game.shrines.filter(Boolean).length;
  const quests = [
    { done: game.won, title: currentQuest(game).title, text: currentQuest(game).detail },
    {
      done: game.stats.gathered >= 12,
      title: "一切，从双手开始",
      text: `累计采集 12 份资源（${Math.min(12, game.stats.gathered)}/12）。靠近树木、岩石或晶簇，交互来采集。`,
    },
    {
      done: game.stats.built > 0,
      title: "留下一处温暖",
      text: "建造你的第一座篝火或帐篷。篝火恢复生命；帐篷让你休息到清晨。",
    },
    {
      done: n === 3,
      title: "让微光，再次醒来",
      text: `唤醒三座遗迹（${n}/3）。每座需要 3 颗晶石。地图上的菱形是它们的位置。`,
    },
    {
      done: game.won,
      title: "风会记得你的名字",
      text: "唤醒全部遗迹后，前往岛心灯塔，击败苏醒的守望者。观察蓄力光圈，用闪避避开重击。",
    },
  ];
  setPanel(
    "岛屿手记",
    `<div class="stats-row"><div><strong>${game.discovered.length}/4</strong><span>发现的区域</span></div><div><strong>${game.stats.built}</strong><span>建造的建筑</span></div><div><strong>${Math.floor(game.elapsed / 60)}</strong><span>旅程分钟</span></div></div><div class="journey-list">${quests.map((q) => `<div class="journey-item ${q.done ? "complete" : ""}"><i>${q.done ? "✧" : "◇"}</i><div><h3>${q.title}</h3><p>${q.text}</p></div></div>`).join("")}</div><p class="panel-intro" style="margin-top:18px;margin-bottom:0;font-size:12px">没有必须遵循的顺序。你可以随时离开道路，去任何感兴趣的地方。</p>`,
    "YOUR JOURNEY",
  );
}
function openPause() {
  setPanel(
    "让风歇一会儿",
    `<p class="panel-intro">${online ? "联机时岛屿仍会继续运行。" : "世界已暂停。进度保存在本机。"}</p><div class="setting-row"><span>环境与音效</span><button id="setting-sound" class="subtle">${audio.enabled ? "已开启" : "已关闭"}</button></div><div class="setting-row"><span>画质</span><button id="setting-quality" class="subtle">${qualityName(view.quality)}</button></div><div class="setting-row"><span>版本更新</span><button id="check-update" class="subtle">检查更新</button></div><div class="setting-row"><span>全屏游玩</span><button id="setting-fullscreen" class="subtle">进入全屏</button></div><div class="help-grid"><span>移动 <kbd>WASD / 方向键</kbd></span><span>挥剑 <kbd>空格 / J</kbd></span><span>交互 · 采集 <kbd>E / 长按</kbd></span><span>闪避 <kbd>Shift</kbd></span><span>建造 <kbd>B</kbd><\/span><span>背包 <kbd>I</kbd></span></div><p class="panel-intro" style="font-size:12px">触屏：左侧摇杆移动，右侧按钮挥剑、闪避与交互。长按交互持续采集。</p><div class="button-row"><button id="resume" class="primary">回到岛屿</button><button id="return-home" class="subtle">返回最近的营地</button><button id="save-exit" class="subtle">保存并返回标题</button></div>`,
    "TAKE A BREATH",
  );
  save();
  $("#resume").onclick = closePanel;
  $("#setting-sound").onclick = async () => {
    audio.setPaused(false);
    await audio.toggle();
    audio.setPaused(true);
    settings.sound = audio.enabled;
    saveSettings();
    $("#setting-sound").textContent = audio.enabled ? "已开启" : "已关闭";
    $("#sound").innerHTML = icon(audio.enabled ? "volume" : "muted");
  };
  $("#setting-quality").onclick = () => {
    const list = ["high", "balanced", "low"];
    let q = list[(list.indexOf(view.quality) + 1) % 3];
    view.setQuality(q);
    settings.quality = q;
    saveSettings();
    $("#setting-quality").textContent = qualityName(q);
  };
  $("#setting-fullscreen").onclick = fullScreen;
  $("#check-update").onclick = checkForUpdate;
  $("#return-home").onclick = () => {
    if (travel(game.home)) {
      closePanel();
      toast("已回到最近休息过的营地。", "good");
    }
  };
  $("#save-exit").onclick = () => {
    if (online) {
      leaveOnline();
      return;
    }
    save();
    closePanel();
    started = false;
    $("#hud").hidden = true;
    $("#welcome").hidden = false;
    $("#continue").hidden = false;
    $("#continue").textContent = "继续上次的旅程 →";
    cancelBuild();
    audio.setPaused(true);
  };
}
function qualityName(q) {
  return { high: "高清", balanced: "均衡", low: "流畅" }[q] || "高清";
}
async function checkForUpdate() {
  const button=$("#check-update");
  button.disabled=true; button.textContent="正在检查…";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response=await fetch("https://api.github.com/repos/schlapiadeziel-rgb/-Wildhaven/releases/latest",{signal:controller.signal,headers:{Accept:"application/vnd.github+json"}});
    if(!response.ok) throw new Error("更新服务暂时不可用");
    const release=await response.json();
    const apk=release.assets?.find(a=>/^Wildhaven-v\d+\.apk$/.test(a.name));
    const build=Number(apk?.name?.match(/^Wildhaven-v(\d+)\.apk$/)?.[1]);
    const current=globalThis.WildhavenLink?.appVersionCode?.() || 0;
    if(release.draft||release.prerelease||!Number.isFinite(build)) throw new Error("暂未找到正式安装包");
    if(build<=current) { button.textContent="已是最新版本"; toast("霁野已是最新版本。", "good"); return; }
    button.textContent="下载新版 "+release.tag_name;
    button.disabled=false;
    button.onclick=()=> { if(globalThis.WildhavenLink) WildhavenLink.openUpdate(apk.browser_download_url); else location.href=apk.browser_download_url; };
    toast("发现新版 "+release.tag_name+"，点击“下载新版”更新。", "good");
  } catch(e) { button.textContent=e.name === "AbortError" ? "连接超时，点击重试" : "检查失败，点击重试"; button.title=e.message; }
  finally { clearTimeout(timeout); button.disabled=false; }
}
function travel(point) {
  if (
    game.world.enemies.some(
      (e) =>
        !e.dead &&
        (!e.boss || game.shrines.every(Boolean)) &&
        dist(e, game.player) < 13,
    ) &&
    !game.creative
  ) {
    toast("附近有敌人，先离开战斗再返回营地。", "bad");
    return false;
  }
  game.player.x = point.x;
  game.player.z = point.z;
  game.player.invulnerable = 2;
  if (online) online.teleport = true;
  view.follow.set(point.x, height(point.x, point.z), point.z);
  clearInput();
  save();
  return true;
}
function makeMap() {
  const c = document.createElement("canvas");
  c.width = c.height = 480;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(240, 240);
  for (let y = 0; y < 240; y++)
    for (let x = 0; x < 240; x++) {
      const wx = (x / 240 - 0.5) * 220,
        wz = (y / 240 - 0.5) * 220,
        h = height(wx, wz),
        b = biome(wx, wz);
      let rgb =
        h < 0
          ? [34, 70, 75]
          : h < 1
            ? [166, 173, 138]
            : b.id === "frost"
              ? [140, 166, 160]
              : b.id === "amber"
                ? [155, 151, 105]
                : b.id === "forest"
                  ? [66, 112, 90]
                  : [106, 147, 113];
      let v = h > 0 ? 0.84 + Math.min(h, 10) * 0.022 : 1;
      const j = (y * 240 + x) * 4;
      img.data[j] = rgb[0] * v;
      img.data[j + 1] = rgb[1] * v;
      img.data[j + 2] = rgb[2] * v;
      img.data[j + 3] = 255;
    }
  const temp = document.createElement("canvas");
  temp.width = temp.height = 240;
  temp.getContext("2d").putImageData(img, 0, 0);
  ctx.drawImage(temp, 0, 0, 480, 480);
  ctx.strokeStyle = "#bdd7bd13";
  ctx.lineWidth = 1;
  for (let k = 1; k < 8; k++) {
    let n = k * 60;
    ctx.beginPath();
    ctx.moveTo(n, 0);
    ctx.lineTo(n, 480);
    ctx.moveTo(0, n);
    ctx.lineTo(480, n);
    ctx.stroke();
  }
  return c;
}
function drawMap(canvas, full = false) {
  if (!terrainMap) return;
  const ctx = canvas.getContext("2d"),
    w = canvas.width;
  ctx.clearRect(0, 0, w, w);
  ctx.drawImage(terrainMap, 0, 0, w, w);
  const map = (p) => ({ x: (p.x / 220 + 0.5) * w, y: (p.z / 220 + 0.5) * w });
  if (full) {
    ctx.font = `${w * 0.024}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#d4dfc595";
    for (const l of [
      { x: -54, z: 2, text: "森语密林" },
      { x: 37, z: -60, text: "霜落高地" },
      { x: 60, z: 28, text: "琥珀林地" },
      { x: -10, z: 53, text: "风眠草甸" },
    ]) {
      let p = map(l);
      ctx.fillText(l.text, p.x, p.y);
    }
    for (const n of game.world.nodes) {
      if (n.type !== "crystal" || n.down) continue;
      const p = map(n);
      ctx.fillStyle = "#a1e5d0a0";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  SHRINES.forEach((s, i) => {
    let p = map(s),
      r = full ? 5 : 4;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = game.shrines[i] ? "#d6e6a9" : "#8dab94";
    ctx.strokeStyle = "#edf0c7";
    ctx.lineWidth = 1.5;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    if (full) {
      ctx.font = `${w * 0.021}px sans-serif`;
      ctx.fillStyle = "#e7e6c6";
      ctx.textAlign = "center";
      ctx.fillText(s.name, p.x, p.y + 19);
    }
  });
  for (const b of game.buildings) {
    if (b.type !== "tent") continue;
    const p = map(b);
    ctx.fillStyle = "#e4d7b1";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 5);
    ctx.lineTo(p.x + 5, p.y + 4);
    ctx.lineTo(p.x - 5, p.y + 4);
    ctx.closePath();
    ctx.fill();
  }
  const bp = map(BEACON);
  ctx.strokeStyle = game.won ? "#f7e8b3" : "#d7b59a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bp.x, bp.y, full ? 6 : 4.5, 0, Math.PI * 2);
  ctx.stroke();
  if (full) {
    ctx.font = `${w * 0.021}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#e3d9bb";
    ctx.fillText(game.won ? "重燃的灯塔" : "古老灯塔", bp.x, bp.y - 13);
  }
  const p = map(game.player);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-game.player.angle);
  ctx.fillStyle = "#fff4c4";
  ctx.strokeStyle = "#263f3c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.lineTo(-4, -4);
  ctx.lineTo(0, -2);
  ctx.lineTo(4, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#f4e6b080";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
  ctx.stroke();
}
function openMap() {
  setPanel(
    "风会带你去哪里",
    `<p class="panel-intro">菱形标记古迹，三角标记帐篷。点击地图上的帐篷即可返回；战斗中无法传送。</p><div class="map-full-wrap"><canvas id="full-map" class="map-full" width="720" height="720" aria-label="岛屿地图，点击帐篷快速旅行"></canvas></div><div class="map-legend"><span><i>◇</i>遗迹</span><span><i>△</i>营地</span><span><i>○</i>灯塔</span><span><i>·</i>晶簇</span></div>`,
    "THE ISLAND",
  );
  drawMap($("#full-map"), true);
  $("#full-map").onclick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect(),
      x = ((e.clientX - rect.left) / rect.width - 0.5) * 220,
      z = ((e.clientY - rect.top) / rect.height - 0.5) * 220;
    const tents = game.buildings.filter((b) => b.type === "tent");
    const b = tents.find((b) => Math.hypot(b.x - x, b.z - z) < 7);
    if (b && travel({ x: b.x, z: b.z - 4 })) {
      closePanel();
      toast("已回到帐篷旁。", "good");
    }
  };
}
function openVictory() {
  setPanel(
    "光，又回到了这座岛",
    `<div class="victory-symbol">✧</div><p class="victory-copy">你让霁野，重新醒来。</p><p class="panel-intro" style="text-align:center">遗迹的光连成了星河，守望者终于安睡。<br>你的旅程可以继续，岛屿仍有许多风景等着你。</p><div class="stats-row"><div><strong>${game.discovered.length}/4</strong><span>发现的区域</span></div><div><strong>${game.stats.kills}</strong><span>击败的守卫</span></div><div><strong>${Math.floor(game.elapsed / 60)}</strong><span>旅程分钟</span></div></div><div class="button-row" style="justify-content:center"><button id="continue-world" class="primary">继续自由探索</button><button id="victory-map" class="subtle">看看我的岛屿</button></div>`,
    "THE LIGHT RETURNS",
  );
  $("#continue-world").onclick = closePanel;
  $("#victory-map").onclick = openMap;
}
function hudUpdate() {
  if (!started) return;
  const p = game.player;
  $("#health-text").textContent = game.creative
    ? "自由漫游"
    : `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $("#health-fill").style.width = `${(p.hp / p.maxHp) * 100}%`;
  $("#stamina-fill").style.width = `${p.stamina}%`;
  $("#level").textContent = `旅人 · Lv.${p.level}`;
  for (const k of ["wood", "stone", "crystal"])
    $(`#${k}-count`).textContent = game.creative ? "∞" : game.inventory[k];
  $("#berry-label").textContent =
    `浆果 ${game.creative ? "∞" : game.inventory.berry}`;
  $("#arrow-label").textContent = `远距离弓 · 箭 ${game.ammo.arrow}`;
  $("#cell-label").textContent = `快速手枪 · 弹 ${game.ammo.cell}`;
  $("#shell-label").textContent = `近战喷子 · 弹 ${game.ammo.shell}`;
  $("#biome").textContent = biome(p.x, p.z).name;
  const hr = ((game.clock % 720) / 720) * 24,
    h = Math.floor(hr),
    m = Math.floor((hr % 1) * 60);
  $("#time").textContent =
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  $("#time-icon").textContent = h >= 6 && h < 18 ? "☀" : "☾";
  $("#weather-label").textContent =
    h >= 6 && h < 18 ? "晴空 · 微风" : "星夜 · 静谧";
  $("#day").textContent = `第 ${Math.floor(game.clock / 720) + 1} 天`;
  const n = game.shrines.filter(Boolean).length;
  $("#quest-progress").textContent = `${n} / 3`;
  $$("#quest-dots i").forEach((e, i) =>
    e.classList.toggle("lit", game.shrines[i]),
  );
  const objective = currentQuest(game);
  $("#quest-title").textContent = objective.title;
  const target = objective.target;
  const directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const bearing = target ? directions[(Math.round(Math.atan2(target.x-p.x, p.z-target.z)/(Math.PI/4))+8)%8] : "";
  $("#quest-description").textContent = target ? `${bearing} · ${Math.ceil(dist(p,target))} 米` : objective.detail;
  const status = $("#global-status");
  status.hidden = !game.global;
  if (game.global) {
    $("#score-count").textContent = p.score || 0;
    const tent = game.activeTent();
    if (tent) {
      const left = Math.max(0, tent.expiresAt - Date.now()),
        d = Math.floor(left / 86400000),
        hh = Math.floor(left / 3600000) % 24,
        mm = Math.floor(left / 60000) % 60;
      $("#tent-timer").textContent =
        `帐篷 ${d}天${String(hh).padStart(2, "0")}时${String(mm).padStart(2, "0")}分`;
    } else $("#tent-timer").textContent = "未建帐篷";
  }
  const near = game.nearest();
  const contextual = nearbyAction();
  const interaction = $("#touch-interact");
  interaction.hidden = !contextual || !!selectedBuild;
  if (contextual) interaction.querySelector("small").textContent = contextual.label;
  const ammoKey = {bow:"arrow",pistol:"cell",shotgun:"shell"}[tool];
  $("#dock-weapon").textContent = ({sword:"剑",gather:"采集",bow:"弓",pistol:"手枪",shotgun:"喷子"}[tool] || "武器") + (ammoKey ? " · " + (game.ammo[ammoKey] || 0) : "") + " ▴";
  $("#interact-hint").hidden = !near || !!selectedBuild;
  if (near) $("#interact-hint span").textContent = near.label;
  const boss = game.world.enemies.find((e) => e.boss),
    bh = $("#boss-hud");
  bh.hidden = game.won || n !== 3 || dist(boss, p) > 31;
  if (!bh.hidden)
    bh.querySelector("i").style.width =
      `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
}
function nearbyAction() {
  const building=game.buildings.filter(b=>["door","chest"].includes(b.type)&&dist(b,game.player)<3.5).sort((a,b)=>dist(a,game.player)-dist(b,game.player))[0];
  if(building) return {type:"home",label:building.type==="door"?"门":"箱子",id:building.id};
  if (game.player.mounted) return {type:"mount",label:"下车"};
  if (game.buildings.some(b=>BUILDS[b.type]?.vehicle && b.durability>0 && dist(b,game.player)<3)) return {type:"mount",label:"上车"};
  if (game.workbenchNearby()) return {type:"workbench",label:"制作"};
  const n=game.nearest();
  if (n?.kind === "node") return {type:"interact",label:"采集"};
  if (n?.kind === "tent") return {type:"interact",label:"休息"};
  if (n?.kind === "shrine") return {type:"interact",label:"唤醒"};
  return null;
}
$("#dock-weapon").onclick = () => {
  const bar=$(".quickbar"); bar.hidden=!bar.hidden;
  $$(".quick-group").forEach(g=>g.hidden=g.dataset.label!=="武器");
  let axeButton = $("#quick-axe");
  if (!axeButton) {
    axeButton = document.createElement("button"); axeButton.id="quick-axe";
    axeButton.onclick=()=>{equip("gather");bar.hidden=true;};
    $('.quick-group[data-label="武器"]').append(axeButton);
  }
  axeButton.textContent=`石斧 ${Math.ceil(game.tools.axe.durability)}`;
  axeButton.disabled=game.tools.axe.durability<=0;
};
$("#dock-build").onclick = openBuild;
$("#dock-bag").onclick = openInventory;
$$('[data-weapon]').forEach(b=>{ b.querySelector('i').innerHTML=icon(b.dataset.weapon); b.setAttribute('aria-label', {bow:'弓',pistol:'手枪',shotgun:'喷子'}[b.dataset.weapon]); });
$("#pause").onclick = () => {
  openPause();
  const row=document.createElement('div'); row.className='button-row';
  for (const [label,id] of [['镜头左转','rotate-left'],['镜头右转','rotate-right'],['拉近','zoom-in'],['拉远','zoom-out']]) {
    const b=document.createElement('button'); b.className='subtle'; b.textContent=label; b.onclick=()=>$('#'+id).click(); row.append(b);
  }
  $('#panel-content').append(row);
};
$("#journal").onclick = openJournal;
$("#map-button").onclick = openMap;
$("#sound").onclick = async () => {
  await audio.toggle();
  settings.sound = audio.enabled;
  saveSettings();
  $("#sound").innerHTML = icon(audio.enabled ? "volume" : "muted");
};
function equip(t) {
  tool = t;
  game.player.equipped = t === "gather" && game.tools.axe.durability > 0 ? "axe" : ["bow", "pistol", "shotgun"].includes(t) ? t : "sword";
  $$(".quickbar [data-action]").forEach((b) =>
    b.classList.toggle(
      "active",
      b.dataset.action ===
        (tool === "gather"
          ? "interact"
          : tool === "sword"
            ? "sword"
            : "ranged") &&
        (!b.dataset.weapon || b.dataset.weapon === tool),
    ),
  );
  toast(
    tool === "gather"
      ? "已装备采集工具"
      : tool === "sword"
        ? "已装备星铁剑"
        : `已装备${RECIPES[tool].name} · 按攻击键开火`,
    "good",
  );
}
$$("[data-action]").forEach(
  (b) =>
    (b.onclick = () => {
      switch (b.dataset.action) {
        case "sword":
          equip("sword");
          break;
        case "interact":
          equip("gather");
          if (game.nearest()) act("interact");
          break;
        case "ranged":
          equip(b.dataset.weapon);
          break;
        case "build":
          openBuild();
          break;
        case "mount":
          act("mount");
          break;
        case "inventory":
          openInventory();
          break;
        case "recycle":
          act("recycle");
          break;
        case "heal":
          act("heal");
          break;
      }
      events();
      $(".quickbar").hidden = true;
    }),
);
$("#rotate-left").onclick = () => {
  view.angle -= Math.PI / 4;
};
$("#rotate-right").onclick = () => {
  view.angle += Math.PI / 4;
};
$("#zoom-in").onclick = () => {
  view.targetZoom = clamp(view.targetZoom - 5, 20, 60);
};
$("#zoom-out").onclick = () => {
  view.targetZoom = clamp(view.targetZoom + 5, 20, 60);
};
window.addEventListener("keydown", (e) => {
  if (!started) return;
  if (e.code === "Escape") {
    if (selectedBuild) {
      cancelBuild();
      e.preventDefault();
      return;
    }
    if (!$("#panel").open) {
      openPause();
      e.preventDefault();
    }
    return;
  }
  if (paused) return;
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  switch (e.code) {
    case "KeyE":
      act("mount");
      break;
    case "Space":
    case "KeyJ":
      act("attack");
      break;
    case "ShiftLeft":
    case "ShiftRight": {
      const v = getMovement();
      act("dash", v);
      break;
    }
    case "KeyB":
      openBuild();
      break;
    case "KeyI":
      openInventory();
      break;
    case "KeyM":
      openMap();
      break;
    case "KeyQ":
      act("heal");
      break;
    case "KeyF":
      act("mount");
      break;
    case "KeyX":
      act("recycle");
      break;
    case "KeyR":
      buildAngle += Math.PI / 4;
      break;
    case "Digit1":
      equip("sword");
      break;
    case "Digit2":
      equip("gather");
      break;
    case "Digit3":
      equip("bow");
      break;
    case "Digit4":
      equip("pistol");
      break;
    case "Digit5":
      equip("shotgun");
      break;
    case "Enter":
      if (selectedBuild) placeBuild();
      break;
  }
  events();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
function getMovement() {
  let x =
      stick.x +
      (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
    z =
      stick.y +
      (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
      (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
  let len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return {
    x: x * Math.cos(view.angle) + z * Math.sin(view.angle),
    z: -x * Math.sin(view.angle) + z * Math.cos(view.angle),
  };
}
let stickId = null;
const joystick = $("#joystick");
function moveStick(e) {
  if (e.pointerId !== stickId) return;
  const r = joystick.getBoundingClientRect(),
    dx = e.clientX - r.left - r.width / 2,
    dy = e.clientY - r.top - r.height / 2,
    max = r.width * 0.33,
    len = Math.hypot(dx, dy),
    f = len > max ? max / len : 1;
  $("#joystick-knob").style.transform = `translate(${dx * f}px,${dy * f}px)`;
  stick = {
    x: Math.abs(dx / max) > 0.08 ? clamp(dx / max, -1, 1) : 0,
    y: Math.abs(dy / max) > 0.08 ? clamp(dy / max, -1, 1) : 0,
  };
  destination = null;
  attackTarget = gatherTarget = null;
  e.preventDefault();
}
joystick.addEventListener("pointerdown", (e) => {
  if (!started || paused) return;
  stickId = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  moveStick(e);
});
joystick.addEventListener("pointermove", moveStick);
function stopStick(e) {
  if (e.pointerId !== stickId) return;
  stickId = null;
  stick = { x: 0, y: 0 };
  $("#joystick-knob").style.transform = "";
}
joystick.addEventListener("pointerup", stopStick);
joystick.addEventListener("pointercancel", stopStick);
joystick.addEventListener("lostpointercapture", stopStick);
function holdButton(id, onStart, onEnd) {
  const b = $(id);
  b.addEventListener("pointerdown", (e) => {
    if (paused || !started) return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    onStart();
    events();
  });
  b.addEventListener("pointerup", onEnd);
  b.addEventListener("pointercancel", onEnd);
  b.addEventListener("lostpointercapture", onEnd);
}
holdButton(
  "#touch-attack",
  () => {
    holdingAttack = true;
    act("attack");
  },
  () => (holdingAttack = false),
);
holdButton(
  "#touch-interact",
  () => {
    const action = nearbyAction();
    if (action?.type === "home") { openBuilding(action.id); }
    else if (action?.type === "workbench") {
      openInventory();
      $("#panel-title").textContent = "工作台 · 制作";
      $(".craft-box")?.scrollIntoView({block:"start"});
    } else if (action) { act(action.type); events(); }
  },
  () => {},
);
holdButton(
  "#touch-dash",
  () => {
    const v = getMovement();
    act("dash", v);
  },
  () => {},
);
let pointerStart = null;
$("#world").addEventListener("contextmenu", (e) => e.preventDefault());
$("#world").addEventListener("pointerdown", (e) => {
  if (!started || paused) return;
  pointerStart = {
    x: e.clientX,
    y: e.clientY,
    button: e.button,
    id: e.pointerId,
    lastX: e.clientX,
  };
  $("#world").setPointerCapture(e.pointerId);
});
$("#world").addEventListener("pointermove", (e) => {
  if (
    pointerStart &&
    pointerStart.id === e.pointerId &&
    pointerStart.button === 2
  ) {
    view.angle -= (e.clientX - pointerStart.lastX) * 0.008;
    pointerStart.lastX = e.clientX;
  }
});
$("#world").addEventListener("pointerup", (e) => {
  if (!pointerStart || pointerStart.id !== e.pointerId) return;
  const drag = Math.hypot(
      e.clientX - pointerStart.x,
      e.clientY - pointerStart.y,
    ),
    button = pointerStart.button;
  pointerStart = null;
  if (drag > 10 || button === 2 || !started || paused) return;
  const p = view.worldPoint(e.clientX, e.clientY);
  if (!p || height(p.x, p.z) < -0.5) return;
  if (selectedBuild) {
    const dx = p.x - game.player.x,
      dz = p.z - game.player.z;
    game.player.angle = Math.atan2(dx, dz);
    buildPoint = {
      x: game.player.x + Math.sin(game.player.angle) * 4.4,
      z: game.player.z + Math.cos(game.player.angle) * 4.4,
    };
    placeBuild();
    return;
  }
  if (!matchMedia("(pointer:coarse)").matches) {
    game.player.angle = Math.atan2(p.x - game.player.x, p.z - game.player.z);
    act("attack");
    events();
    return;
  }
  destination = { x: p.x, z: p.z };
  attackTarget = null;
  gatherTarget = null;
  let nearEnemy = game.world.enemies.find(
    (n) =>
      !n.dead &&
      (!n.boss || game.shrines.every(Boolean)) &&
      Math.hypot(n.x - p.x, n.z - p.z) < 2,
  );
  if (nearEnemy) {
    attackTarget = nearEnemy;
    destination = nearEnemy;
  } else if (tool === "gather") {
    let n = game.world.nodes.find(
      (n) => !n.down && Math.hypot(n.x - p.x, n.z - p.z) < 2,
    );
    if (n) {
      gatherTarget = n;
      destination = n;
    }
  }
  view.showTarget(p.x, p.z);
});
$("#world").addEventListener("pointercancel", () => (pointerStart = null));
$("#world").addEventListener(
  "wheel",
  (e) => {
    if (!started || paused) return;
    e.preventDefault();
    view.targetZoom = clamp(view.targetZoom + e.deltaY * 0.025, 20, 60);
  },
  { passive: false },
);
window.addEventListener("resize", () => view?.resize());
window.addEventListener("orientationchange", () =>
  setTimeout(() => view?.resize(), 250),
);
window.addEventListener("blur", () => {
  clearInput();
  if (started && !paused) openPause();
});
document.addEventListener("visibilitychange", () => {
  backgrounded = document.hidden;
  if (backgrounded) {
    save();
    clearInput();
    audio.setPaused(true);
    if (started && !paused) openPause();
  } else lastFrame = performance.now();
});
window.addEventListener("pagehide", save);
$("#world").addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  save();
  paused = true;
  $("#fatal-message").textContent =
    "设备暂时中断了图形渲染。进度已尝试保存，请重新加载后继续旅程，并在设置中切换到流畅画质。";
  $("#fatal").hidden = false;
});
function tick(now) {
  requestAnimationFrame(tick);
  if (!view || backgrounded) return;
  const dt = Math.min((now - lastFrame) / 1000, 0.045);
  lastFrame = now;
  if (started && (!paused || online)) {
    let movement = paused ? { x: 0, z: 0 } : getMovement();
    if (Math.hypot(movement.x, movement.z) > 0.05) {
      destination = null;
      attackTarget = gatherTarget = null;
    } else if (destination) {
      let dx = destination.x - game.player.x,
        dz = destination.z - game.player.z,
        d = Math.hypot(dx, dz),
        stop = attackTarget ? 3.2 : gatherTarget ? 2.6 : 0.6;
      if (attackTarget?.dead || gatherTarget?.down) {
        destination = null;
        attackTarget = gatherTarget = null;
      } else if (d > stop) {
        movement = { x: dx / (d || 1), z: dz / (d || 1) };
      } else {
        if (attackTarget) act("attack");
        else if (gatherTarget) {
          act("interact");
        } else destination = null;
      }
    }
    if (!paused && (holdingAttack || keys.has("Space") || keys.has("KeyJ")))
      act("attack");
    game.update(dt, movement);
    if (selectedBuild) {
      buildPoint = {
        x: game.player.x + Math.sin(game.player.angle) * 4.4,
        z: game.player.z + Math.cos(game.player.angle) * 4.4,
      };
        buildPoint = game.snapBuild(
          selectedBuild,
          buildPoint.x,
          buildPoint.z,
          buildAngle,
        );
      const valid =
        game.canBuild(selectedBuild, buildPoint.x, buildPoint.z, buildPoint.angle) &&
        game.afford(BUILDS[selectedBuild].cost);
      view.updateGhost(
        buildPoint.x,
        buildPoint.z,
        buildPoint.angle,
        valid,
      );
      $("#place-build").disabled = !valid;
    }
    events();
    saveTimer += dt;
    if (saveTimer > 8) {
      saveTimer = 0;
      save();
    }
    hudTimer += dt;
    mapTimer += dt;
    if (hudTimer > 0.13) {
      hudTimer = 0;
      hudUpdate();
    }
    if (mapTimer > 0.3) {
      mapTimer = 0;
      drawMap($("#minimap"));
    }
  }
  for(const b of game.buildings) if(BUILDS[b.type]?.home) view.addBuilding(b);
  if (!paused || online) view.update(dt, started);
}
async function init() {
  try {
    const mod = await import("./scene.js");
    ViewClass = mod.WorldView;
    view = new ViewClass($("#world"), game);
    if (settings.quality) view.setQuality(settings.quality);
    terrainMap = makeMap();
    const boss = document.createElement("div");
    boss.className = "boss-hud";
    boss.id = "boss-hud";
    boss.hidden = true;
    boss.innerHTML = "<strong>遗迹守望者</strong><div><i></i></div>";
    $("#hud").append(boss);
    $("#loading").hidden = true;
    $("#welcome").hidden = false;
    $("#continue").hidden = !saveData;
    if (saveData)
      $("#continue").textContent =
        `继续旅程 · Lv.${saveData.player.level} · ${Math.floor(saveData.elapsed / 60)} 分钟 →`;
    lastFrame = performance.now();
    requestAnimationFrame(tick);
    if (new URLSearchParams(location.search).has("room")) openOnline();
  } catch (e) {
    console.error(e);
    $("#loading").hidden = true;
    $("#fatal-message").textContent =
      "这台设备没有成功启动三维画面。请使用支持 WebGL 的新版浏览器打开，或关闭其他占用较高的页面后重试。";
    $("#fatal").hidden = false;
  }
}
init();

// Cooperative rooms use a single elected simulation host and durable shared snapshots.
const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function directAction(type, a = {}) {
  switch (type) {
    case "building":
      game.homePeerIds=online?.peers?.map(p=>p.id)||[];
      return game.buildingAction(a.buildingId,a.operation,a.item,a.amount,a.peerId);
    case "attack":
      game.attack();
      return true;
    case "ranged":
      return game.rangedAttack(a.weapon);
    case "interact":
      game.interact();
      return true;
    case "heal":
      game.heal();
      return true;
    case "upgrade":
      game.upgrade();
      return true;
    case "craft":
      return game.craft(a.recipe);
    case "recycle":
      return game.recycleNearest();
    case "mount":
      return game.mountNearest();
    case "reinforceTent":
      return game.reinforceTent();
    case "dash":
      return game.dash(a.x || 0, a.z || 0);
    case "build":
      return game.build(a.buildType, a.x, a.z, a.angle);
  }
}
function act(type, a = {}) {
  if (type === "attack" && tool === "gather") type = "interact";
  if (type === "attack" && ["bow", "pistol", "shotgun"].includes(tool)) {
    type = "ranged";
    a = { ...a, weapon: tool };
  }
  if (!online || online.host) return directAction(type, a);
  if (!online.connected) return false;
  const p = game.player;
  if (type === "attack") {
    if (p.attackCD > 0 || p.dash > 0) return false;
    p.attack = 0.3;
    p.attackCD = 0.42;
    view.handle({ type: "swing", x: p.x, z: p.z, angle: p.angle, combo: 0 });
    audio.play("swing");
  }
  if (type === "ranged") {
    if (p.attackCD > 0 || p.dash > 0) return false;
    p.attack = 0.25;
    p.attackCD = tool === "pistol" ? 0.3 : tool === "shotgun" ? 0.7 : 0.72;
    view.handle({
      type: "aurora-aim",
      x: p.x,
      z: p.z,
      angle: p.angle,
      range: tool === "bow" ? 24 : tool === "pistol" ? 19 : 10,
      kind: tool,
    });
    audio.play("aurora-aim");
  }
  if (type === "interact") {
    if (game.gatherCD > 0) return false;
    game.gatherCD = 0.46;
    p.attack = 0.25;
  }
  if (type === "dash") {
    if (!game.dash(a.x || 0, a.z || 0)) return false;
  }
  return online.action(type, a);
}
function roomSnapshot() {
  const actors = { [online.info.playerId]: { ...game.player } };
  for (const [id, p] of remoteActors) actors[id] = { ...p };
  return {
    game: game.snapshot(),
    enemies: game.world.enemies.map((e) => ({ ...e })),
    actors,
  };
}
function applyRoomSnapshot(snapshot) {
  if (!snapshot?.game) return;
  if (online) online.latestSnapshot = snapshot;
  const saved = snapshot.game;
  game.inventory = { ...saved.inventory };
  game.ammo = { ...game.ammo, ...saved.ammo };
  for (const k of Object.keys(game.tools))
    if (saved.tools?.[k])
      game.tools[k] = { ...game.tools[k], ...saved.tools[k] };
  game.buildings = saved.buildings;
  for (const b of game.buildings) view.addBuilding(b);
  for(const id of view.buildingMeshes.keys())if(!game.buildings.some(b=>b.id===id))view.removeBuilding(id);
  const down = new Set(saved.nodes);
  for (const n of game.world.nodes) {
    if (down.has(n.id) && !n.down) {
      n.down = true;
      n.hp = 0;
      view.nodeDown(n.id);
      view.burst(n.x, n.z, n.type === "crystal" ? 0xbdebd1 : 0xc6d7b3, 8);
    }
  }
  for (let i = 0; i < 3; i++) {
    if (saved.shrines[i] && !game.shrines[i]) {
      view.handle({ type: "shrine", index: i });
      audio.play("shrine");
      toast(`${SHRINES[i].name}已被点亮`, "good");
    }
  }
  game.shrines = [...saved.shrines];
  game.stats = { ...saved.stats };
  game.clock = saved.clock;
  const wasWon = game.won;
  game.won = saved.won;
  for (const e of snapshot.enemies || []) {
    const local = game.world.enemies.find((v) => v.id === e.id);
    if (local) {
      if (!local.dead && e.dead)
        view.burst(e.x, e.z, 0xdfd9ab, e.boss ? 45 : 14);
      Object.assign(local, e);
    }
  }
  const mine = snapshot.actors?.[online.info.playerId];
  if (mine) {
    const p = game.player,
      oldHp = p.hp;
    for (const k of ["hp", "maxHp", "xp", "level", "weapon", "score"])
      if (Number.isFinite(mine[k])) p[k] = mine[k];
    p.tentId = typeof mine.tentId === "string" ? mine.tentId : null;
    if (p.hp < oldHp) view.handle({ type: "damage", amount: oldHp - p.hp });
    if ((mine.respawns || 0) > lastRespawns) {
      lastRespawns = mine.respawns;
      p.x = mine.x;
      p.z = mine.z;
      p.invulnerable = 4;
      online.teleport = true;
      clearInput();
      view.follow.set(p.x, height(p.x, p.z), p.z);
      toast("你在营地醒来，物品都还在。", "good");
    }
  }
  if (online.host) {
    for (const [id, p] of Object.entries(snapshot.actors || {}))
      if (id !== online.info.playerId)
        remoteActors.set(id, { ...new Game().player, ...p });
    game.remotePlayers = [...remoteActors.values()];
  }
  view.syncAll();
  if (game.won && !wasWon) {
    audio.play("victory");
    setTimeout(openVictory, 1000);
  }
  hudUpdate();
  const openId=$("#panel-content").dataset.buildingId;
  if($("#panel").open&&openId){const b=game.buildings.find(b=>b.id===openId),sig=JSON.stringify([b,game.inventory]);if(sig!==applyRoomSnapshot.homeSig){applyRoomSnapshot.homeSig=sig;openBuilding(openId,"建筑和物品已同步。");}}
  if ($("#panel").open && $("#panel-title").textContent === "随身行囊") {
    const signature = JSON.stringify([game.inventory, game.tools, game.ammo, game.player.weapon]);
    if (signature !== applyRoomSnapshot.inventorySig) {
      applyRoomSnapshot.inventorySig = signature;
      openInventory("物品数量和耐久已同步，见下方配方。");
    }
  }
}
function updateRoomPeers(peers) {
  if (!online) return;
  if (online.host) {
    const active = new Set();
    for (const peer of peers) {
      if (peer.id === online.info.playerId) continue;
      active.add(peer.id);
      let actor = remoteActors.get(peer.id);
      if (!actor) {
        actor = {
          ...new Game().player,
          ...peer.position,
          id: peer.id,
          gatherCD: 0,
        };
        remoteActors.set(peer.id, actor);
      }
      Object.assign(actor, peer.position);
      actor.id = peer.id;
    }
    for (const id of remoteActors.keys())
      if (!active.has(id)) remoteActors.delete(id);
    game.remotePlayers = [...remoteActors.values()];
  }
  view.updatePeers(peers, online.info.playerId);
  if ($("#panel").open && $("#panel-title").textContent === "与朋友同行")
    renderPartyList();
}
function remoteAction(e) {
  if (!online?.host || e.playerId === online.info.playerId) return;
  const actor = remoteActors.get(e.playerId);
  if (!actor) return;
  Object.assign(actor, e.position);
  const old = game.player,
    gcd = game.gatherCD;
  game.player = actor;
  game.gatherCD = actor.gatherCD || 0;
  try {
    directAction(e.type, {
      buildType: e.buildType,
      recipe: e.recipe,
      weapon: e.weapon,
      x: e.x,
      z: e.z,
      angle: e.angle,
      buildingId:e.buildingId,operation:e.operation,item:e.item,amount:e.amount,peerId:e.peerId,
    });
  } finally {
    actor.gatherCD = game.gatherCD;
    game.player = old;
    game.gatherCD = gcd;
  }
  events();
}
function onlineStatus(status, count, message) {
  if (!online) return;
  let el = $("#online-status");
  if (!el) {
    el = document.createElement("div");
    el.id = "online-status";
    el.className = "online-status";
    $("#hud").append(el);
  }
  $("#party span").textContent =
    status === "connected" ? `${count || 1}/4` : "重连中";
  el.textContent =
    status === "connected"
      ? `房间 ${online.info.code} · ${online.host ? "队长" : "同行中"}`
      : status === "expired"
        ? "房间连接已失效，请重新加入。"
        : "连接中断，正在重连…";
  if (status !== lastOnlineStatus && status !== "connected")
    toast(
      status === "expired" ? message : "网络暂时中断，正在尝试重新连接。",
      "bad",
    );
  if (status === "connected" && lastOnlineStatus === "reconnecting")
    toast("已重新连接到伙伴。", "good");
  lastOnlineStatus = status;
}
async function launchOnline(info) {
  if (online) await online.leave();
  closePanel();
  const next = new Game(info.mode, info.snapshot.game);
  next.player = { ...new Game(info.mode).player };
  next.player.id = info.playerId;
  next.player.x = info.snapshot.actors?.[info.playerId]?.x ?? 2;
  next.player.z = info.snapshot.actors?.[info.playerId]?.z ?? 24;
  resetView(next);
  remoteActors.clear();
  lastRespawns = 0;
  online = new (info.transport === "local" ? LocalRoom : OnlineRoom)(info, {
    position: () => ({
      x: game.player.x,
      z: game.player.z,
      angle: game.player.angle,
      moving: game.player.moving,
      attack: game.player.attack,
      dash: game.player.dash,
    }),
    snapshot: roomSnapshot,
    world: applyRoomSnapshot,
    peers: updateRoomPeers,
    action: remoteAction,
    role: (host, snapshot) => {
      game.isGuest = !host;
      if (snapshot) applyRoomSnapshot(snapshot);
      toast(
        host ? "你已接管岛屿，旅程可以继续。" : "已连接到新的队长。",
        "good",
      );
    },
    status: onlineStatus,
  });
  game.isGuest = !online.host;
  applyRoomSnapshot(info.snapshot);
  try {
    sessionStorage.setItem(
      "wildhaven-room",
      JSON.stringify({
        code: info.code,
        playerId: info.playerId,
        token: info.token,
        mode: info.mode,
        name: info.name,
      }),
    );
  } catch {}
  started = true;
  paused = false;
  $("#welcome").hidden = true;
  $("#hud").hidden = false;
  clearInput();
  audio.setPaused(false);
  await audio.start();
  if (matchMedia("(pointer:coarse)").matches) fullScreen();
  hudUpdate();
  drawMap($("#minimap"));
  online.start();
  toast(`已进入房间 ${info.code}，点击右上角联机查看邀请码。`, "good");
}
async function leaveOnline() {
  if (online) {
    const old = online;
    online = null;
    await old.leave();
  }
  game.remotePlayers = [];
  view.updatePeers([], null);
  remoteActors.clear();
  try {
    sessionStorage.removeItem("wildhaven-room");
  } catch {}
  closePanel();
  started = false;
  $("#hud").hidden = true;
  $("#welcome").hidden = false;
  $("#continue").hidden = !saveData;
  $("#party span").textContent = "联机";
  $("#online-status")?.remove();
  audio.setPaused(true);
  cancelBuild();
}
function openOnline() {
  if (online) {
    openParty();
    return;
  }
  const requested = (new URLSearchParams(location.search).get("room") || "")
    .replace(/[^A-Z2-9]/gi, "")
    .toUpperCase()
    .slice(0, 6);
  let remembered = null;
  try {
    remembered = JSON.parse(sessionStorage.getItem("wildhaven-room") || "null");
  } catch {}
  let localOptions = "";
  if (globalThis.WildhavenLink) {
    let paired = [];
    try { paired = JSON.parse(WildhavenLink.pairedBluetooth() || "[]"); } catch {}
    localOptions = `<div class="online-divider">无需服务器的附近联机</div><div class="button-row"><button id="host-lan" class="primary">创建 Wi-Fi 房间</button><button id="host-bt" class="subtle">创建蓝牙房间</button></div><div class="online-field"><label for="lan-address">主机显示的局域网地址</label><div class="join-row"><input id="lan-address" inputmode="decimal" placeholder="例如 192.168.1.8"><button id="join-lan" class="subtle">加入 Wi-Fi</button></div></div><div class="online-field"><label>已配对的蓝牙设备</label><div class="button-row">${paired.length ? paired.map(d => `<button class="subtle join-bt" data-address="${escapeHtml(d.address)}">${escapeHtml(d.name || d.address)}</button>`).join("") : "<small>请先在安卓系统设置中完成蓝牙配对，再返回游戏。</small>"}</div></div>`;
  }
  setPanel(
    "与朋友同行",
    `<p class="panel-intro">${globalThis.WildhavenLink ? "创建附近积分房，采集、战斗、建造并争夺积分。无需公网服务器。" : "远征是主要玩法：进入全球积分房，采集、战斗、建造并争夺积分。最多 4 人。"}</p><div class="online-field"><label for="player-name">你的旅人名字</label><input id="player-name" maxlength="12" placeholder="给旅人起个名字" value="${escapeHtml(settings.nickname || "旅人")}"></div><div class="${globalThis.WildhavenLink ? "native-hidden" : ""}"><div class="button-row"><button id="create-room" class="primary">创建全球积分远征</button><button id="create-coop" class="subtle">创建朋友合作房</button></div><div class="online-divider">或加入已有远征</div><div class="online-field"><label for="room-input">6 位房间码</label><div class="join-row"><input id="room-input" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="例如 ABC234" value="${requested}"><button id="join-room" class="subtle">加入房间</button></div></div>${remembered ? `<button id="rejoin-room" class="text-button">回到上次的房间 ${escapeHtml(remembered.code)}</button>` : ""}</div>${localOptions}<p id="online-error" class="online-error" aria-live="polite"></p><p class="panel-intro" style="font-size:12px;margin-bottom:0">有帐篷被淘汰损失 50% 积分；无帐篷失去全部积分。帐篷初始保护 1 天。</p>`,
    "BETTER TOGETHER",
  );
  async function connect(kind, roomMode = mode) {
    const name = $("#player-name").value.trim() || "旅人",
      code = $("#room-input").value.toUpperCase().replace(/\s/g, "");
    if (kind === "join" && !/^[A-Z2-9]{6}$/.test(code)) {
      $("#online-error").textContent = "请输入正确的 6 位房间码。";
      return;
    }
    settings.nickname = name;
    saveSettings();
    $("#online-error").textContent = "正在连接岛屿…";
    $("#create-room").disabled = $("#join-room").disabled = true;
    if ($("#create-coop")) $("#create-coop").disabled = true;
    try {
      const url =
        kind === "create" ? "/api/rooms/create" : `/api/rooms/${code}/join`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mode: roomMode }),
        signal: AbortSignal.timeout(12000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "连接失败，请重试");
      await launchOnline(data);
    } catch (e) {
      $("#online-error").textContent =
        e.name === "TimeoutError" ? "连接超时，请重试。" : e.message;
      $("#create-room").disabled = $("#join-room").disabled = false;
      if ($("#create-coop")) $("#create-coop").disabled = false;
    }
  }
  $("#create-room").onclick = () => connect("create", "global");
  $("#create-coop").onclick = () => connect("create", mode);
  $("#join-room").onclick = () => connect("join");
  async function startLocal(host, type, target = "") {
    const name = $("#player-name").value.trim() || "旅人";
    const playerId = crypto.randomUUID();
    try {
      let code = type === "lan" ? target : "蓝牙";
      if (host && type === "lan") code = WildhavenLink.hostLan();
      else if (host) WildhavenLink.hostBluetooth();
      else if (type === "lan") WildhavenLink.joinLan(target);
      else WildhavenLink.joinBluetooth(target);
      if (host && type === "lan" && !code) throw new Error("请先连接 Wi-Fi。")
      const seed = new Game("global");
      const snapshot = {game:seed.snapshot(),enemies:seed.world.enemies.map(e=>({...e})),actors:{}};
      await launchOnline({transport:"local",host,playerId,hostId:host?playerId:"附近主机",name,code,token:"local",mode:"global",snapshot});
      toast(host ? `房间已创建：${type === "lan" ? code : "等待已配对设备加入"}` : "正在连接附近房间…", "good");
    } catch (e) { $("#online-error").textContent = e.message || "附近联机启动失败。"; }
  }
  if ($("#host-lan")) {
    $("#host-lan").onclick = () => startLocal(true,"lan");
    $("#host-bt").onclick = () => startLocal(true,"bluetooth");
    $("#join-lan").onclick = () => { const address=$("#lan-address").value.trim(); if(address)startLocal(false,"lan",address); else $("#online-error").textContent="请输入主机显示的局域网地址。"; };
    document.querySelectorAll(".join-bt").forEach(button => button.onclick=()=>startLocal(false,"bluetooth",button.dataset.address));
  }
  $("#room-input").addEventListener(
    "input",
    (e) =>
      (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "")),
  );
  if ($("#rejoin-room"))
    $("#rejoin-room").onclick = async () => {
      try {
        $("#online-error").textContent = "正在重回岛屿…";
        const r = await fetch(`/api/rooms/${remembered.code}/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + remembered.token,
          },
          body: JSON.stringify({ playerId: remembered.playerId }),
          signal: AbortSignal.timeout(12000),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        await launchOnline({
          ...remembered,
          hostId: data.hostId,
          snapshot: data.recovery || data.snapshot,
        });
      } catch (e) {
        $("#online-error").textContent = e.message || "请使用房间码重新加入。";
      }
    };
}
function renderPartyList() {
  const list = $("#party-list");
  if (!list || !online) return;
  const peers = online.peers.length
    ? online.peers
    : [{ id: online.info.playerId, name: online.info.name }];
  list.innerHTML = peers
    .sort((a, b) => ((online.latestSnapshot?.actors?.[b.id]?.score || 0) - (online.latestSnapshot?.actors?.[a.id]?.score || 0)))
    .map(
      (p) =>
        `<div class="room-player"><span>${escapeHtml(p.name)}${p.id === online.info.playerId ? " · 你" : ""}</span><small>${game.global ? `积分 ${online.latestSnapshot?.actors?.[p.id]?.score || 0}` : p.id === online.info.hostId ? "创建者" : "旅人"}</small></div>`,
    )
    .join("");
}
function openParty() {
  const nearby = online.info.transport === "local";
  setPanel(
    "与朋友同行",
    `<p class="panel-intro">${nearby ? "附近房间无需公网服务器；所有设备保持 Wi-Fi 或蓝牙连接。" : "把房间码或邀请链接发给朋友，邀请他们一起踏上岛屿。"}</p><div class="room-code">${online.info.code}</div><div class="room-code-note">${nearby ? "附近积分房" : game.global ? "全球积分房 · 玩家对战开启" : game.creative ? "自由漫游" : "合作远征"} · 最多 4 人</div><div id="party-list"></div><div class="button-row">${nearby ? "" : '<button id="copy-invite" class="primary">复制邀请链接</button><button id="copy-code" class="subtle">复制房间码</button>'}<button id="leave-room" class="subtle">离开房间</button></div><p id="copy-message" class="online-error"></p><p class="panel-intro" style="font-size:12px;margin-bottom:0">菜单打开时，联机世界仍会继续运行。</p>`,
    "YOUR PARTY",
  );
  renderPartyList();
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      $("#copy-message").textContent = "已复制，可以发给朋友了。";
    } catch {
      $("#copy-message").textContent = text;
    }
  }
  if ($("#copy-invite")) $("#copy-invite").onclick = () =>
    copy(location.origin + "/?room=" + online.info.code);
  if ($("#copy-code")) $("#copy-code").onclick = () => copy(online.info.code);
  $("#leave-room").onclick = leaveOnline;
}
$("#multiplayer").onclick = openOnline;
$("#party").onclick = openOnline;
