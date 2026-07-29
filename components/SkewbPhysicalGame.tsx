"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  type AxisName,
  type Direction,
  type SkewbMove,
  applyMove,
  inverseMove,
  isPositionInLayer,
  isSolved,
  moveLabel,
  pivotVector,
  randomScramble,
  solve,
  solved,
  verifySolution,
} from "@/lib/skewb-engine";

const COLORS = ["#f7f7f2", "#ffd500", "#00a85a", "#1557d5", "#ef3340", "#ff7a00"];
const TURN = Math.PI * 2 / 3;
const AXES: AxisName[] = ["U", "R", "L", "B"];

function roundedPolygon(points: THREE.Vector2[], radius = .055) {
  const shape = new THREE.Shape();
  points.forEach((p, i) => {
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    const a = p.clone().lerp(prev, radius / p.distanceTo(prev));
    const b = p.clone().lerp(next, radius / p.distanceTo(next));
    if (!i) shape.moveTo(a.x, a.y); else shape.lineTo(a.x, a.y);
    shape.quadraticCurveTo(p.x, p.y, b.x, b.y);
  });
  shape.closePath();
  return shape;
}

function makeFacePiece(points: THREE.Vector2[], color: string, depth: number) {
  const group = new THREE.Group();
  const shellGeo = new THREE.ExtrudeGeometry(roundedPolygon(points, .045), {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: .045,
    bevelThickness: .035,
    curveSegments: 4,
  });
  shellGeo.translate(0, 0, -depth);
  const shell = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({
    color: "#07090c", roughness: .34, metalness: .03,
  }));
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  const stickerPts = points.map(p => p.clone().multiplyScalar(.88));
  const stickerGeo = new THREE.ShapeGeometry(roundedPolygon(stickerPts, .035), 5);
  stickerGeo.translate(0, 0, .012);
  const sticker = new THREE.Mesh(stickerGeo, new THREE.MeshStandardMaterial({
    color, roughness: .22, metalness: .015,
  }));
  sticker.castShadow = true;
  sticker.userData.isSticker = true;
  group.add(sticker);
  group.userData.pickMesh = sticker;
  return group;
}

function orientToFace(group: THREE.Group, normal: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, center: THREE.Vector3) {
  const matrix = new THREE.Matrix4().makeBasis(u, v, normal);
  group.quaternion.setFromRotationMatrix(matrix);
  group.position.copy(center);
}

