// Home rules extend the existing save format; old buildings remain valid.
export function installHome(Game, BUILDS, ITEMS, height, dist) {
  Object.assign(BUILDS, {
    floor: {name:"木地板",description:"3 米方格自动对齐，房屋的基础。",icon:"build",cost:{wood:4},radius:1.5,maxDurability:180,home:true},
    wall: {name:"房屋墙",description:"吸附地板边缘，阻挡人物和敌人。",icon:"fence",cost:{wood:5,stone:1},radius:1.5,maxDurability:220,home:true},
    door: {name:"门框与门",description:"吸附地板边缘，主人或授权队友可开关。",icon:"build",cost:{wood:5,stone:2},radius:1.5,maxDurability:180,home:true},
    roof: {name:"屋顶",description:"放在地板上方；走入屋内时自动变淡。",icon:"tent",cost:{wood:6,stone:2},radius:1.5,maxDurability:180,home:true},
    chest: {name:"储物箱",description:"最多存放 200 份材料；回收前需取空。",icon:"bag",cost:{wood:8,stone:2},radius:.75,maxDurability:140,home:true},
    planter: {name:"花草盆栽",description:"装点营地，增加装饰种类评分。",icon:"berry",cost:{wood:2,stone:2,berry:3},radius:.4,maxDurability:60,home:true},
    rug: {name:"编织地毯",description:"铺在地板上，为自己的家添一点颜色。",icon:"build",cost:{wood:3,berry:2},radius:.7,maxDurability:60,home:true},
  });
  const structural = t => ["floor","wall","door","roof"].includes(t);
  const edge = t => t === "wall" || t === "door";
  const mine = (g,b) => !b.owner || b.owner === (g.player.id || "local");
  const near = (g,b) => b && dist(g.player,b) <= 4.5;
  const floorsAt = (g,x,z) => g.buildings.filter(b=>b.type==="floor" && Math.abs(b.x-x)<=1.51 && Math.abs(b.z-z)<=1.51);
  const base = {snap:Game.prototype.snapBuild,can:Game.prototype.canBuild,build:Game.prototype.build,move:Game.prototype.moveEntity,load:Game.prototype.load};
  Game.prototype.ownsBuilding = function(b) { return mine(this,b); };
  Game.prototype.canUseBuilding = function(b) { return mine(this,b) || (b.guests || []).includes(this.player.id); };
  Game.prototype.snapBuild = function(type,x,z,angle=0) {
    if (!structural(type)) return base.snap.call(this,type,x,z,angle);
    angle = Math.round(angle/(Math.PI/2))*Math.PI/2;
    const sideways = Math.abs(Math.sin(angle)) > .5;
    const ox = edge(type) && sideways ? 1.5 : 0, oz = edge(type) && !sideways ? 1.5 : 0;
    return {x:Math.round((x-ox)/3)*3+ox,z:Math.round((z-oz)/3)*3+oz,angle};
  };
  Game.prototype.canBuild = function(type,x,z,angle=0) {
    if (!BUILDS[type] || !Number.isFinite(x+z+angle)) return false;
    const isHome = BUILDS[type].home;
    if (!isHome) {
      const all=this.buildings;
      this.buildings=all.filter(b=>!["floor","roof","rug"].includes(b.type));
      try { return all.length<150 && base.can.call(this,type,x,z); } finally { this.buildings=all; }
    }
    if(this.buildings.length>=150 || dist(this.player,{x,z})>8.5 || Math.hypot(x,z)>105 || height(x,z)<1) return false;
    // Existing beacon/relic exclusion and resource collision rules still apply.
    const all=this.buildings;
    this.buildings=[];
    let terrainOK;
    try { terrainOK=base.can.call(this,type,x,z); } finally { this.buildings=all; }
    if(!terrainOK) return false;
    const supporting=floorsAt(this,x,z);
    if(["wall","door","roof","rug"].includes(type) && !supporting.some(b=>mine(this,b))) return false;
    if(type==="floor") {
      const levels=[[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]].map(([dx,dz])=>height(x+dx,z+dz));
      if(Math.max(...levels)-Math.min(...levels)>1) return false;
    }
    return !all.some(b=>{
      const d=dist(b,{x,z});
      if(type==="roof") return b.type==="roof" && d<.1;
      if(b.type==="roof") return false;
      if(type==="floor") return b.type==="floor" ? d<2.99 : !edge(b.type) && !["rug","planter","chest","lamp","workbench"].includes(b.type) && d<2;
      if(b.type==="floor") return false;
      if(edge(type)) return edge(b.type) ? d<.2 : !["rug"].includes(b.type) && d<.85;
      if(type==="rug" || b.type==="rug") return type===b.type && d<1;
      return d < BUILDS[type].radius + (edge(b.type) ? .25 : BUILDS[b.type].radius);
    });
  };
  Game.prototype.build = function(...args) {
    const success=base.build.apply(this,args);
    if(success) {
      const b=this.buildings[this.buildings.length-1];
      b.owner=this.player.id || "local"; b.level=1; b.guests=[];
      if(b.type==="chest") b.storage=Object.fromEntries(Object.keys(ITEMS).map(k=>[k,0]));
      if(b.type==="door") b.open=false;
    }
    return success;
  };
  Game.prototype.buildingAction = function(id, action, item, amount=1, peerId=null) {
    const b=this.buildings.find(b=>b.id===id);
    const fail=text=>{this.notify(text,"bad");return false;};
    if(!near(this,b)) return fail("请靠近这座建筑再操作");
    if(!this.canUseBuilding(b)) return fail("这是其他玩家的建筑，需要主人授权");
    if(action==="door" && b.type==="door") {
      if(b.open && [this.player,...this.remotePlayers].some(p=>dist(p,b)<1.5))return fail("门口有人，请离开门口再关门");
      b.open=!b.open;
    }
    else if(action==="store" || action==="take") {
      if(b.type!=="chest" || !Object.hasOwn(ITEMS,item) || !Number.isInteger(amount) || amount<1 || amount>200) return fail("无效的存取数量");
      b.storage ||= Object.fromEntries(Object.keys(ITEMS).map(k=>[k,0]));
      const used=Object.values(b.storage).reduce((a,v)=>a+v,0);
      const from=action==="store"?this.inventory:b.storage, to=action==="store"?b.storage:this.inventory;
      if((from[item]||0)<amount) return fail("物品数量不足");
      if(action==="store" && used+amount>200) return fail("箱子已满，最多存放 200 份材料");
      from[item]-=amount;to[item]=(to[item]||0)+amount;
    } else if(action==="authorize") {
      if(!mine(this,b) || typeof peerId!=="string" || peerId.length>100 || !(this.homePeerIds||this.remotePlayers.map(p=>p.id)).includes(peerId)) return fail("只能由主人授权当前房间的队友");
      b.guests ||= [];b.guests=b.guests.includes(peerId)?b.guests.filter(id=>id!==peerId):[...b.guests,peerId];
    } else if(action==="upgrade") {
      if(!mine(this,b) || !structural(b.type) || (b.level||1)>=3) return fail("只有主人可以升级房屋模块，最高 3 级");
      const level=b.level||1,cost=level===1?{stone:8,wood:2}:{stone:12,crystal:4};
      if(!this.afford(cost)) return fail("升级材料不足");
      this.pay(cost);b.level=level+1;b.maxDurability=BUILDS[b.type].maxDurability*b.level;b.durability=b.maxDurability;
      b.upgradeSpent ||= {};for(const [k,v] of Object.entries(cost))b.upgradeSpent[k]=(b.upgradeSpent[k]||0)+v;
    } else if(action==="recycle") {
      if(!mine(this,b) || b.id.startsWith("home")) return fail("只能回收自己的建筑");
      if(b.storage && Object.values(b.storage).some(v=>v>0)) return fail("请先取空储物箱，物品不会随回收删除");
      if(b.type==="floor" && this.buildings.some(v=>v.id!==b.id && Math.abs(v.x-b.x)<=1.51 && Math.abs(v.z-b.z)<=1.51)) return fail("先回收地板上的屋顶、墙和家具");
      const cost={...BUILDS[b.type].cost};for(const [k,v] of Object.entries(b.upgradeSpent||{}))cost[k]=(cost[k]||0)+v;
      for(const [k,v] of Object.entries(cost))this.inventory[k]+=Math.floor(v*.7);
      this.buildings=this.buildings.filter(v=>v.id!==id);this.stats.recycled++;
      if(this.player.mounted===id)this.player.mounted=null;
      this.event("recycle",{id,x:b.x,z:b.z});this.notify("已回收，返还基础及升级材料的 70%（向下取整）","good");return true;
    } else return fail("该建筑不支持这个操作");
    this.event("home-change",{id});this.notify(action==="upgrade"?"建筑升级完成":action==="door"?(b.open?"门已打开":"门已关闭"):action==="authorize"?"队友权限已更新":"存取完成","good");return true;
  };
  Game.prototype.recycleNearest=function(){
    const b=this.buildings.filter(b=>mine(this,b)&&!b.id.startsWith("home")&&dist(b,this.player)<4).sort((a,b)=>dist(a,this.player)-dist(b,this.player))[0];
    if(!b){this.notify("靠近自己的建筑后再回收","bad");return false;}
    return this.buildingAction(b.id,"recycle");
  };
  Game.prototype.homeScore=function(){
    const list=this.buildings.filter(b=>mine(this,b)&&dist(b,this.player)<24), counts={};
    for(const b of list)counts[b.type]=(counts[b.type]||0)+1;
    let rooms=0;
    const floors=list.filter(b=>b.type==="floor"),visited=new Set();
    for(const start of floors){
      if(visited.has(start.id))continue;
      const queue=[start],group=[];visited.add(start.id);
      while(queue.length){const f=queue.pop();group.push(f);for(const next of floors)if(!visited.has(next.id)&&Math.abs(dist(next,f)-3)<.1){visited.add(next.id);queue.push(next);}}
      let door=false;
      const enclosed=group.every(f=>list.some(b=>b.type==="roof"&&dist(b,f)<.1)&&[[1.5,0],[-1.5,0],[0,1.5],[0,-1.5]].every(([dx,dz])=>{
        if(group.some(n=>dist(n,{x:f.x+dx*2,z:f.z+dz*2})<.1))return true;
        const boundary=list.find(b=>edge(b.type)&&dist(b,{x:f.x+dx,z:f.z+dz})<.1);if(boundary?.type==="door")door=true;return !!boundary;
      }));
      if(enclosed&&door)rooms++;
    }
    const variety=Object.keys(counts).length;
    return {score:variety*10+Math.min(rooms,4)*25+list.filter(b=>(b.level||1)>1).slice(0,20).reduce((s,b)=>s+(b.level-1)*3,0),rooms,variety,count:list.length};
  };
  Game.prototype.moveEntity=function(p,dx,dz,collision=true){
    const before={x:p.x,z:p.z};base.move.call(this,p,dx,dz,collision);
    if(!collision)return;
    for(const b of this.buildings){
      if(!edge(b.type) && b.type!=="chest")continue;
      const a=b.angle||0,c=Math.cos(a),s=Math.sin(a),x=c*(p.x-b.x)-s*(p.z-b.z),z=s*(p.x-b.x)+c*(p.z-b.z);
      const hit=b.type==="chest"?Math.abs(x)<1&&Math.abs(z)<.75:Math.abs(x)<1.8&&Math.abs(z)<.5&&!(b.type==="door"&&b.open&&Math.abs(x)<.9);
      if(hit){p.x=before.x;p.z=before.z;return;}
    }
  };
}
