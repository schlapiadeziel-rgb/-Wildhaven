import * as T from './assets/three.module.min.js';
export function makeHome(view, g, type, ghost) {
  const mat=color=>new T.MeshStandardMaterial({color,roughness:.88,flatShading:true});
  const wood=mat(0x997343),trim=mat(0x543f31),stone=mat(0x718b89);
  const box=(w,h,d,m,x,y,z,parent=g)=>view.mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
  if(type==='floor') {box(3,.22,3,wood,0,.06,0);for(let x=-1.2;x<=1.2;x+=.6)box(.025,.012,2.96,trim,x,.177,0);}
  if(type==='wall') {box(3,2.55,.18,wood,0,1.45,0);for(const x of [-1.4,0,1.4])box(.12,2.7,.24,trim,x,1.45,0);}
  if(type==='door') {
    for(const x of [-1.25,1.25])box(.5,2.55,.22,wood,x,1.45,0);
    box(3,.4,.22,wood,0,2.6,0);
    const hinge=new T.Group();hinge.position.set(-1,.18,0);g.add(hinge);
    box(1.96,2.22,.15,wood,.98,1.11,0,hinge);box(.08,.08,.18,stone,1.72,1.12,.12,hinge);g.userData.doorHinge=hinge;
  }
  if(type==='roof') {
    for(const sign of [-1,1]){const m=box(1.72,.14,3.25,wood,sign*.76,3.18,0);m.rotation.z=-sign*.38;}
    box(.12,.16,3.28,trim,0,3.5,0);
  }
  if(type==='chest') {box(1.5,.85,.95,wood,0,.55,0);box(1.56,.16,1.01,trim,0,1.04,0);box(.18,.28,.05,stone,0,.88,.51);for(const x of [-.55,.55])box(.08,.83,.98,trim,x,.57,0);}
  if(type==='rug') {box(1.9,.025,1.4,mat(0xb46e56),0,.19,0);for(const z of [-.58,.58])box(1.8,.012,.08,mat(0xe8cea1),0,.21,z);}
  if(type==='planter') {
    view.mesh(new T.CylinderGeometry(.35,.25,.45,8),mat(0xad7551),0,.38,0,g);
    view.mesh(new T.CylinderGeometry(.025,.035,.65,6),trim,0,.82,0,g);
    for(const [x,y,z]of [[0,1.12,0],[.2,.92,.1],[-.18,.9,-.1]])view.mesh(new T.IcosahedronGeometry(.28,0),mat(0x79a763),x,y,z,g);
  }
  g.userData.homeType=type;
}
export function updateHomeMesh(g,b,player) {
  if(g.userData.doorHinge)g.userData.doorHinge.rotation.y=b.open?-Math.PI*.5:0;
  const level=b.level||1;
  if(['floor','wall','door','roof'].includes(b.type) && g.userData.level!==level) {
    g.traverse(o=>{if(o.isMesh){o.material.userData.originalColor ||= o.material.color.getHex();o.material.color.setHex(level===3?0x8aa8b4:level===2?0x8c918d:o.material.userData.originalColor);}});
    g.userData.level=level;
  }
  if(b.type==='roof') {
    const fade=Math.abs(player.x-b.x)<2.3&&Math.abs(player.z-b.z)<2.3;
    g.traverse(o=>{if(o.isMesh){o.material.transparent=fade;o.material.opacity=fade?.18:1;o.material.depthWrite=!fade;}});
  }
}