export default function SkewbPhysicalGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ turn:(m:SkewbMove)=>void; scramble:()=>void; undo:()=>void; solve:()=>void; reset:()=>void } | null>(null);
  const [status, setStatus] = useState("Physical Skewb ready");
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const [scramble, setScramble] = useState("");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
    camera.position.set(4.8, 4.1, 5.8);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 3.4;
    controls.maxDistance = 10;
    controls.target.set(0,0,0);

    scene.add(new THREE.HemisphereLight("#ffffff", "#172038", 2.35));
    const key = new THREE.DirectionalLight("#ffffff", 3.1); key.position.set(7,10,8); key.castShadow = true; scene.add(key);
    const rim = new THREE.DirectionalLight("#6a83ff", 1.25); rim.position.set(-8,4,-8); scene.add(rim);

    const root = new THREE.Group();
    root.rotation.set(-.08,.08,0);
    scene.add(root);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.82,32,20), new THREE.MeshStandardMaterial({color:"#050608",roughness:.4}));
    root.add(core);

    const faceData = [
      [new THREE.Vector3(0,1,0), new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,-1)],
      [new THREE.Vector3(0,-1,0), new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,1)],
      [new THREE.Vector3(0,0,1), new THREE.Vector3(1,0,0), new THREE.Vector3(0,1,0)],
      [new THREE.Vector3(0,0,-1), new THREE.Vector3(-1,0,0), new THREE.Vector3(0,1,0)],
      [new THREE.Vector3(1,0,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(0,1,0)],
      [new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,1), new THREE.Vector3(0,1,0)],
    ] as const;
    const pieces: THREE.Group[] = [];
    const pickables: THREE.Object3D[] = [];
    const byKey = new Map<string, THREE.Group>();
    const diamond = [new THREE.Vector2(0,.49),new THREE.Vector2(.49,0),new THREE.Vector2(0,-.49),new THREE.Vector2(-.49,0)];
    const corners = [
      [new THREE.Vector2(-.97,.97),new THREE.Vector2(0,.97),new THREE.Vector2(-.49,0),new THREE.Vector2(-.97,0)],
      [new THREE.Vector2(0,.97),new THREE.Vector2(.97,.97),new THREE.Vector2(.97,0),new THREE.Vector2(.49,0)],
      [new THREE.Vector2(.97,0),new THREE.Vector2(.97,-.97),new THREE.Vector2(0,-.97),new THREE.Vector2(.49,0)],
      [new THREE.Vector2(0,-.97),new THREE.Vector2(-.97,-.97),new THREE.Vector2(-.97,0),new THREE.Vector2(-.49,0)],
    ];
    const signs = [[-1,1],[1,1],[1,-1],[-1,-1]];

    faceData.forEach(([normal,u,v], faceIndex) => {
      const add = (poly:THREE.Vector2[], kind:"center"|"corner", sx=0, sy=0) => {
        const anchor = kind === "center" ? normal.clone() : new THREE.Vector3(
          Math.sign(normal.x + u.x*sx + v.x*sy),
          Math.sign(normal.y + u.y*sx + v.y*sy),
          Math.sign(normal.z + u.z*sx + v.z*sy),
        );
        const keyName = `${kind}:${anchor.x},${anchor.y},${anchor.z}`;
        let piece = byKey.get(keyName);
        if (!piece) {
          piece = new THREE.Group();
          piece.position.copy(anchor);
          piece.userData.kind = kind;
          piece.userData.anchor = anchor.clone();
          byKey.set(keyName,piece); pieces.push(piece); root.add(piece);
        }
        const facePiece = makeFacePiece(poly, COLORS[faceIndex], kind === "center" ? .48 : .38);
        const center = normal.clone().multiplyScalar(1.035).sub(anchor);
        orientToFace(facePiece,normal,u,v,center);
        facePiece.traverse(o => { if (o instanceof THREE.Mesh) { o.userData.piece = piece; pickables.push(o); } });
        piece.add(facePiece);
      };
      add(diamond,"center");
      corners.forEach((poly,i)=>add(poly,"corner",signs[i][0],signs[i][1]));
    });

    let state = solved();
    const history: SkewbMove[] = [];
    let active = false;
    const sync = () => {
      pieces.forEach(piece => {
        const collection = piece.userData.kind === "corner" ? state.corners : state.centers;
        const anchor = piece.userData.anchor as THREE.Vector3;
        const index = collection.findIndex(p => p.position[0]===anchor.x && p.position[1]===anchor.y && p.position[2]===anchor.z);
        const p = collection[index]; if (!p) return;
        piece.position.set(...p.position);
        const o=p.orientation; piece.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(o[0],o[1],o[2],0,o[3],o[4],o[5],0,o[6],o[7],o[8],0,0,0,0,1));
      });
    };
    const animateMove = (move:SkewbMove, record=true) => {
      if (active) return;
      active=true; setBusy(true);
      const selected = pieces.filter(p => isPositionInLayer((p.position.toArray() as [number,number,number]), move.axis, move.layer ?? 1));
      const pivot = new THREE.Group(); root.add(pivot); selected.forEach(p=>pivot.attach(p));
      const axis = new THREE.Vector3(...pivotVector(move)).normalize();
      const start=performance.now(), duration=390;
      const frame=(now:number)=>{
        const t=Math.min(1,(now-start)/duration), e=1-Math.pow(1-t,3);
        pivot.quaternion.setFromAxisAngle(axis,move.direction*TURN*e);
        if(t<1){requestAnimationFrame(frame);return;}
        state=applyMove(state,move); selected.forEach(p=>root.attach(p)); root.remove(pivot); sync();
        if(record) history.push(move); setMoves(history.length); setStatus(isSolved(state)?"Solved!":"Your turn");
        active=false; setBusy(false);
      }; requestAnimationFrame(frame);
    };
    const runSequence = (seq:SkewbMove[], done:string) => {
      if(active||!seq.length)return; let i=0;
      const next=()=>{ if(i>=seq.length){setStatus(done);return;} const m=seq[i++]; animateMove(m,false); const wait=()=>active?setTimeout(wait,25):next(); wait(); }; next();
    };
    apiRef.current={
      turn:animateMove,
      scramble:()=>{state=solved();history.length=0;sync();const seq=randomScramble(10);setScramble(seq.map(moveLabel).join(" "));setStatus("Scrambling…");runSequence(seq,"Your turn");},
      undo:()=>{const m=history.pop();if(!m)return;animateMove(inverseMove(m),false);setMoves(history.length);},
      solve:()=>{if(isSolved(state))return;const seq=solve(state,history);if(!verifySolution(state,seq)){setStatus("Solution check failed");return;}history.length=0;setMoves(0);setStatus("Solving…");runSequence(seq,"Solved!");},
      reset:()=>{state=solved();history.length=0;setMoves(0);setScramble("");setStatus("Physical Skewb ready");sync();},
    };

    const ray=new THREE.Raycaster(), pointer=new THREE.Vector2();
    renderer.domElement.addEventListener("dblclick",e=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(pickables,false)[0];const piece=hit?.object.userData.piece as THREE.Group|undefined;if(!piece)return;const pos=piece.position;const axis=AXES.find(a=>isPositionInLayer(pos.toArray() as [number,number,number],a,1))??"U";animateMove({axis,direction:1});});

    const resize=()=>{const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
    const observer=new ResizeObserver(resize);observer.observe(mount);resize();
    let raf=0;const render=()=>{raf=requestAnimationFrame(render);controls.update();renderer.render(scene,camera)};render();
    return()=>{cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.dispose();renderer.domElement.remove();apiRef.current=null;};
  },[]);

  return <main className="mx-auto w-full max-w-[760px] px-3 pb-6">
    <div className="mb-2 flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
      <span>{status}</span><strong>{moves} moves</strong>
    </div>
    <div ref={mountRef} className="h-[min(62dvh,580px)] min-h-[430px] w-full overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(80,110,210,.18),transparent_55%)]" />
    <p className="mt-2 text-center text-xs text-white/55">Drag to rotate · pinch to zoom · double-tap a piece to turn</p>
    <div className="mt-3 grid grid-cols-4 gap-2">
      {AXES.map(axis=><button key={axis} disabled={busy} onClick={()=>apiRef.current?.turn({axis,direction:1})} className="min-h-12 rounded-xl border border-white/10 bg-white/5 font-black disabled:opacity-40">{axis}</button>)}
    </div>
    <div className="mt-2 grid grid-cols-4 gap-2">
      <button disabled={busy} onClick={()=>apiRef.current?.scramble()} className="min-h-12 rounded-xl bg-indigo-600 font-black">Scramble</button>
      <button disabled={busy||!moves} onClick={()=>apiRef.current?.undo()} className="min-h-12 rounded-xl border border-white/10 bg-white/5 font-black">Undo</button>
      <button disabled={busy} onClick={()=>apiRef.current?.solve()} className="min-h-12 rounded-xl bg-emerald-500 font-black text-black">Solve</button>
      <button disabled={busy} onClick={()=>apiRef.current?.reset()} className="min-h-12 rounded-xl border border-white/10 bg-white/5 font-black">Reset</button>
    </div>
    <div className="mt-3 min-h-14 rounded-2xl border border-white/10 bg-white/[.035] p-3 text-xs leading-5 text-white/65"><strong className="text-white">Scramble</strong><br/>{scramble||"Tap Scramble to begin."}</div>
  </main>;
}
