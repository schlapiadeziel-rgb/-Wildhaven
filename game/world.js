import { installHome } from './home.js';
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function rng(seed = 92475) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const SHRINES = [
  { x: -55, z: -30, name: "森语遗迹", color: 0x82e9c8 },
  { x: 57, z: -28, name: "霜光遗迹", color: 0x9ddcf5 },
  { x: 20, z: 70, name: "落日遗迹", color: 0xffcb84 },
];
export const HOME = { x: 0, z: 24 };
export const BEACON = { x: 0, z: -8 };
export function currentQuest(game) {
  if (game.won) return { title: "主线已完成", detail: "探索岛屿，建造自己的营地", target: null };
  const remaining = SHRINES.filter((_, i) => !game.shrines[i]);
  const closest = (list) => [...list].sort((a,b) => dist(game.player,a)-dist(game.player,b))[0];
  if (remaining.length && game.inventory.crystal < 3) {
    const nodes = game.world.nodes.filter(n => n.type === "crystal" && !n.down);
    return { title: `收集晶石 ${game.inventory.crystal}/3`, detail: "靠近晶簇，长按采集", target: closest(nodes) || null };
  }
  if (remaining.length) {
    const target = closest(remaining);
    return { title: `唤醒${target.name}`, detail: "靠近遗迹后交互，消耗 3 晶石", target };
  }
  return { title: "击败岛心守望者", detail: "前往灯塔，闪避蓄力攻击", target: BEACON };
}
export function height(x, z) {
  let r = Math.hypot(x, z);
  let h =
    4.1 +
    Math.sin(x * 0.046) * 1.5 +
    Math.cos(z * 0.05) * 1.8 +
    Math.sin(x * 0.09 + z * 0.047) * 1.3 +
    Math.cos(x * 0.155 - z * 0.076) * 0.4 -
    Math.pow(r / 108, 6) * 12;
  for (const s of [HOME, BEACON, ...SHRINES]) {
    let d = Math.hypot(s.x - x, s.z - z);
    if (d < 9) {
      let f = clamp(d / 9, 0, 1);
      f = f * f * (3 - 2 * f);
      h = 3.5 * (1 - f) + h * f;
    }
  }
  return h;
}
export function biome(x, z) {
  if (z < -36) return { id: "frost", name: "霜落高地", color: "#abbfbd" };
  if (x > 31) return { id: "amber", name: "琥珀林地", color: "#b5a075" };
  if (x < -28) return { id: "forest", name: "森语密林", color: "#668f79" };
  return { id: "meadow", name: "风眠草甸", color: "#91b88a" };
}
export const ITEMS = {
  wood: "木材",
  stone: "石材",
  crystal: "晶石",
  berry: "浆果",
};
export const BUILDS = {
  fire: {
    name: "篝火",
    description: "照亮夜晚，靠近时持续恢复生命。",
    icon: "fire",
    cost: { wood: 4, stone: 2 },
    radius: 1.2,
    maxDurability: 120,
  },
  tent: {
    name: "旅人帐篷",
    description: "搭建新的重生点；靠近后可休息到天亮。",
    icon: "tent",
    cost: { wood: 10, stone: 5 },
    radius: 2,
    maxDurability: 180,
  },
  lamp: {
    name: "晶石灯",
    description: "用柔和的光标记你喜欢的道路。",
    icon: "lamp",
    cost: { stone: 3, crystal: 1 },
    radius: 0.65,
    maxDurability: 90,
  },
  workbench: {
    name: "野外工作台",
    description: "靠近后制作工具、武器和载具。",
    icon: "build",
    cost: { wood: 8, stone: 5 },
    radius: 1.35,
    maxDurability: 220,
  },
  fence: {
    name: "木栅栏",
    description: "自动对齐相邻栅栏，阻挡靠近的生物。",
    icon: "fence",
    cost: { wood: 3 },
    radius: 1.4,
    maxDurability: 80,
  },
  sailcart: {
    name: "风帆小车",
    description: "可骑乘的轻型载具，适合跑图与运送材料。",
    icon: "wind",
    cost: { wood: 16, stone: 6, crystal: 3 },
    radius: 1.8,
    maxDurability: 140,
    vehicle: true,
  },
};
export const RECIPES = {
  axe: {
    name: "石斧",
    description: "采集木材和石材时更省力。",
    icon: "axe",
    cost: { wood: 3, stone: 4 },
    maxDurability: 90,
  },
  spear: {
    name: "猎人长矛",
    description: "近战：比剑更长、更痛。",
    icon: "sword",
    cost: { wood: 5, stone: 2, crystal: 1 },
    maxDurability: 70,
  },
  bow: {
    name: "风语弓",
    description: "远距离：单发高伤，射程最远。",
    icon: "bow",
    cost: { wood: 9, stone: 2, crystal: 3 },
    maxDurability: 95,
  },
  pistol: {
    name: "晶能手枪",
    description: "中距离：射速最快，适合单个敌人。",
    icon: "pistol",
    cost: { wood: 7, stone: 8, crystal: 7 },
    maxDurability: 115,
  },
  shotgun: {
    name: "曙光喷射器",
    description: "近距离：一次打多个敌人，适合被围攻。",
    icon: "shotgun",
    cost: { wood: 12, stone: 12, crystal: 12 },
    maxDurability: 130,
  },
  arrows: {
    name: "箭矢 ×8",
    description: "风语弓使用的箭矢。",
    icon: "wind",
    cost: { wood: 3, stone: 1 },
    ammo: "arrow",
    amount: 8,
  },
  cells: {
    name: "晶能弹 ×12",
    description: "晶能手枪使用的能量弹。",
    icon: "crystal",
    cost: { stone: 2, crystal: 2 },
    ammo: "cell",
    amount: 12,
  },
  shells: {
    name: "霰弹 ×6",
    description: "曙光喷射器使用的近距离弹药。",
    icon: "sun",
    cost: { wood: 2, stone: 3, crystal: 1 },
    ammo: "shell",
    amount: 6,
  },
  repair: {
    name: "修理组件",
    description: "修复附近工具、武器或建筑。",
    icon: "build",
    cost: { wood: 3, stone: 2, crystal: 1 },
  },
};
export function generateWorld() {
  const r = rng();
  const nodes = [];
  function add(type, x, z) {
    const hp =
      type === "wood" ? 3 : type === "stone" ? 3 : type === "crystal" ? 2 : 1;
    nodes.push({
      id: nodes.length,
      type,
      x,
      z,
      hp,
      maxHp: hp,
      scale: 0.75 + r() * 0.7,
      variant: r(),
      down: false,
    });
  }
  add("wood", 6, 24);
  add("wood", -7, 19);
  add("stone", -6, 29);
  add("crystal", 11, 22);
  add("berry", 2, 30);
  for (let i = 0; i < 2600 && nodes.length < 490; i++) {
    const x = (r() - 0.5) * 198,
      z = (r() - 0.5) * 198;
    const h = height(x, z);
    if (
      h < 1.35 ||
      dist({ x, z }, HOME) < 7 ||
      dist({ x, z }, BEACON) < 11 ||
      SHRINES.some((s) => dist({ x, z }, s) < 7)
    )
      continue;
    if (nodes.some((n) => Math.hypot(n.x - x, n.z - z) < 2.5)) continue;
    let t = r();
    let type =
      t < 0.56 ? "wood" : t < 0.74 ? "stone" : t < 0.87 ? "crystal" : "berry";
    add(type, x, z);
  }
  const enemies = [];
  for (let i = 0; i < 19; i++) {
    const a = r() * TAU,
      d = 35 + r() * 38,
      x = Math.cos(a) * d,
      z = Math.sin(a) * d;
    if (height(x, z) < 1) continue;
    enemies.push({
      id: i,
      x,
      z,
      homeX: x,
      homeZ: z,
      hp: 65,
      maxHp: 65,
      angle: r() * TAU,
      cd: r() * 2,
      windup: 0,
      hitFlash: 0,
      dead: false,
      boss: false,
    });
  }
  SHRINES.forEach((s, i) => {
    enemies.push({
      id: 30 + i,
      x: s.x + 7,
      z: s.z + 5,
      homeX: s.x + 7,
      homeZ: s.z + 5,
      hp: 85,
      maxHp: 85,
      angle: 0,
      cd: 1,
      windup: 0,
      hitFlash: 0,
      dead: false,
      boss: false,
    });
  });
  enemies.push({
    id: 100,
    x: BEACON.x,
    z: BEACON.z,
    homeX: BEACON.x,
    homeZ: BEACON.z,
    hp: 380,
    maxHp: 380,
    angle: 0,
    cd: 2,
    windup: 0,
    hitFlash: 0,
    dead: false,
    boss: true,
  });
  return { nodes, enemies };
}
export class Game {
  constructor(mode = "adventure", saved = null) {
    this.isGuest = false;
    this.remotePlayers = [];
    this.mode = ["adventure", "creative", "global"].includes(mode)
      ? mode
      : "adventure";
    this.world = generateWorld();
    this.player = {
      x: HOME.x,
      z: HOME.z,
      angle: Math.PI,
      hp: 120,
      maxHp: 120,
      stamina: 100,
      level: 1,
      xp: 0,
      weapon: 1,
      attack: 0,
      attackCD: 0,
      dash: 0,
      dashCD: 0,
      invulnerable: 0,
      moving: 0,
      mounted: null,
      score: 0,
      tentId: null,
      id: null,
      lastAttacker: null,
    };
    this.inventory = { wood: 4, stone: 3, crystal: 0, berry: 3 };
    this.ammo = { arrow: 0, cell: 0, shell: 0 };
    this.tools = {
      axe: { durability: 0, maxDurability: 90 },
      spear: { durability: 0, maxDurability: 70 },
      bow: { durability: 0, maxDurability: 95 },
      pistol: { durability: 0, maxDurability: 115 },
      shotgun: { durability: 0, maxDurability: 130 },
    };
    this.home = { ...HOME };
    this.buildings = [
      {
        id: "homefire",
        type: "fire",
        x: -3,
        z: 24,
        angle: 0,
        durability: 120,
        maxDurability: 120,
      },
      {
        id: "hometent",
        type: "tent",
        x: 0,
        z: 28,
        angle: 0,
        durability: 180,
        maxDurability: 180,
      },
    ];
    this.shrines = [false, false, false];
    this.stats = { gathered: 0, kills: 0, built: 0, recycled: 0 };
    this.discovered = ["meadow"];
    this.clock = 240;
    this.elapsed = 0;
    this.won = false;
    this.events = [];
    this.gatherCD = 0;
    this.nextSave = 8;
    this.restCD = 0;
    this.combo = 0;
    if (saved) this.restore(saved);
  }
  get creative() {
    return this.mode === "creative";
  }
  get global() {
    return this.mode === "global";
  }
  event(type, data = {}) {
    this.events.push({ type, ...data });
  }
  notify(text, tone = "normal") {
    this.event("toast", { text, tone });
  }
  afford(cost) {
    return (
      this.creative ||
      Object.entries(cost).every(([k, n]) => this.inventory[k] >= n)
    );
  }
  pay(cost) {
    if (!this.creative)
      for (const [k, n] of Object.entries(cost)) this.inventory[k] -= n;
  }
  addXP(n) {
    this.player.xp += n;
    const p = this.player;
    if (p.xp >= p.level * 65) {
      p.xp -= p.level * 65;
      p.level++;
      p.maxHp += 15;
      p.hp = p.maxHp;
      this.notify(`升至 Lv.${p.level} · 生命上限提升！`, "good");
      this.event("burst", { x: p.x, z: p.z, color: 0xf5e8a1, count: 30 });
    }
  }
  addScore(n, reason = "") {
    if (!this.global || !n) return;
    this.player.score = Math.max(0, Math.floor((this.player.score || 0) + n));
    this.event("score", { x: this.player.x, z: this.player.z, amount: n });
  }
  activeTent(actor = this.player) {
    const tent = this.buildings.find(
      (b) =>
        b.type === "tent" &&
        b.owner &&
        b.owner === actor.id &&
        b.id === actor.tentId &&
        b.expiresAt > Date.now(),
    );
    return tent || null;
  }
  expireTents() {
    if (!this.global) return;
    const expired = this.buildings.filter(
      (b) => b.type === "tent" && b.owner && b.expiresAt <= Date.now(),
    );
    if (!expired.length) return;
    for (const b of expired) {
      this.buildings = this.buildings.filter((v) => v.id !== b.id);
      for (const actor of [this.player, ...this.remotePlayers])
        if (actor.tentId === b.id) actor.tentId = null;
      this.event("recycle", { id: b.id, x: b.x, z: b.z });
      if (b.owner === this.player.id)
        this.notify("你的帐篷保护时间已结束，需要重新建造", "bad");
    }
  }
  defeatEnemy(e) {
    e.dead = true;
    this.stats.kills++;
    this.inventory.crystal += e.boss ? 8 : 1;
    this.inventory.berry += e.boss ? 5 : 1;
    this.addXP(e.boss ? 130 : 16);
    this.addScore(e.boss ? 60 : 12, "击败敌人");
    this.event("defeat", { id: e.id, x: e.x, z: e.z, boss: e.boss });
    if (e.boss) {
      this.won = true;
      this.notify("灯塔重燃！岛屿重新记起了光。", "good");
      this.event("victory");
    } else this.notify("+1 晶石 · +1 浆果", "good");
  }
  damagePlayer(target, damage) {
    if (
      !this.global ||
      target === this.player ||
      target.hp <= 0 ||
      target.invulnerable > 0
    )
      return false;
    target.hp -= damage;
    target.invulnerable = 0.28;
    target.lastAttacker = this.player.id;
    this.event("player-hit", { x: target.x, z: target.z });
    return true;
  }
  respawnPlayer(victim) {
    const killer = [this.player, ...this.remotePlayers].find(
      (p) => p.id && p.id === victim.lastAttacker,
    );
    const tent = this.activeTent(victim);
    const lost = tent
      ? Math.floor((victim.score || 0) * 0.5)
      : victim.score || 0;
    if (killer && killer !== victim && lost) {
      victim.score = Math.max(0, (victim.score || 0) - lost);
      killer.score = (killer.score || 0) + lost;
      if (killer === this.player)
        this.notify(`淘汰旅人 · 获得 ${lost} 积分`, "good");
    }
    const spot = tent ? { x: tent.x, z: tent.z - 4 } : HOME;
    victim.hp = victim.maxHp;
    victim.x = spot.x;
    victim.z = spot.z;
    victim.stamina = 100;
    victim.invulnerable = 4;
    victim.lastAttacker = null;
    victim.respawns = (victim.respawns || 0) + 1;
    this.event("respawn", { x: spot.x, z: spot.z });
    if (victim === this.player)
      this.notify(
        tent
          ? `在帐篷醒来 · 失去 ${lost} 积分`
          : `回到公共营地 · 失去 ${lost} 积分`,
        tent ? "good" : "bad",
      );
  }
  nearest() {
    const p = this.player;
    let best = null,
      bd = 3.7;
    for (const n of this.world.nodes) {
      if (n.down) continue;
      const d = dist(p, n);
      if (d < bd) {
        best = {
          kind: "node",
          target: n,
          label:
            n.type === "berry"
              ? "采摘浆果"
              : `采集${ITEMS[n.type]}（${n.hp}/${n.maxHp}）`,
        };
        bd = d;
      }
    }
    for (let i = 0; i < SHRINES.length; i++) {
      const s = SHRINES[i],
        d = dist(p, s);
      if (d < 4.5 && d < bd + 1) {
        best = {
          kind: "shrine",
          index: i,
          target: s,
          label: this.shrines[i]
            ? `${s.name} · 已苏醒`
            : `唤醒${s.name} · 需要 3 晶石`,
        };
        bd = d - 1;
      }
    }
    for (const b of this.buildings) {
      if (b.type !== "tent") continue;
      let d = dist(p, b);
      if (d < 3.1 && d < bd) {
        best = { kind: "tent", target: b, label: "在帐篷休息 · 设置重生点" };
        bd = d;
      }
    }
    if (dist(p, BEACON) < 4.5 && !this.won) {
      if (!this.shrines.every(Boolean))
        best = {
          kind: "beacon",
          target: BEACON,
          label: "古老灯塔 · 先唤醒三座遗迹",
        };
    }
    return best;
  }
  interact() {
    if (this.gatherCD > 0) return;
    const n = this.nearest();
    if (!n) {
      this.notify("靠近树木、岩石、晶簇或遗迹再交互");
      return;
    }
    const p = this.player;
    p.angle = Math.atan2(n.target.x - p.x, n.target.z - p.z);
    this.gatherCD = 0.37;
    if (n.kind === "node") {
      const v = n.target;
      const axeReady = this.tools.axe.durability > 0 && v.type !== "berry";
      v.hp -= axeReady ? 2 : 1;
      if (axeReady)
        this.tools.axe.durability = Math.max(0, this.tools.axe.durability - 1);
      p.attack = 0.25;
      this.event("gather", { x: v.x, z: v.z, type: v.type });
      if (axeReady && this.tools.axe.durability === 0)
        this.notify("石斧损坏了，可在工作台重新制作", "bad");
      if (v.hp <= 0) {
        v.down = true;
        const amount =
          (v.type === "wood" ? 4 : v.type === "stone" ? 3 : 2) +
          (axeReady && v.type === "wood" ? 1 : 0);
        this.inventory[v.type] += amount;
        this.stats.gathered += amount;
        this.addScore(
          amount * ({ wood: 1, stone: 2, crystal: 3, berry: 1 }[v.type] || 1),
          "采集资源",
        );
        this.addXP(6);
        if (!this.global) this.notify(`+${amount} ${ITEMS[v.type]}`, "good");
        this.event("node-down", { id: v.id });
      }
      return;
    }
    if (n.kind === "shrine") {
      if (this.shrines[n.index]) {
        p.hp = p.maxHp;
        this.notify("遗迹的微光恢复了你的生命", "good");
        return;
      }
      if (!this.afford({ crystal: 3 })) {
        this.notify("还需要更多晶石，寻找发光晶簇或击败石灵", "bad");
        return;
      }
      this.pay({ crystal: 3 });
      this.shrines[n.index] = true;
      this.addXP(40);
      p.hp = p.maxHp;
      this.event("shrine", { index: n.index });
      this.notify(`${n.target.name}已苏醒 · 生命恢复`, "good");
      if (this.shrines.every(Boolean)) {
        this.notify("三束光汇聚于岛心。前往古老灯塔，迎战守望者！", "good");
        this.event("boss-awaken");
      }
      return;
    }
    if (n.kind === "tent") {
      if (this.restCD > 0) return;
      this.home = { x: n.target.x, z: n.target.z - 4 };
      p.hp = p.maxHp;
      p.stamina = 100;
      this.clock = Math.floor(this.clock / 720) * 720 + 240;
      this.restCD = 3;
      this.notify("已休息到清晨，重生点设在此处", "good");
      this.event("rest");
      return;
    }
    this.notify("唤醒三座遗迹后，岛心的封印会解除");
  }
  attack() {
    const p = this.player;
    if (p.attackCD > 0 || p.dash > 0) return;
    this.combo = (this.combo + 1) % 3;
    const spearReady = this.tools.spear.durability > 0;
    const reach = spearReady ? 5.3 : 3.9,
      damage =
        22 + p.weapon * 6 + (spearReady ? 14 : 0) + (this.combo === 0 ? 8 : 0);
    this.event("swing", { x: p.x, z: p.z, angle: p.angle, combo: this.combo });
    p.attack = 0.3;
    p.attackCD = 0.38;
    let target = null;
    let d = reach + 0.2;
    for (const e of this.world.enemies) {
      if (e.dead || (e.boss && !this.shrines.every(Boolean))) continue;
      const nd = dist(e, p);
      if (nd < d) {
        target = e;
        d = nd;
      }
    }
    if (target) p.angle = Math.atan2(target.x - p.x, target.z - p.z);
    let hit = false;
    for (const e of this.world.enemies) {
      if (e.dead || (e.boss && !this.shrines.every(Boolean))) continue;
      const d = dist(e, p),
        dot =
          (Math.sin(p.angle) * (e.x - p.x) + Math.cos(p.angle) * (e.z - p.z)) /
          (d || 1);
      if (d < (e.boss ? reach + 1 : reach) && dot > -0.4) {
        hit = true;
        e.hp -= damage;
        if (spearReady)
          this.tools.spear.durability = Math.max(
            0,
            this.tools.spear.durability - 1,
          );
        e.hitFlash = 0.18;
        this.event("hit", { x: e.x, z: e.z, boss: e.boss });
        if (e.hp <= 0) this.defeatEnemy(e);
      }
    }
    if (this.global)
      for (const r of this.remotePlayers) {
        const d = dist(r, p),
          dot =
            (Math.sin(p.angle) * (r.x - p.x) +
              Math.cos(p.angle) * (r.z - p.z)) /
            (d || 1);
        if (d < reach && dot > -0.4) hit = this.damagePlayer(r, damage) || hit;
      }
    if (spearReady && this.tools.spear.durability === 0)
      this.notify("猎人长矛损坏了，可在工作台重新制作", "bad");
    if (!hit && this.nearest()?.kind === "node") {
      this.gatherCD = 0;
      this.interact();
    }
  }
  rangedAttack(kind) {
    const p = this.player,
      tool = this.tools[kind],
      spec = {
        bow: {
          range: 24,
          damage: 34,
          cooldown: 0.72,
          cone: 0.94,
          ammo: "arrow",
        },
        pistol: {
          range: 19,
          damage: 29,
          cooldown: 0.3,
          cone: 0.88,
          ammo: "cell",
        },
        shotgun: {
          range: 10,
          damage: 18,
          cooldown: 0.7,
          cone: 0.52,
          ammo: "shell",
        },
      }[kind];
    if (!spec || !tool || tool.durability <= 0) {
      this.notify(
        `${RECIPES[kind]?.name || "远程武器"}尚未制作或已损坏`,
        "bad",
      );
      return false;
    }
    if (this.ammo[spec.ammo] < 1 && !this.creative) {
      this.notify("弹药不足，去工作台制作子弹", "bad");
      return false;
    }
    if (p.attackCD > 0 || p.dash > 0) return false;
    p.attack = 0.25;
    p.attackCD = spec.cooldown;
    if (!this.creative) this.ammo[spec.ammo]--;
    tool.durability = Math.max(0, tool.durability - 1);
    this.event("aurora-aim", {
      x: p.x,
      z: p.z,
      angle: p.angle,
      range: spec.range,
      kind,
    });
    let hits = 0;
    for (const e of this.world.enemies) {
      if (e.dead || (e.boss && !this.shrines.every(Boolean))) continue;
      const d = dist(e, p);
      if (d > spec.range) continue;
      const dot =
        (Math.sin(p.angle) * (e.x - p.x) + Math.cos(p.angle) * (e.z - p.z)) /
        (d || 1);
      if (dot < spec.cone) continue;
      e.hp -=
        spec.damage *
        (kind === "shotgun" ? Math.max(0.45, 1 - (d / spec.range) * 0.45) : 1);
      e.hitFlash = 0.18;
      this.event("hit", { x: e.x, z: e.z, boss: e.boss });
      hits++;
      if (e.hp <= 0) this.defeatEnemy(e);
      if (kind !== "shotgun") break;
    }
    if (this.global)
      for (const r of this.remotePlayers) {
        const d = dist(r, p),
          dot =
            (Math.sin(p.angle) * (r.x - p.x) +
              Math.cos(p.angle) * (r.z - p.z)) /
            (d || 1);
        if (d <= spec.range && dot >= spec.cone) {
          hits += this.damagePlayer(
            r,
            spec.damage *
              (kind === "shotgun"
                ? Math.max(0.45, 1 - (d / spec.range) * 0.45)
                : 1),
          )
            ? 1
            : 0;
          if (kind !== "shotgun") break;
        }
      }
    if (!hits)
      this.event("projectile", {
        x: p.x,
        z: p.z,
        angle: p.angle,
        range: spec.range,
        kind,
      });
    if (tool.durability === 0)
      this.notify(`${RECIPES[kind].name}损坏了，可在工作台重新制作`, "bad");
    return true;
  }
  dash(dx, dz) {
    const p = this.player;
    if (p.dashCD > 0 || p.stamina < 28) return false;
    p.stamina -= 28;
    p.dash = 0.22;
    p.dashCD = 0.72;
    p.invulnerable = 0.45;
    if (dx || dz) p.angle = Math.atan2(dx, dz);
    this.event("dash", { x: p.x, z: p.z });
    return true;
  }
  heal() {
    const p = this.player;
    if (p.hp >= p.maxHp) {
      this.notify("生命已满");
      return;
    }
    if (this.inventory.berry < 1 && !this.creative) {
      this.notify("没有浆果了，试着寻找低矮的浆果丛", "bad");
      return;
    }
    if (!this.creative) this.inventory.berry--;
    p.hp = Math.min(p.maxHp, p.hp + 40);
    this.notify("食用浆果 · 恢复 40 生命", "good");
    this.event("heal");
  }
  workbenchNearby() {
    return this.buildings.some(
      (b) => b.type === "workbench" && dist(b, this.player) < 4,
    );
  }
  craft(recipe) {
    const spec = RECIPES[recipe];
    if (!spec) return false;
    if (!this.creative && !this.workbenchNearby()) {
      this.notify("靠近野外工作台才能制作", "bad");
      return false;
    }
    if (!this.afford(spec.cost)) {
      this.notify("材料不足，先采集一些资源", "bad");
      return false;
    }
    if (recipe === "repair") return this.repairNearest(true);
    this.pay(spec.cost);
    if (spec.ammo) this.ammo[spec.ammo] += spec.amount;
    else if (this.tools[recipe])
      this.tools[recipe].durability = this.tools[recipe].maxDurability;
    this.event("craft", { recipe });
    this.notify(`制作完成：${spec.name}`, "good");
    return true;
  }
  repairNearest(payNow = false) {
    let candidates = [
      ...this.buildings.filter(
        (b) => dist(b, this.player) < 4 && b.durability < b.maxDurability,
      ),
      ...Object.entries(this.tools)
        .filter(([, t]) => t.durability > 0 && t.durability < t.maxDurability)
        .map(([id, t]) => ({ id, type: "tool", ...t })),
    ];
    if (!candidates.length) {
      this.notify("附近没有需要修理的物品", "bad");
      return false;
    }
    let target = candidates[0];
    if (payNow) this.pay(RECIPES.repair.cost);
    else if (!this.creative && !this.afford(RECIPES.repair.cost)) {
      this.notify("修理组件材料不足", "bad");
      return false;
    } else if (!this.creative) this.pay(RECIPES.repair.cost);
    if (target.type === "tool")
      this.tools[target.id].durability = this.tools[target.id].maxDurability;
    else target.durability = target.maxDurability;
    this.event("repair", {
      x: target.x ?? this.player.x,
      z: target.z ?? this.player.z,
    });
    this.notify("修理完成", "good");
    return true;
  }
  snapBuild(type, x, z, angle = 0) {
    if (type !== "fence") return { x, z, angle };
    const near = this.buildings
      .filter((b) => b.type === "fence")
      .map((b) => ({ b, d: Math.hypot(x - b.x, z - b.z) }))
      .filter((v) => v.d < 5)
      .sort((a, b) => a.d - b.d)[0];
    if (!near)
      return { x, z, angle: (Math.round(angle / (Math.PI / 4)) * Math.PI) / 4 };
    const a = near.b.angle || 0;
    const localX = Math.cos(a) * (x - near.b.x) - Math.sin(a) * (z - near.b.z),
      localZ = Math.sin(a) * (x - near.b.x) + Math.cos(a) * (z - near.b.z);
    if (Math.abs(localX) > Math.abs(localZ))
      return {
        x: near.b.x + Math.cos(a) * Math.sign(localX || 1) * 2.85,
        z: near.b.z - Math.sin(a) * Math.sign(localX || 1) * 2.85,
        angle: a,
      };
    return {
      x: near.b.x + Math.sin(a) * Math.sign(localZ || 1) * 2.85,
      z: near.b.z + Math.cos(a) * Math.sign(localZ || 1) * 2.85,
      angle: a,
    };
  }
  recycleNearest() {
    const list = this.buildings
      .filter((b) => !b.id.startsWith("home") && dist(b, this.player) < 4)
      .sort((a, b) => dist(a, this.player) - dist(b, this.player));
    const b = list[0];
    if (!b) {
      this.notify("靠近你建造的建筑后再回收", "bad");
      return false;
    }
    const spec = BUILDS[b.type];
    for (const [item, count] of Object.entries(spec.cost))
      this.inventory[item] += Math.max(1, Math.floor(count * 0.7));
    this.buildings = this.buildings.filter((v) => v.id !== b.id);
    if (this.player.mounted === b.id) this.player.mounted = null;
    this.stats.recycled++;
    this.event("recycle", { id: b.id, x: b.x, z: b.z });
    this.notify(`已回收${spec.name} · 返还 70% 材料`, "good");
    return true;
  }
  mountNearest() {
    if (this.player.mounted) {
      const b = this.buildings.find((v) => v.id === this.player.mounted);
      this.player.mounted = null;
      if (b) {
        this.player.x = b.x + Math.sin(b.angle) * 2;
        this.player.z = b.z + Math.cos(b.angle) * 2;
      }
      this.notify("已离开风帆小车");
      return true;
    }
    const b = this.buildings
      .filter((v) => BUILDS[v.type].vehicle && dist(v, this.player) < 3)
      .sort((a, b) => dist(a, this.player) - dist(b, this.player))[0];
    if (!b) {
      this.notify("靠近风帆小车后再骑乘", "bad");
      return false;
    }
    if (b.durability <= 0) {
      this.notify("风帆小车已损坏，需要修理", "bad");
      return false;
    }
    this.player.mounted = b.id;
    this.notify("已骑上风帆小车 · 速度提升", "good");
    return true;
  }
  build(type, x, z, angle = 0) {
    const spec = BUILDS[type];
    if (!spec) return false;
    const snapped = this.snapBuild(type, x, z, angle);
    x = snapped.x;
    z = snapped.z;
    angle = snapped.angle;
    if (!this.canBuild(type, x, z, angle)) {
      this.notify("这里无法放置，换一片空地试试", "bad");
      return false;
    }
    if (!this.afford(spec.cost)) {
      this.notify("材料不足，先采集一些资源", "bad");
      return false;
    }
    this.pay(spec.cost);
    if (this.global && type === "tent" && this.player.tentId) {
      const old = this.buildings.find((b) => b.id === this.player.tentId);
      if (old) {
        this.buildings = this.buildings.filter((b) => b.id !== old.id);
        this.event("recycle", { id: old.id, x: old.x, z: old.z });
      }
    }
    const b = {
      id: `b${this.stats.built + 1}`,
      type,
      x,
      z,
      angle,
      durability: spec.maxDurability,
      maxDurability: spec.maxDurability,
    };
    if (this.global && type === "tent") {
      b.owner = this.player.id;
      b.expiresAt = Date.now() + 86400000;
      this.player.tentId = b.id;
    }
    this.buildings.push(b);
    this.stats.built++;
    this.addXP(5);
    this.event("build", { building: b });
    this.notify(
      type === "tent" && this.global
        ? "已搭建个人帐篷 · 保护 1 天"
        : `已搭建${spec.name}`,
      "good",
    );
    return true;
  }
  reinforceTent() {
    const tent = this.activeTent();
    if (!tent) {
      this.notify("靠近自己的有效帐篷才能延长保护时间", "bad");
      return false;
    }
    if (dist(tent, this.player) > 4) {
      this.notify("靠近自己的帐篷才能延长保护时间", "bad");
      return false;
    }
    if ((this.player.score || 0) < 100) {
      this.notify("需要 100 积分才能延长 1 天", "bad");
      return false;
    }
    const max = 7 * 86400000,
      remaining = Math.max(0, tent.expiresAt - Date.now());
    if (remaining >= max - 1000) {
      this.notify("帐篷保护时间已达 7 天上限");
      return false;
    }
    this.player.score -= 100;
    tent.expiresAt = Math.min(Date.now() + max, tent.expiresAt + 86400000);
    this.notify("帐篷保护时间延长 1 天", "good");
    return true;
  }
  canBuild(type, x, z) {
    if (
      !BUILDS[type] ||
      !Number.isFinite(x + z) ||
      this.buildings.length >= 150
    )
      return false;
    if (
      height(x, z) < 1 ||
      dist({ x, z }, BEACON) < 8 ||
      SHRINES.some((s) => dist({ x, z }, s) < 5) ||
      dist(this.player, { x, z }) > 8.5
    )
      return false;
    const r = BUILDS[type].radius;
    return (
      !this.buildings.some(
        (b) => dist(b, { x, z }) < r + BUILDS[b.type].radius + 0.3,
      ) &&
      !this.world.nodes.some(
        (n) =>
          !n.down && dist(n, { x, z }) < r + (n.type === "wood" ? 0.8 : 0.5),
      )
    );
  }
  upgrade() {
    let w = this.player.weapon;
    if (w >= 5) {
      this.notify("星铁剑已升到最高阶");
      return;
    }
    const cost = { wood: 5 * w, stone: 4 * w, crystal: 2 * w };
    if (!this.afford(cost)) {
      this.notify("升级材料不足", "bad");
      return;
    }
    this.pay(cost);
    this.player.weapon++;
    this.notify(`星铁剑提升至 ${this.player.weapon} 阶`, "good");
    this.event("heal");
  }
  moveEntity(p, dx, dz, collision = true) {
    let x = p.x + dx,
      z = p.z + dz;
    if (Math.hypot(x, z) > 108 || height(x, z) < -0.8) return;
    if (collision) {
      for (const n of this.world.nodes) {
        if (n.down || n.type === "berry") continue;
        const r = n.type === "wood" ? 1.08 : n.type === "stone" ? 0.92 : 0.78;
        let d = Math.hypot(x - n.x, z - n.z);
        if (d < r && d > 0.001) {
          x = n.x + ((x - n.x) / d) * r;
          z = n.z + ((z - n.z) / d) * r;
        }
      }
      for (const b of this.buildings) {
        if (b.type !== "fence") continue;
        let d = Math.hypot(x - b.x, z - b.z);
        if (d < 1.32 && d > 0.001) {
          x = b.x + ((x - b.x) / d) * 1.32;
          z = b.z + ((z - b.z) / d) * 1.32;
        }
      }
    }
    p.x = x;
    p.z = z;
  }
  update(dt, input = { x: 0, z: 0 }) {
    dt = clamp(dt, 0, 0.05);
    const p = this.player;
    this.elapsed += dt;
    this.clock += dt;
    this.gatherCD = Math.max(0, this.gatherCD - dt);
    this.restCD = Math.max(0, this.restCD - dt);
    for (const k of ["attack", "attackCD", "dash", "dashCD", "invulnerable"])
      p[k] = Math.max(0, p[k] - dt);
    p.stamina = Math.min(100, p.stamina + dt * 20);
    let dx = input.x || 0,
      dz = input.z || 0,
      len = Math.hypot(dx, dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }
    p.moving = len > 0 ? 1 : 0;
    const vehicle =
      p.mounted &&
      this.buildings.find(
        (b) => b.id === p.mounted && BUILDS[b.type].vehicle && b.durability > 0,
      );
    if (!vehicle) p.mounted = null;
    if (p.dash > 0 && !vehicle) {
      dx = Math.sin(p.angle);
      dz = Math.cos(p.angle);
      this.moveEntity(p, dx * 25 * dt, dz * 25 * dt);
    } else if (len > 0) {
      const speed = vehicle ? 10.5 : height(p.x, p.z) < 0.3 ? 3.5 : 6.4;
      this.moveEntity(p, dx * speed * dt, dz * speed * dt);
      if (p.attack < 0.13) p.angle = Math.atan2(dx, dz);
      this.stats.steps += speed * dt;
      if (vehicle) {
        vehicle.x = p.x;
        vehicle.z = p.z;
        vehicle.angle = p.angle;
        vehicle.durability = Math.max(0, vehicle.durability - dt * 0.018);
        if (vehicle.durability === 0) {
          p.mounted = null;
          this.notify("风帆小车损坏了，已自动下车", "bad");
        }
        this.event("vehicle", { building: vehicle, speed: len });
      }
    }
    if (this.isGuest) return;
    this.expireTents();
    for (const r of this.remotePlayers) {
      for (const k of [
        "attack",
        "attackCD",
        "dash",
        "dashCD",
        "invulnerable",
        "gatherCD",
      ])
        r[k] = Math.max(0, (r[k] || 0) - dt);
      r.stamina = Math.min(100, r.stamina + dt * 20);
      if (this.creative) r.hp = r.maxHp;
      for (const b of this.buildings)
        if (b.type === "fire" && dist(r, b) < 5)
          r.hp = Math.min(r.maxHp, r.hp + 8 * dt);
    }
    if (this.creative) {
      p.hp = p.maxHp;
      p.stamina = 100;
    } else
      for (const b of this.buildings) {
        if (b.type === "fire" && dist(p, b) < 5)
          p.hp = Math.min(p.maxHp, p.hp + 8 * dt);
      }
    const b = biome(p.x, p.z);
    if (!this.discovered.includes(b.id)) {
      this.discovered.push(b.id);
      this.event("discovery", { name: b.name });
      this.addXP(15);
    }
    for (const e of this.world.enemies) {
      if (e.dead || (e.boss && !this.shrines.every(Boolean))) continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.cd -= dt;
      let target = p;
      for (const r of this.remotePlayers)
        if (r.hp > 0 && dist(e, r) < dist(e, target)) target = r;
      let d = dist(e, target);
      const range = e.boss ? 6 : 2.4;
      if (e.windup > 0) {
        e.windup -= dt;
        if (e.windup <= 0) {
          if (d < range + 0.8 && target.invulnerable <= 0 && !this.creative) {
            target.hp -= e.boss ? 30 : 12;
            target.invulnerable = 0.65;
            if (target === p)
              this.event("damage", { amount: e.boss ? 30 : 12 });
          }
          this.event("enemy-attack", { x: e.x, z: e.z, boss: e.boss });
          e.cd = e.boss ? 2.2 : 1.7;
        }
        continue;
      }
      if (d < (e.boss ? 34 : 15)) {
        e.angle = Math.atan2(target.x - e.x, target.z - e.z);
        if (d > range - 0.3) {
          const speed = e.boss ? 3.3 : 2.8;
          this.moveEntity(
            e,
            Math.sin(e.angle) * speed * dt,
            Math.cos(e.angle) * speed * dt,
            !e.boss,
          );
        } else if (e.cd <= 0) {
          e.windup = e.boss ? 0.85 : 0.42;
          this.event("windup", { x: e.x, z: e.z, boss: e.boss });
        }
      } else if (dist(e, { x: e.homeX, z: e.homeZ }) > 2) {
        e.angle = Math.atan2(e.homeX - e.x, e.homeZ - e.z);
        this.moveEntity(
          e,
          Math.sin(e.angle) * dt * 1.3,
          Math.cos(e.angle) * dt * 1.3,
        );
      }
    }
    for (const r of this.remotePlayers)
      if (r.hp <= 0) {
        if (this.global) this.respawnPlayer(r);
        else {
          r.hp = r.maxHp;
          r.x = this.home.x;
          r.z = this.home.z;
          r.stamina = 100;
          r.invulnerable = 4;
          r.respawns = (r.respawns || 0) + 1;
        }
      }
    if (p.hp <= 0) {
      if (this.global) this.respawnPlayer(p);
      else {
        p.hp = p.maxHp;
        p.x = this.home.x;
        p.z = this.home.z;
        p.stamina = 100;
        p.invulnerable = 4;
        for (const e of this.world.enemies)
          if (!e.dead && !this.remotePlayers.length) {
            e.x = e.homeX;
            e.z = e.homeZ;
            e.hp = e.maxHp;
            e.windup = 0;
            e.cd = 2;
          }
        this.notify("你在营地醒来，背包里的物品都还在。", "good");
        this.event("respawn");
      }
    }
  }
  snapshot() {
    return {
      v: 3,
      mode: this.mode,
      player: {
        ...this.player,
        attack: 0,
        attackCD: 0,
        dash: 0,
        dashCD: 0,
        invulnerable: 0,
      },
      inventory: this.inventory,
      ammo: this.ammo,
      tools: this.tools,
      home: this.home,
      buildings: this.buildings,
      shrines: this.shrines,
      stats: this.stats,
      discovered: this.discovered,
      clock: this.clock,
      elapsed: this.elapsed,
      won: this.won,
      nodes: this.world.nodes.filter((n) => n.down).map((n) => n.id),
      enemies: this.world.enemies.filter((e) => e.dead).map((e) => e.id),
    };
  }
  restore(s) {
    if (s.v !== 1 && s.v !== 2 && s.v !== 3)
      throw new Error("存档版本无法读取");
    this.mode = ["creative", "global"].includes(s.mode) ? s.mode : "adventure";
    if (
      !Number.isFinite(s.player?.x) ||
      !Number.isFinite(s.player?.z) ||
      Math.hypot(s.player.x, s.player.z) > 109
    )
      throw new Error("存档位置无效");
    for (const k of [
      "x",
      "z",
      "angle",
      "hp",
      "maxHp",
      "stamina",
      "xp",
      "level",
      "weapon",
      "score",
    ])
      if (Number.isFinite(s.player[k])) this.player[k] = s.player[k];
    this.player.tentId =
      typeof s.player?.tentId === "string" ? s.player.tentId : null;
    this.player.mounted =
      typeof s.player?.mounted === "string" ? s.player.mounted : null;
    this.player.weapon = clamp(this.player.weapon, 1, 5);
    this.player.maxHp = clamp(this.player.maxHp, 120, 3000);
    this.player.hp = clamp(this.player.hp, 1, this.player.maxHp);
    this.player.score = clamp(this.player.score || 0, 0, 999999);
    for (const k of Object.keys(this.inventory))
      this.inventory[k] = clamp(Number(s.inventory?.[k]) || 0, 0, 99999);
    for (const k of Object.keys(this.ammo))
      this.ammo[k] = clamp(Number(s.ammo?.[k]) || 0, 0, 99999);
    for (const k of Object.keys(this.tools))
      this.tools[k].durability = clamp(
        Number(s.tools?.[k]?.durability) || 0,
        0,
        this.tools[k].maxDurability,
      );
    if (
      s.home &&
      Number.isFinite(s.home.x + s.home.z) &&
      height(s.home.x, s.home.z) > 0.5
    )
      this.home = s.home;
    if (Array.isArray(s.buildings))
      this.buildings = s.buildings
        .filter(
          (b) =>
            BUILDS[b.type] &&
            Number.isFinite(b.x + b.z + b.angle) &&
            Math.hypot(b.x, b.z) < 109,
        )
        .slice(0, 150)
        .map((b) => ({
          ...b,
          level: clamp(Number(b.level)||1,1,3),
          maxDurability: BUILDS[b.type].maxDurability * clamp(Number(b.level)||1,1,3),
          durability: clamp(
            Number.isFinite(b.durability)
              ? b.durability
              : BUILDS[b.type].maxDurability,
            0,
            BUILDS[b.type].maxDurability * clamp(Number(b.level)||1,1,3),
          ),
        }));
    this.shrines = [0, 1, 2].map((i) => !!s.shrines?.[i]);
    for (const k in this.stats)
      this.stats[k] = Math.max(0, Number(s.stats?.[k]) || 0);
    this.discovered = Array.isArray(s.discovered)
      ? s.discovered.filter((d) =>
          ["meadow", "frost", "forest", "amber"].includes(d),
        )
      : ["meadow"];
    this.clock = Number.isFinite(s.clock) ? s.clock : 240;
    this.elapsed = Number.isFinite(s.elapsed) ? s.elapsed : 0;
    this.won = !!s.won;
    const down = new Set(s.nodes || []),
      dead = new Set(s.enemies || []);
    for (const n of this.world.nodes)
      if (down.has(n.id)) {
        n.down = true;
        n.hp = 0;
      }
    for (const e of this.world.enemies) if (dead.has(e.id)) e.dead = true;
  }
}
installHome(Game, BUILDS, ITEMS, height, dist);
