"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import SiteHeader from "@/components/SiteHeader";

type Axis = "x" | "y" | "z";
type Direction = 1 | -1;
type Move = { axis: Axis; layer: number; direction: Direction; label: string; record?: boolean };
type Cubie = { mesh: THREE.Group; grid: THREE.Vector3; home: THREE.Vector3 };
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
function formatElapsed(ms: number) {
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export default function NxNCubeGame({ size=10, variant="full" }: { size?:number; variant?: "full" | "focus" }) {
  const mountRef=useRef<HTMLDivElement>(null);
  const actionsRef=useRef<{
    turn:(move:Move)=>void; scramble:()=>void; undo:()=>void; resetCube:()=>void; resetView:()=>void; setViewMode:(mode:ViewMode)=>void;
  }|null>(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState(`${size}×${size} ready`);
  const [moves,setMoves]=useState(0);
  const [canUndo,setCanUndo]=useState(false);
  const [viewMode,setViewMode]=useState<ViewMode>("turn");
  const [isSolvedNow,setIsSolvedNow]=useState(true);
  const [scrambleSequence,setScrambleSequence]=useState("");
  const [elapsedMs,setElapsedMs]=useState(0);

  // Same single-long-lived-interval-plus-refs timer as app/PyraminxGame.tsx
  // (see CUBE-ENGINE-NOTES.md) — start/stop/reset are plain functions over
  // refs, not effect state, so they can be called from deep inside the turn
  // queue's completion callback (runNext, below) without re-running this
  // effect or fighting React's render cycle.
  const accumulatedMsRef=useRef(0);
  const segmentStartRef=useRef<number|null>(null);
  const startTimer=()=>{ if(segmentStartRef.current===null) segmentStartRef.current=performance.now(); };
  const stopTimer=()=>{
    if(segmentStartRef.current===null) return;
    accumulatedMsRef.current+=performance.now()-segmentStartRef.current;
    segmentStartRef.current=null;
    setElapsedMs(accumulatedMsRef.current);
  };
  const resetTimer=()=>{ accumulatedMsRef.current=0; segmentStartRef.current=null; setElapsedMs(0); };
  useEffect(()=>{
    const id=setInterval(()=>{
      if(segmentStartRef.current!==null) setElapsedMs(accumulatedMsRef.current+(performance.now()-segmentStartRef.current));
    },100);
    return()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    const mount=mountRef.current;
    if(!mount) return;

    const scene=new THREE.Scene();
    const focusLayout=variant==="focus";
    const focusZoom=5.02*((size-1)/2+.468);
    scene.background=focusLayout?null:new THREE.Color("#080b14");
    const camera=new THREE.PerspectiveCamera(focusLayout?37:18,1,.1,400);
    const distance=focusLayout?focusZoom:size*4.15;
    camera.position.set(distance*.82,distance*.68,distance);

    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:focusLayout,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.55));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    if(focusLayout) renderer.setClearAlpha(0);
    renderer.domElement.style.touchAction="none";
    renderer.domElement.style.display="block";
    renderer.domElement.style.width="100%";
    renderer.domElement.style.height="100%";
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
    controls.minDistance=size*(focusLayout?1.35:1.15);
    controls.maxDistance=size*(focusLayout?4.8:7);
    controls.target.set(0,0,0);
    controls.touches.ONE=THREE.TOUCH.ROTATE;
    controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
    controls.update();
    controls.saveState();

    scene.add(new THREE.HemisphereLight("#ffffff","#223052",2.2));
    const key=new THREE.DirectionalLight("#ffffff",2.4); key.position.set(8,12,10); scene.add(key);
    const rim=new THREE.DirectionalLight("#5c7cff",1.4); rim.position.set(-10,3,-8); scene.add(rim);

    const root=new THREE.Group();
    scene.add(root);
    const edge=(size-1)/2;
    const bodyGeometry=new THREE.BoxGeometry(.9,.9,.9);
    const stickerGeometry=new THREE.BoxGeometry(.76,.76,.045);
    const cubies:Cubie[]=[];
    const materials:THREE.Material[]=[];
    // `disposed` guards the per-move turn animation's own rAF chain (see
    // `moveFrame` in runNext below). That chain is separate from the render
    // loop's `frame`, so unmounting mid-turn — e.g. navigating away while a
    // scramble is still animating — used to leave it running after teardown,
    // still mutating cube state and calling the React setters below on an
    // already-unmounted component. Cleanup cancels `moveFrame` outright, and
    // this flag catches the case where a frame was already in flight the
    // instant cleanup ran.
    let disposed=false;
    const material=(color:string,sticker=false)=>{
      const mat=new THREE.MeshStandardMaterial({
        color,
        roughness:sticker ? .28 : .38,
        metalness:sticker ? .025 : .08,
        emissive:sticker?color:"#000000",
        emissiveIntensity:sticker ? .035 : 0
      });
      materials.push(mat);
      return mat;
    };
    const addSticker=(group:THREE.Group,color:string,position:[number,number,number],rotation:[number,number,number]=[0,0,0])=>{
      const sticker=new THREE.Mesh(stickerGeometry,material(color,true));
      sticker.position.set(...position);
      sticker.rotation.set(...rotation);
      sticker.userData.isSticker=true;
      group.add(sticker);
    };

    const bodyMaterial=material(COLORS.I);
    for(let xi=0;xi<size;xi++) for(let yi=0;yi<size;yi++) for(let zi=0;zi<size;zi++) {
      const exterior=xi===0||yi===0||zi===0||xi===size-1||yi===size-1||zi===size-1;
      if(!exterior) continue;
      const x=xi-edge,y=yi-edge,z=zi-edge;
      const mesh=new THREE.Group();
      mesh.position.set(x,y,z);
      const body=new THREE.Mesh(bodyGeometry,bodyMaterial);
      mesh.add(body);
      if(x===edge) addSticker(mesh,COLORS.R,[.468,0,0],[0,Math.PI/2,0]);
      if(x===-edge) addSticker(mesh,COLORS.L,[-.468,0,0],[0,Math.PI/2,0]);
      if(y===edge) addSticker(mesh,COLORS.U,[0,.468,0],[Math.PI/2,0,0]);
      if(y===-edge) addSticker(mesh,COLORS.D,[0,-.468,0],[Math.PI/2,0,0]);
      if(z===edge) addSticker(mesh,COLORS.F,[0,0,.468]);
      if(z===-edge) addSticker(mesh,COLORS.B,[0,0,-.468]);
      root.add(mesh);
      const cubie={mesh,grid:new THREE.Vector3(x,y,z),home:new THREE.Vector3(x,y,z)};
      mesh.traverse(child=>{ child.userData.cubie=cubie; });
      cubies.push(cubie);
    }
    const cubieMeshes=cubies.map(c=>c.mesh);
    // A cubie is "home" when both its current grid slot matches where it
    // started AND its accumulated rotation (mesh.quaternion, which `attach`
    // keeps in sync with the cubie's real orientation as it's reparented
    // through each turn's pivot group) is back to identity — position alone
    // isn't enough, since a cubie can cycle back to its own home slot with
    // its stickers still rotated 90°/180° out of alignment. The cube overall
    // is solved exactly when every cubie is home in both senses at once.
    const identityQuaternion=new THREE.Quaternion();
    const isSolved=()=>cubies.every(c=>
      Math.abs(c.grid.x-c.home.x)<.01 && Math.abs(c.grid.y-c.home.y)<.01 && Math.abs(c.grid.z-c.home.z)<.01 &&
      c.mesh.quaternion.angleTo(identityQuaternion)<.01
    );

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

    const glowCubie=(cubie:Cubie,intensity:number)=>{
      cubie.mesh.traverse(child=>{
        if(!(child instanceof THREE.Mesh)) return;
        if(!child.userData.isSticker) return;
        const mats=Array.isArray(child.material)?child.material:[child.material];
        mats.forEach(m=>{
          const mat=m as THREE.MeshStandardMaterial;
          mat.emissive.set(intensity ? "#4d7cff" : mat.color);
          mat.emissiveIntensity=intensity || .035;
        });
      });
    };
    const clearHighlight=()=>{
      highlighted.forEach(c=>glowCubie(c,0));
      highlighted=[];
      previewGesture=null;
    };
    const highlightLayer=(axis:Axis,layer:number)=>{
      clearHighlight();
      highlighted=cubies.filter(c=>Math.abs(c.grid[axis]-layer)<.01);
      highlighted.forEach(c=>glowCubie(c,.32));
    };

    let moveFrame=0;
    const runNext=()=>{
      if(active||!queue.length) return;
      clearHighlight(); active=true; setBusy(true);
      const move=queue.shift()!;
      const selected=cubies.filter(c=>Math.abs(c.grid[move.axis]-move.layer)<.01);
      const pivot=new THREE.Group(); root.add(pivot); selected.forEach(c=>pivot.attach(c.mesh));
      const started=performance.now();
      const animate=(now:number)=>{
        if(disposed) return;
        const p=Math.min(1,(now-started)/245); const eased=1-Math.pow(1-p,3);
        pivot.rotation[move.axis]=move.direction*Math.PI*.5*eased;
        if(p<1){ moveFrame=requestAnimationFrame(animate); return; }
        pivot.updateMatrixWorld(true);
        const rotation=new THREE.Matrix4().makeRotationAxis(axisVector(move.axis),move.direction*Math.PI*.5);
        selected.forEach(c=>{ root.attach(c.mesh); c.mesh.position.set(snap(c.mesh.position.x,size),snap(c.mesh.position.y,size),snap(c.mesh.position.z,size)); c.grid.applyMatrix4(rotation).set(snap(c.grid.x,size),snap(c.grid.y,size),snap(c.grid.z,size)); });
        root.remove(pivot);
        // Scramble setup is queued with record:false — excluded from the
        // move count and undo stack, since it isn't the player's own
        // solving effort (mirrors app/PyraminxGame.tsx's scramble/undo
        // model; see CUBE-ENGINE-NOTES.md).
        if(move.record!==false) history.push({...move,record:true});
        setCanUndo(history.length>0); setMoves(history.length);
        const solvedNow=isSolved();
        setIsSolvedNow(solvedNow);
        setStatus(solvedNow?"Solved!":`${move.label} complete`);
        if(solvedNow) stopTimer(); else startTimer();
        active=false; setBusy(queue.length>0); runNext();
      };
      moveFrame=requestAnimationFrame(animate);
    };

    const turn=(move:Move)=>{ queue.push({...move,record:move.record!==false}); runNext(); };
    // Scramble picks from EVERY layer along every axis, not just the six
    // outermost faces (R/L/U/D/F/B). The original version only ever queued
    // outer-layer turns, so on a 4x4+ cube the inner slices — most of a
    // large cube's surface — never moved: each face turn just spun its
    // whole layer as one rigid block, leaving the interior of every face
    // looking suspiciously tidy after "scrambling". Sampling any axis+layer
    // pair reuses the same turn/runNext machinery that already drives
    // arbitrary-layer swipe turns (see resolveGesture/turnLayer above), so
    // this is exercising an already-correct code path more broadly, not new
    // untested logic. `layerValues` is every legal layer position for the
    // current size (e.g. for size=4, edge=1.5: [-1.5,-0.5,0.5,1.5]).
    const layerValues=Array.from({length:size},(_,k)=>k-edge);
    const axes:Axis[]=["x","y","z"];
    const scramble=()=>{
      if(active) return;
      let lastAxis:Axis|null=null,lastLayer:number|null=null;
      const moveCount=Math.max(16,size*4);
      const labels:string[]=[];
      for(let i=0;i<moveCount;i++){
        let axis:Axis,layer:number;
        // Avoid immediately repeating the same axis+layer twice in a row so
        // consecutive scramble moves can't trivially cancel each other out
        // (e.g. R followed by R' undoing itself).
        do{
          axis=axes[Math.floor(Math.random()*axes.length)];
          layer=layerValues[Math.floor(Math.random()*layerValues.length)];
        }while(axis===lastAxis&&layer===lastLayer);
        lastAxis=axis; lastLayer=layer;
        const direction=(Math.random()>.5?1:-1) as Direction;
        const label=moveLabel(axis,layer,edge,direction);
        labels.push(label);
        // record:false — matches app/PyraminxGame.tsx: scramble moves don't
        // count toward the player's move total and aren't individually
        // undoable, so undo can't be used to unscramble one move at a time.
        queue.push({axis,layer,direction,label,record:false});
      }
      setScrambleSequence(labels.join(" "));
      setStatus(`Scrambling ${size}×${size}…`);
      history.length=0; setCanUndo(false); setMoves(0);
      resetTimer(); startTimer();
      runNext();
    };
    const undo=()=>{ if(active||queue.length||!history.length) return; const previous=history.pop()!; setCanUndo(history.length>0); setMoves(history.length); queue.push({axis:previous.axis,layer:previous.layer,direction:(previous.direction*-1) as Direction,label:`Undo ${previous.label}`,record:false}); runNext(); };
    const resetCube=()=>{
      if(active||isSolved()) return;
      queue.length=0; history.length=0; clearHighlight();
      cubies.forEach(c=>{c.mesh.position.copy(c.home);c.mesh.quaternion.identity();c.grid.copy(c.home);});
      setCanUndo(false); setMoves(0); setScrambleSequence("");
      stopTimer(); resetTimer();
      setIsSolvedNow(true);
      setStatus(`${size}×${size} reset`);
    };
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
      const hit=raycaster.intersectObjects(cubieMeshes,true)[0];
      if(!hit||!hit.face){ controls.enabled=true; return; }
      const cubie=(hit.object as THREE.Object3D).userData.cubie as Cubie|undefined; if(!cubie) return;
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
      else { clearHighlight(); setStatus(isSolved()?"Solved!":`${size}×${size} ready`); }
      controls.enabled=activePointers===0;
    };

    renderer.domElement.addEventListener("pointerdown",onPointerDown,true);
    renderer.domElement.addEventListener("pointermove",onPointerMove,true);
    renderer.domElement.addEventListener("pointerup",finishPointer,true);
    renderer.domElement.addEventListener("pointercancel",finishPointer,true);

    const resize=()=>{ const w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); };
    const observer=new ResizeObserver(resize); observer.observe(mount);
    window.addEventListener("resize",resize);
    resize();
    let frame=0; const render=()=>{frame=requestAnimationFrame(render);controls.update();renderer.render(scene,camera);}; render();

    return()=>{
      disposed=true;
      cancelAnimationFrame(frame); cancelAnimationFrame(moveFrame); observer.disconnect();
      window.removeEventListener("resize",resize);
      renderer.domElement.removeEventListener("pointerdown",onPointerDown,true); renderer.domElement.removeEventListener("pointermove",onPointerMove,true); renderer.domElement.removeEventListener("pointerup",finishPointer,true); renderer.domElement.removeEventListener("pointercancel",finishPointer,true);
      controls.dispose(); actionsRef.current=null;
      materials.forEach(m=>m.dispose());
      bodyGeometry.dispose(); stickerGeometry.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  },[size,variant]);

  const edge=(size-1)/2;
  const faceMoves:Record<string,Move>={R:{axis:"x",layer:edge,direction:-1,label:"R"},L:{axis:"x",layer:-edge,direction:1,label:"L"},U:{axis:"y",layer:edge,direction:-1,label:"U"},D:{axis:"y",layer:-edge,direction:1,label:"D"},F:{axis:"z",layer:edge,direction:-1,label:"F"},B:{axis:"z",layer:-edge,direction:1,label:"B"}};
  const changeMode=(mode:ViewMode)=>{ setViewMode(mode); actionsRef.current?.setViewMode(mode); };
  const isPlayableCore=size<=5;
  const stageClass=isPlayableCore?"h-[430px] sm:h-[470px]":"h-[390px] sm:h-[440px]";
  const focusStageClass="h-[min(58dvh,500px)] min-h-[390px] sm:h-[470px]";
  const eyebrow=isPlayableCore?`PLAYABLE ${size}×${size} CUBE`:"PLAYABLE LARGE CUBE";
  const description=isPlayableCore
    ?"Swipe stickers first. Buttons stay tucked away for backup moves, undo, scramble, and view control."
    :"Swipe exact layers, rotate the cube, or switch to Move mode to position it anywhere inside the viewport.";

  if(variant==="focus") return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-[14px]">
    <div className="orb orb-a"/><div className="orb orb-b"/>
    <div className="relative z-[1]">
      <div className="flex items-center justify-between">
        <Link href="/solve" className="rounded-full border border-[var(--border)] bg-black/30 px-3 py-2 text-xs font-extrabold text-[var(--muted)]">← Solvers</Link>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-[var(--border)] bg-black/30 px-3 py-2 text-xs font-extrabold tabular-nums text-[var(--muted)]">{formatElapsed(elapsedMs)}</div>
          <div className="rounded-full border border-[rgba(46,166,255,.28)] bg-black/30 px-3 py-2 text-xs font-extrabold text-[var(--blue)]">{moves} moves</div>
        </div>
      </div>

      <section className="cube-card relative mt-3 overflow-hidden rounded-[22px]">
        <div className="absolute left-3 top-3 z-[4] rounded-[11px] border border-[var(--border)] bg-black/35 px-3 py-1.5 text-xs font-bold text-[var(--muted)]">PLAYABLE {size}×{size} CUBE</div>
        <button type="button" aria-label="Reset cube" disabled={busy||isSolvedNow} onClick={()=>actionsRef.current?.resetCube()} className="absolute right-3 top-3 z-[4] grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-black/35 text-lg font-extrabold disabled:opacity-40">↻</button>
        <div ref={mountRef} className={`${focusStageClass} w-full touch-none`}/>
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[4] -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold text-[var(--muted)]">{status}</div>
      </section>

      <details className="glass mt-3 rounded-[18px] p-3">
        <summary className="cursor-pointer text-sm font-extrabold text-[var(--muted)]">Controls if needed</summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={()=>changeMode("turn")} className={`${viewMode==="turn"?"cta-purple":"glass"} min-h-12 rounded-xl font-extrabold`}>Turn Cube</button>
          <button onClick={()=>changeMode("move")} className={`${viewMode==="move"?"cta-purple":"glass"} min-h-12 rounded-xl font-extrabold`}>Move Cube</button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2"><button disabled={busy} onClick={()=>actionsRef.current?.scramble()} className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40">Scramble</button><button disabled={busy||!canUndo} onClick={()=>actionsRef.current?.undo()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">↶ Undo</button><button onClick={()=>actionsRef.current?.resetView()} className="glass min-h-12 rounded-xl font-extrabold">Reset View</button></div>
        <div className="mt-2 grid grid-cols-3 gap-2">{Object.entries(faceMoves).map(([label,move])=><button key={label} disabled={busy||viewMode==="move"} onClick={()=>actionsRef.current?.turn(move)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}</button>)}</div>
        {scrambleSequence && <p className="mt-3 break-words text-xs leading-5 text-[var(--muted)]"><strong className="text-[var(--text)]">Scramble:</strong> {scrambleSequence}</p>}
      </details>
    </div>
  </main>;

  return <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-[22px]">
    <div className="orb orb-a"/><div className="orb orb-b"/>
    <div className="relative z-[1]">
      <SiteHeader/>
      <Link href="/solve" className="mt-4 inline-flex text-sm font-bold text-[var(--muted)]">← Back to solvers</Link>
      <section className="mt-5"><p className="text-xs font-extrabold tracking-[.18em] text-[var(--green)]">{eyebrow}</p><h1 className="mt-2 text-[39px] font-extrabold leading-[1.02] tracking-[-1px]">Play the<br/><span className="accent-text">{size}×{size} Cube</span></h1><p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">{description}</p></section>

      <section className="glass mt-3 overflow-hidden rounded-[22px]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">
          <span>{status}</span>
          <span className="flex items-center gap-3">
            <span className="tabular-nums text-[var(--text)]">{formatElapsed(elapsedMs)}</span>
            <strong className="text-[var(--text)]">{moves} moves</strong>
          </span>
        </div>
        <div ref={mountRef} className={`${stageClass} w-full touch-none`}/>
      </section>

      <section className="glass mt-3 rounded-[18px] p-4"><p className="text-xs font-extrabold tracking-[.16em] text-[var(--muted)]">SCRAMBLE</p><p className="mt-2 min-h-6 break-words text-sm leading-6 text-[var(--text)]">{scrambleSequence || "Tap Scramble to start a timed attempt."}</p></section>

      {isPlayableCore ? <details className="glass mt-3 rounded-[18px] p-3">
        <summary className="cursor-pointer text-sm font-extrabold text-[var(--muted)]">Face buttons</summary>
        <div className="mt-3 grid grid-cols-3 gap-2">{Object.entries(faceMoves).map(([label,move])=><button key={label} disabled={busy||viewMode==="move"} onClick={()=>actionsRef.current?.turn(move)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}</button>)}</div>
      </details> : <div className="mt-3 grid grid-cols-3 gap-2">{Object.entries(faceMoves).map(([label,move])=><button key={label} disabled={busy||viewMode==="move"} onClick={()=>actionsRef.current?.turn(move)} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">{label}</button>)}</div>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={()=>changeMode("turn")} className={`${viewMode==="turn"?"cta-purple":"glass"} min-h-12 rounded-xl font-extrabold`}>Turn Cube</button>
        <button onClick={()=>changeMode("move")} className={`${viewMode==="move"?"cta-purple":"glass"} min-h-12 rounded-xl font-extrabold`}>Move Cube</button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2"><button disabled={busy} onClick={()=>actionsRef.current?.scramble()} className="cta-purple min-h-12 rounded-xl font-extrabold disabled:opacity-40">Scramble</button><button disabled={busy||!canUndo} onClick={()=>actionsRef.current?.undo()} className="glass min-h-12 rounded-xl font-extrabold disabled:opacity-40">↶ Undo</button><button onClick={()=>actionsRef.current?.resetView()} className="glass min-h-12 rounded-xl font-extrabold">Reset View</button></div>
      <button disabled={busy||isSolvedNow} onClick={()=>actionsRef.current?.resetCube()} className="glass mt-2 min-h-12 w-full rounded-xl font-extrabold disabled:opacity-40">Reset Cube</button>

      <section className="glass mt-4 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted)]">
        <p><strong className="text-[var(--text)]">Turn Cube:</strong> sticker swipes keep the current highlight and long-dwell layer mechanics.</p>
        <p><strong className="text-[var(--text)]">Move Cube:</strong> drag with one finger to reposition the cube inside the viewport.</p>
        <p><strong className="text-[var(--text)]">Two fingers:</strong> pinch to zoom and drag together to pan in either mode.</p>
      </section>
    </div>
  </main>;
}
