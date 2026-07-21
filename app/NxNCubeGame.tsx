"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SiteHeader from "@/components/SiteHeader";

type Axis = "x" | "y" | "z";
type Direction = 1 | -1;
type Move = { axis: Axis; layer: number; direction: Direction; label: string; record?: boolean };
type Cubie = { mesh: THREE.Mesh; grid: THREE.Vector3; home: THREE.Vector3 };
type PointerStart = { pointerId: number; clientX: number; clientY: number; cubie: Cubie; normal: THREE.Vector3 };
type ViewMode = "turn" | "move";
type Gesture = { axis: Axis; layer: number; direction: Direction };

const COLORS = { R: "#e52b3d", L: "#ff7a00", U: "#f5f1e8", D: "#ffd500", F: "#00a85a", B: "#1557d5", I: "#111319" };
const axisVector = (axis: Axis) => axis === "x" ? new THREE.Vector3(1,0,0) : axis === "y" ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1);
const dominantAxis = (v: THREE.Vector3): Axis => { const a=[Math.abs(v.x),Math.abs(v.y),Math.abs(v.z)]; const i=a.indexOf(Math.max(...a)); return i===0?"x":i===1?"y":"z"; };
const snap = (value:number,size:number) => Math.round(value+(size-1)/2)-(size-1)/2;
const moveLabel = (axis:Axis,layer:number,edge:number,direction:Direction) => {
  const depth=Math.round(edge-Math.abs(layer))+1;
  const side=layer>0?(axis==="x"?"R":axis==="y"?"U":"F"):(axis==="x"?"L":axis==="y"?"D":"B");
  return `${depth>1?depth:""}${side}${direction<0?"′":""}`;
};

