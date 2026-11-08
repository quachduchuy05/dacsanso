/** Reproducible procedural concept models; not scans or verified supplier packaging. */
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mkdir,writeFile} from 'node:fs/promises';
class NodeFileReader {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(data=>{this.result=`data:${blob.type};base64,${Buffer.from(data).toString('base64')}`;this.onloadend?.();});}
}
globalThis.FileReader??=NodeFileReader;
const out=new URL('../public/models/concepts/',import.meta.url);await mkdir(out,{recursive:true});
const mat=(color,metalness=0,roughness=.55)=>new T.MeshStandardMaterial({color,metalness,roughness});
const bronze=mat('#a77839',.78,.28),ivory=mat('#eee0c5'),green=mat('#56833b'),amber=mat('#d98c0b',.1,.22),plum=mat('#8b294a',.05,.4);
const sphere=new T.SphereGeometry(1,24,16),grain=new T.SphereGeometry(1,10,6);
let seed=9;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
function mesh(group,geometry,material,x,y,z,sx=1,sy=sx,sz=sx){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);group.add(m);return m;}
function cylinder(g,r,h,y,material,top=r){return mesh(g,new T.CylinderGeometry(top,r,h,64),material,0,y,0);}
function base(){const g=new T.Group();cylinder(g,1.22,.12,.06,ivory);return g;}
function jar(kind){const g=base();const fill=kind==='honey'?amber:mat('#642636');
  cylinder(g,.58,1.35,.82,fill,.57);cylinder(g,.60,.09,.17,bronze);cylinder(g,.55,.18,1.55,fill);cylinder(g,.63,.17,1.72,bronze);
  cylinder(g,.587,.57,.91,ivory,.577);
  const glass=new T.MeshPhysicalMaterial({color:'#fff6dc',transparent:true,opacity:.18,roughness:.13,metalness:0,depthWrite:false});cylinder(g,.606,1.39,.83,glass,.596);
  if(kind==='plum-preserve'){for(let i=0;i<28;i++){const a=i*2.4,r=.42*Math.sqrt(random());mesh(g,sphere,plum,Math.cos(a)*r,.28+random()*1.16,Math.sin(a)*r,.115,.12,.11);}}
  return g;
}
function tea(){const g=base();cylinder(g,.67,.95,.62,bronze);cylinder(g,.61,.05,1.11,mat('#342c20'));for(let i=0;i<65;i++){const a=random()*Math.PI*2,r=.55*Math.sqrt(random()),m=mesh(g,grain,mat(i%3?'#50402b':'#8a7652'),Math.cos(a)*r,1.16+random()*.08,Math.sin(a)*r,.12,.025,.03);m.rotation.y=random()*6;}const lid=cylinder(g,.69,.08,1.15,bronze);lid.position.set(-.62,.83,-.4);lid.rotation.z=.9;return g;}
function bowl(g){const points=[new T.Vector2(0,.14),new T.Vector2(.42,.14),new T.Vector2(.69,.28),new T.Vector2(.9,.55),new T.Vector2(.92,.59),new T.Vector2(.88,.59),new T.Vector2(.64,.31),new T.Vector2(.39,.2),new T.Vector2(0,.2)];mesh(g,new T.LatheGeometry(points,48),bronze,0,0,0);}
function pouch(g,color){const shape=new T.Shape();shape.moveTo(-.55,0);shape.lineTo(.55,0);shape.lineTo(.48,1.55);shape.lineTo(-.48,1.55);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:true,bevelSize:.06,bevelThickness:.05,bevelSegments:3,steps:1});mesh(g,geo,mat(color),.16,.16,-.55);mesh(g,new T.BoxGeometry(.94,.4,.025),ivory,.16,1,-.19);}
function rice(){const g=base();pouch(g,'#c9b58c');bowl(g);for(let i=0;i<210;i++){const a=random()*6.28,r=.68*Math.sqrt(random());const m=mesh(g,grain,ivory,Math.cos(a)*r,.51+.22*(1-r/.8)+random()*.06,Math.sin(a)*r+.16,.025,.022,.075);m.rotation.y=random()*6.28;}return g;}
function noodles(){const g=base();pouch(g,'#a66768');const pink=mat('#c99199');for(let i=0;i<18;i++){const noodle=mesh(g,new T.TorusGeometry(.46,.018,4,64),pink,-.2,.2+i*.025,.25,1,.55,1);noodle.rotation.x=Math.PI/2+(i%3)*.04;noodle.rotation.z=i*.17;}return g;}
function fruit(kind){const g=base();if(kind==='dai-minh-pomelo'){mesh(g,sphere,mat('#b6b94b'),0,.91,0,.78,.82,.78);mesh(g,new T.CylinderGeometry(.025,.04,.18,10),bronze,0,1.75,0);const leaf=mesh(g,sphere,green,.21,1.78,0,.3,.025,.1);leaf.rotation.z=-.25;}else{bowl(g);for(let i=0;i<12;i++){const a=i*2.4,r=i<7?.52:.3;const f=mesh(g,sphere,i%2?plum:mat('#af4860'),Math.cos(a)*r,.55+Math.floor(i/7)*.38,Math.sin(a)*r,.28,.29,.28);mesh(f,new T.CylinderGeometry(.02,.025,.2,8),bronze,0,1,0);}}return g;}
function cardamom(){const g=base();bowl(g);const material=mat('#633426');for(let i=0;i<13;i++){const a=i*2.4,r=.57*Math.sqrt(random()),pod=mesh(g,sphere,material,Math.cos(a)*r,.57+random()*.22,Math.sin(a)*r,.17,.19,.32);pod.rotation.set(random(),random()*3,random());for(let j=0;j<7;j++){const t=j*6.28/7;const ridge=mesh(pod,new T.TorusGeometry(.76,.04,4,20),mat('#86503a'),0,0,0,.95,.95,1.22);ridge.rotation.y=t;}}return g;}
function com(){const g=base();const leaf=mesh(g,new T.SphereGeometry(1,32,16,0,Math.PI*2,Math.PI/2,Math.PI/2),green,0,.6,0,1,.45,.8);leaf.material.side=T.DoubleSide;const light=mat('#a7bc67');for(let i=0;i<240;i++){const a=random()*6.28,r=.75*Math.sqrt(random());const flake=mesh(g,grain,light,Math.cos(a)*r,.46+.29*(1-r/.85)+random()*.05,Math.sin(a)*r,.045,.009,.07);flake.rotation.y=random()*6;}return g;}
const builders={'honey':()=>jar('honey'),'plum-preserve':()=>jar('plum-preserve'),'shan-tea':tea,'cardamom':cardamom,'seng-cu-rice':rice,'pink-noodles':noodles,'fresh-plums':()=>fruit('plums'),'dai-minh-pomelo':()=>fruit('dai-minh-pomelo'),'tu-le-com':com};
for(const [slug,build] of Object.entries(builders)){seed=9;const scene=new T.Scene(),g=build();g.name=slug+'-concept';scene.add(g);const binary=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});await writeFile(new URL(slug+'-v1.glb',out),Buffer.from(binary));console.log(slug,Math.round(binary.byteLength/1024)+' KB');}