export default function NxNCubeGame({ size=10 }: { size?:number }) {
  const mountRef=useRef<HTMLDivElement>(null);
  const actionsRef=useRef<{
    turn:(move:Move)=>void; scramble:()=>void; undo:()=>void; resetCube:()=>void; resetView:()=>void; setViewMode:(mode:ViewMode)=>void;
  }|null>(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState(`${size}×${size} ready`);
  const [moves,setMoves]=useState(0);
  const [canUndo,setCanUndo]=useState(false);
  const [viewMode,setViewMode]=useState<ViewMode>("turn");

  useEffect(()=>{
    const mount=mountRef.current;
    if(!mount) return;

    const scene=new THREE.Scene();
    scene.background=new THREE.Color("#080b14");
    const camera=new THREE.PerspectiveCamera(18,1,.1,400);
    const distance=size*4.15;
    camera.position.set(distance*.62,distance*.54,distance);

    const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.55));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction="none";
    mount.appendChild(renderer.domElement);

    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;
    controls.dampingFactor=.075;
    controls.enablePan=true;
    controls.screenSpacePanning=true;
    controls.enableZoom=true;
    controls.zoomSpeed=.9;
    controls.rotateSpeed=.72;
    controls.panSpeed=.8;
    controls.minDistance=size*1.15;
    controls.maxDistance=size*7;
    controls.target.set(0,0,0);
    controls.touches.ONE=THREE.TOUCH.ROTATE;
    controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff","#223052",2.2));
    const key=new THREE.DirectionalLight("#ffffff",2.4); key.position.set(8,12,10); scene.add(key);
    const rim=new THREE.DirectionalLight("#5c7cff",1.4); rim.position.set(-10,3,-8); scene.add(rim);

    const root=new THREE.Group(); scene.add(root);
    const edge=(size-1)/2;
    const geometry=new THREE.BoxGeometry(.92,.92,.92);
    const cubies:Cubie[]=[];
    const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.38,metalness:.02});

    for(let xi=0;xi<size;xi++) for(let yi=0;yi<size;yi++) for(let zi=0;zi<size;zi++) {
      const exterior=xi===0||yi===0||zi===0||xi===size-1||yi===size-1||zi===size-1;
      if(!exterior) continue;
      const x=xi-edge,y=yi-edge,z=zi-edge;
      const mats=[material(x===edge?COLORS.R:COLORS.I),material(x===-edge?COLORS.L:COLORS.I),material(y===edge?COLORS.U:COLORS.I),material(y===-edge?COLORS.D:COLORS.I),material(z===edge?COLORS.F:COLORS.I),material(z===-edge?COLORS.B:COLORS.I)];
      const mesh=new THREE.Mesh(geometry,mats); mesh.position.set(x,y,z); root.add(mesh);
      cubies.push({mesh,grid:new THREE.Vector3(x,y,z),home:new THREE.Vector3(x,y,z)});
    }

    const raycaster=new THREE.Raycaster();
    const pointer=new THREE.Vector2();
    let pointerStart:PointerStart|null=null;
    let previewGesture:Gesture|null=null;
    let activePointers=0;
    let highlighted:Cubie[]=[];
    let currentMode:ViewMode="turn";
    const queue:Move[]=[];
    const history:Move[]=[];
    let active=false;

    const clearHighlight=()=>{
      highlighted.forEach(c=>{ const mats=Array.isArray(c.mesh.material)?c.mesh.material:[c.mesh.material]; mats.forEach(m=>{ const mat=m as THREE.MeshStandardMaterial; mat.emissive.setHex(0); mat.emissiveIntensity=0; }); });
      highlighted=[];
      previewGesture=null;
    };
    const highlightLayer=(axis:Axis,layer:number)=>{
      clearHighlight();
      highlighted=cubies.filter(c=>Math.abs(c.grid[axis]-layer)<.01);
      highlighted.forEach(c=>{ const mats=Array.isArray(c.mesh.material)?c.mesh.material:[c.mesh.material]; mats.forEach(m=>{ const mat=m as THREE.MeshStandardMaterial; mat.emissive.set("#4d7cff"); mat.emissiveIntensity=.32; }); });
    };

    const runNext=()=>{
      if(active||!queue.length) return;
      clearHighlight(); active=true; setBusy(true);
      const move=queue.shift()!;
      const selected=cubies.filter(c=>Math.abs(c.grid[move.axis]-move.layer)<.01);
      const pivot=new THREE.Group(); root.add(pivot); selected.forEach(c=>pivot.attach(c.mesh));
      const started=performance.now();
      const animate=(now:number)=>{
        const p=Math.min(1,(now-started)/245); const eased=1-Math.pow(1-p,3);
        pivot.rotation[move.axis]=move.direction*Math.PI*.5*eased;
        if(p<1){ requestAnimationFrame(animate); return; }
        pivot.updateMatrixWorld(true);
        const rotation=new THREE.Matrix4().makeRotationAxis(axisVector(move.axis),move.direction*Math.PI*.5);
        selected.forEach(c=>{ root.attach(c.mesh); c.mesh.position.set(snap(c.mesh.position.x,size),snap(c.mesh.position.y,size),snap(c.mesh.position.z,size)); c.grid.applyMatrix4(rotation).set(snap(c.grid.x,size),snap(c.grid.y,size),snap(c.grid.z,size)); });
        root.remove(pivot);
        if(move.record!==false) history.push({...move,record:true});
        setCanUndo(history.length>0); setMoves(history.length); setStatus(`${move.label} complete`);
        active=false; setBusy(queue.length>0); runNext();
      };
      requestAnimationFrame(animate);
    };

    const turn=(move:Move)=>{ queue.push({...move,record:move.record!==false}); runNext(); };
    const outerMoves:Record<string,Move>={
      R:{axis:"x",layer:edge,direction:-1,label:"R"}, L:{axis:"x",layer:-edge,direction:1,label:"L"},
      U:{axis:"y",layer:edge,direction:-1,label:"U"}, D:{axis:"y",layer:-edge,direction:1,label:"D"},
      F:{axis:"z",layer:edge,direction:-1,label:"F"}, B:{axis:"z",layer:-edge,direction:1,label:"B"},
    };
    const scramble=()=>{ if(active) return; const labels=Object.keys(outerMoves); for(let i=0;i<16;i++){ const label=labels[Math.floor(Math.random()*labels.length)]; const base=outerMoves[label]; queue.push({...base,direction:Math.random()>.5?base.direction:(base.direction*-1) as Direction,record:true}); } setStatus(`Scrambling ${size}×${size}…`); runNext(); };
    const undo=()=>{ if(active||queue.length||!history.length) return; const previous=history.pop()!; setCanUndo(history.length>0); setMoves(history.length); queue.push({axis:previous.axis,layer:previous.layer,direction:(previous.direction*-1) as Direction,label:`Undo ${previous.label}`,record:false}); runNext(); };
    const resetCube=()=>{ if(active) return; queue.length=0; history.length=0; clearHighlight(); cubies.forEach(c=>{c.mesh.position.copy(c.home);c.mesh.quaternion.identity();c.grid.copy(c.home);}); setCanUndo(false); setMoves(0); setStatus(`${size}×${size} reset`); };
    const resetView=()=>{ controls.reset(); setStatus("View reset"); };
    const setMode=(mode:ViewMode)=>{
      currentMode=mode;
      pointerStart=null;
      previewGesture=null;
      clearHighlight();
      controls.enabled=true;
      controls.touches.ONE=mode==="move"?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE;
      renderer.domElement.style.cursor=mode==="move"?"grab":"default";
      setStatus(mode==="move"?"Move mode: drag the cube anywhere":"Turn mode: swipe stickers to move layers");
    };
    actionsRef.current={turn,scramble,undo,resetCube,resetView,setViewMode:setMode};

    const setPointerFromEvent=(event:PointerEvent)=>{ const rect=renderer.domElement.getBoundingClientRect(); pointer.x=((event.clientX-rect.left)/rect.width)*2-1; pointer.y=-((event.clientY-rect.top)/rect.height)*2+1; raycaster.setFromCamera(pointer,camera); };
    const projectedScreenDirection=(worldDirection:THREE.Vector3)=>{ const origin=new THREE.Vector3(0,0,0).project(camera); const endpoint=worldDirection.clone().project(camera); return new THREE.Vector2(endpoint.x-origin.x,-(endpoint.y-origin.y)).normalize(); };
    const resolveGesture=(start:PointerStart,dx:number,dy:number):Gesture=>{
      const faceAxis=dominantAxis(start.normal);
      const candidates=(["x","y","z"] as Axis[]).filter(a=>a!==faceAxis);
      const drag=new THREE.Vector2(dx,dy).normalize();
      const tangentAxis=candidates.reduce((best,axis)=>{ const score=Math.abs(drag.dot(projectedScreenDirection(axisVector(axis)))); return score>best.score?{axis,score}:best; },{axis:candidates[0],score:-1});
      const worldTangent=axisVector(tangentAxis.axis); if(drag.dot(projectedScreenDirection(worldTangent))<0) worldTangent.multiplyScalar(-1);
      const rotationVector=start.normal.clone().cross(worldTangent).normalize(); const rotationAxis=dominantAxis(rotationVector);
      return {axis:rotationAxis,layer:start.cubie.grid[rotationAxis],direction:(Math.sign(rotationVector[rotationAxis])||1) as Direction};
    };

    const onPointerDown=(event:PointerEvent)=>{
      activePointers+=1;
      previewGesture=null;
      if(currentMode==="move"){ pointerStart=null; controls.enabled=true; renderer.domElement.style.cursor="grabbing"; return; }
      if(active||activePointers>1){ pointerStart=null; controls.enabled=true; clearHighlight(); return; }
      setPointerFromEvent(event);
      const hit=raycaster.intersectObjects(cubies.map(c=>c.mesh),false)[0];
      if(!hit||!hit.face){ controls.enabled=true; return; }
      const cubie=cubies.find(c=>c.mesh===hit.object); if(!cubie) return;
      const normalMatrix=new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      const normal=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      pointerStart={pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,cubie,normal};
      event.preventDefault();
      controls.enabled=false; renderer.domElement.setPointerCapture(event.pointerId); setStatus("Swipe a row or column");
    };
    const onPointerMove=(event:PointerEvent)=>{
      if(currentMode==="move"||!pointerStart||event.pointerId!==pointerStart.pointerId||activePointers>1) return;
      event.preventDefault();
      const dx=event.clientX-pointerStart.clientX,dy=event.clientY-pointerStart.clientY; if(Math.hypot(dx,dy)<16) return;
      const g=resolveGesture(pointerStart,dx,dy); previewGesture=g; highlightLayer(g.axis,g.layer); previewGesture=g; setStatus(`Selected ${moveLabel(g.axis,g.layer,edge,g.direction)} layer`);
    };
    const finishPointer=(event:PointerEvent)=>{
      activePointers=Math.max(0,activePointers-1);
      if(currentMode==="move"){ renderer.domElement.style.cursor="grab"; if(activePointers===0) controls.enabled=true; return; }
      if(!pointerStart||event.pointerId!==pointerStart.pointerId){ if(activePointers===0) controls.enabled=true; return; }
      const start=pointerStart; pointerStart=null;
      const dx=event.clientX-start.clientX,dy=event.clientY-start.clientY;
      if(Math.hypot(dx,dy)>=34&&!active){ const g=previewGesture??resolveGesture(start,dx,dy); turn({...g,label:moveLabel(g.axis,g.layer,edge,g.direction)}); }
      else { clearHighlight(); setStatus(`${size}×${size} ready`); }
      controls.enabled=activePointers===0;
    };

    renderer.domElement.addEventListener("pointerdown",onPointerDown,true);
    renderer.domElement.addEventListener("pointermove",onPointerMove,true);
    renderer.domElement.addEventListener("pointerup",finishPointer,true);
    renderer.domElement.addEventListener("pointercancel",finishPointer,true);

    const resize=()=>{ const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); };
    const observer=new ResizeObserver(resize); observer.observe(mount); resize();
    let frame=0; const render=()=>{frame=requestAnimationFrame(render);controls.update();renderer.render(scene,camera);}; render();

    return()=>{
      cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown",onPointerDown,true); renderer.domElement.removeEventListener("pointermove",onPointerMove,true); renderer.domElement.removeEventListener("pointerup",finishPointer,true); renderer.domElement.removeEventListener("pointercancel",finishPointer,true);
      controls.dispose(); actionsRef.current=null;
      cubies.forEach(c=>(Array.isArray(c.mesh.material)?c.mesh.material:[c.mesh.material]).forEach(m=>m.dispose()));
      geometry.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  },[size]);

  const edge=(size-1)/2;
  const faceMoves:Record<string,Move>={R:{axis:"x",layer:edge,direction:-1,label:"R"},L:{axis:"x",layer:-edge,direction:1,label:"L"},U:{axis:"y",layer:edge,direction:-1,label:"U"},D:{axis:"y",layer:-edge,direction:1,label:"D"},F:{axis:"z",layer:edge,direction:-1,label:"F"},B:{axis:"z",layer:-edge,direction:1,label:"B"}};
  const changeMode=(mode:ViewMode)=>{ setViewMode(mode); actionsRef.current?.setViewMode(mode); };
  const isPlayableCore=size<=5;
  const stageClass=isPlayableCore?"h-[430px] sm:h-[470px]":"h-[390px] sm:h-[440px]";
  const eyebrow=isPlayableCore?`PLAYABLE ${size}×${size} CUBE`:"PLAYABLE LARGE CUBE";
  const description=isPlayableCore
    ?"Swipe stickers first. Buttons stay tucked away for backup moves, undo, scramble, and view control."
    :"Swipe exact layers, rotate the cube, or switch to Move mode to position it anywhere inside the viewport.";

  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
    <div className="orb orb-a"/><div className="orb orb-b"/>
    <div className="relative z-[1]">
      <SiteHeader/>
      <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
      <section className="mt-5"><p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">{eyebrow}</p><h1 className="mt-2 text-[39px] font-extrabold leading-[1.02] tracking-[-1px]">Play the<br/><span className="accent-text">{size}×{size} Cube</span></h1><p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">{description}</p></section>

      <section className="glass mt-3 overflow-hidden rounded-[22px]">
        <div className="flex justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]"><span>{status}</span><strong className="text-[var(--text)]">{moves} moves</strong></div>
        <div ref={mountRef} className={`${stageClass} w-full touch-none`}/>
      </section>

      {isPlayableCore ? <details className="glass mt-3 rounded-[18px] p-3">
        <summary className="cursor-pointer text-sm font-extrabold text-[var(--muted)]">Face buttons</summary>
        <div className="mt-3 grid grid-cols-3 gap-2">{Object.entries(faceMoves).map(([label,move])=><button key={label} disabled={busy||viewMode==="move"} onClick={()=>actionsRef.current?.turn(move)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}</button>)}</div>
      </details> : <div className="mt-3 grid grid-cols-3 gap-2">{Object.entries(faceMoves).map(([label,move])=><button key={label} disabled={busy||viewMode==="move"} onClick={()=>actionsRef.current?.turn(move)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}</button>)}</div>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={()=>changeMode("turn")} className={`${viewMode==="turn"?"cta-purple":"glass"} min-h-12 rounded-xl font-extrabold`}>Turn Cube</button>
        <button onClick={()=>changeMode("move")} className={`${viewMode==="move"?"cta-purple":"glass"} min-h-12 rounded-xl font-extrabold`}>Move Cube</button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2"><button disabled={busy} onClick={()=>actionsRef.current?.scramble()} className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40">Scramble</button><button disabled={busy||!canUndo} onClick={()=>actionsRef.current?.undo()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">↶ Undo</button><button onClick={()=>actionsRef.current?.resetView()} className="glass min-h-12 rounded-xl font-extrabold">Reset View</button></div>
      <button disabled={busy} onClick={()=>actionsRef.current?.resetCube()} className="glass mt-2 min-h-12 w-full rounded-xl font-extrabold disabled:opacity-40">Reset Cube</button>

      <section className="glass mt-4 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
        <p><strong className="text-[var(--text)]">Turn Cube:</strong> sticker swipes keep the current highlight and long-dwell layer mechanics.</p>
        <p><strong className="text-[var(--text)]">Move Cube:</strong> drag with one finger to reposition the cube inside the viewport.</p>
        <p><strong className="text-[var(--text)]">Two fingers:</strong> pinch to zoom and drag together to pan in either mode.</p>
      </section>
    </div>
  </main>;
}
