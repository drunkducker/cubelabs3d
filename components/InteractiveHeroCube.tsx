"use client";

/**
 * Homepage cube using the same face-swipe interaction model as /play/3x3.
 * Swipe across a touched sticker to turn the intersecting layer; drag empty
 * space to orbit the camera. Permanent cubie matrices keep turns flash-free.
 */
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

type Axis = "x" | "y" | "z";
type Cell = { x: number; y: number; z: number };
type MoveSpec = { axis: Axis; layer: -1 | 1; angle: number };
type Animation = MoveSpec & { startedAt: number; nextStep: number; cubies: { group: THREE.Group; matrix: THREE.Matrix4 }[] };
type Gesture = { pointerId: number; startX: number; startY: number; group: THREE.Group; normal: THREE.Vector3; moved: boolean };

const COLORS: Record<string, string> = { U: "#f7f7f2", R: "#e53935", F: "#24c45a", D: "#ffd21f", L: "#ff7a18", B: "#1464e8" };
const MOVE: Record<string, { axis: Axis; layer: -1 | 1; clockwise: number }> = {
  U: { axis: "y", layer: 1, clockwise: -1 }, D: { axis: "y", layer: -1, clockwise: 1 },
  F: { axis: "z", layer: 1, clockwise: -1 }, B: { axis: "z", layer: -1, clockwise: 1 },
  R: { axis: "x", layer: 1, clockwise: -1 }, L: { axis: "x", layer: -1, clockwise: 1 },
};
const CELLS: Cell[] = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) CELLS.push({ x, y, z });

const invert = (move: string) => move.endsWith("2") ? move : move.endsWith("'") ? move[0] : `${move}'`;
const coordinate = (matrix: THREE.Matrix4, axis: Axis) => matrix.elements[axis === "x" ? 12 : axis === "y" ? 13 : 14];
const axisVector = (axis: Axis) => axis === "x" ? new THREE.Vector3(1,0,0) : axis === "y" ? new THREE.Vector3(0,1,0) : new THREE.Vector3(0,0,1);
const axisName = (v: THREE.Vector3): Axis => Math.abs(v.x) > .5 ? "x" : Math.abs(v.y) > .5 ? "y" : "z";
const snapAxis = (v: THREE.Vector3) => { const a=[Math.abs(v.x),Math.abs(v.y),Math.abs(v.z)],i=a.indexOf(Math.max(...a)); return new THREE.Vector3(i===0?(Math.sign(v.x)||1):0,i===1?(Math.sign(v.y)||1):0,i===2?(Math.sign(v.z)||1):0); };
function spec(move: string): MoveSpec { const base=MOVE[move[0]], turns=move.endsWith("2")?2:move.endsWith("'")?-1:1; return { ...base, angle: base.clockwise*turns*Math.PI/2 }; }
function notation(axis: Axis, layer: number, dir: number) { const face=axis==="x"?(layer>0?"R":"L"):axis==="y"?(layer>0?"U":"D"):(layer>0?"F":"B"); return dir===MOVE[face].clockwise?face:`${face}'`; }
function rotation(axis: Axis, angle: number) { return new THREE.Matrix4()[axis==="x"?"makeRotationX":axis==="y"?"makeRotationY":"makeRotationZ"](angle); }
function snap(matrix: THREE.Matrix4) { const out=matrix.clone(),e=out.elements; for(const i of [0,1,2,4,5,6,8,9,10]) e[i]=Math.abs(e[i])<.5?0:e[i]>0?1:-1; e[12]=Math.round(e[12]);e[13]=Math.round(e[13]);e[14]=Math.round(e[14]);e[3]=e[7]=e[11]=0;e[15]=1;return out; }

function Sticker({ color, position, rotation: turn=[0,0,0], normal, groupRef, onMove, controls }: { color:string; position:[number,number,number]; rotation?:[number,number,number]; normal:[number,number,number]; groupRef:React.RefObject<THREE.Group|null>; onMove:(move:string)=>void; controls:React.RefObject<OrbitControlsImpl|null> }) {
  const camera=useThree(s=>s.camera), gesture=useRef<Gesture|null>(null);
  const screenDirection=(origin:THREE.Vector3,direction:THREE.Vector3)=>{const a=origin.clone().project(camera),b=origin.clone().add(direction).project(camera);return new THREE.Vector2(b.x-a.x,-(b.y-a.y)).normalize();};
  const down=(event:ThreeEvent<PointerEvent>)=>{const group=groupRef.current;if(!group)return;event.stopPropagation();controls.current&&(controls.current.enabled=false);(event.target as Element).setPointerCapture?.(event.pointerId);const matrix3=new THREE.Matrix3().setFromMatrix4(group.matrix);gesture.current={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,group,normal:snapAxis(new THREE.Vector3(...normal).applyMatrix3(matrix3)),moved:false};};
  const move=(event:ThreeEvent<PointerEvent>)=>{const g=gesture.current;if(!g||g.pointerId!==event.pointerId||g.moved)return;const delta=new THREE.Vector2(event.clientX-g.startX,event.clientY-g.startY);if(delta.length()<13)return;event.stopPropagation();g.moved=true;const candidates=[axisVector("x"),axisVector("y"),axisVector("z")].filter(v=>Math.abs(v.dot(g.normal))<.5);const origin=g.group.getWorldPosition(new THREE.Vector3()),pointer=delta.normalize();let best=candidates[0],bestDot=-1,sign=1;for(const c of candidates){const dot=screenDirection(origin,c).dot(pointer);if(Math.abs(dot)>bestDot){bestDot=Math.abs(dot);best=c;sign=dot>=0?1:-1;}}const tangent=best.clone().multiplyScalar(sign),signed=snapAxis(new THREE.Vector3().crossVectors(g.normal,tangent)),axis=axisName(signed),dir=Math.sign(signed[axis])||1,layer=Math.round(coordinate(g.group.matrix,axis));onMove(notation(axis,layer,dir));};
  const up=(event:ThreeEvent<PointerEvent>)=>{if(gesture.current?.pointerId!==event.pointerId)return;(event.target as Element).releasePointerCapture?.(event.pointerId);gesture.current=null;controls.current&&(controls.current.enabled=true);};
  return <RoundedBox args={[.76,.76,.045]} radius={.055} smoothness={3} position={position} rotation={turn} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}><meshStandardMaterial color={color} roughness={.3} metalness={.02} emissive={color} emissiveIntensity={.035}/></RoundedBox>;
}

const Cubie=memo(function Cubie({cell,register,onMove,controls}:{cell:Cell;register:(key:string,group:THREE.Group|null)=>void;onMove:(move:string)=>void;controls:React.RefObject<OrbitControlsImpl|null>}){const{x,y,z}=cell,key=`${x}:${y}:${z}`,matrix=useMemo(()=>new THREE.Matrix4().makeTranslation(x,y,z),[x,y,z]),groupRef=useRef<THREE.Group|null>(null);const setGroup=useCallback((group:THREE.Group|null)=>{groupRef.current=group;register(key,group);},[key,register]);return <group ref={setGroup} matrixAutoUpdate={false} matrix={matrix}><RoundedBox args={[.9,.9,.9]} radius={.075} smoothness={3}><meshStandardMaterial color="#111318" roughness={.38} metalness={.08}/></RoundedBox>{x===1&&<Sticker color={COLORS.R} position={[.468,0,0]} rotation={[0,Math.PI/2,0]} normal={[1,0,0]} groupRef={groupRef} onMove={onMove} controls={controls}/>} {x===-1&&<Sticker color={COLORS.L} position={[-.468,0,0]} rotation={[0,Math.PI/2,0]} normal={[-1,0,0]} groupRef={groupRef} onMove={onMove} controls={controls}/>} {y===1&&<Sticker color={COLORS.U} position={[0,.468,0]} rotation={[Math.PI/2,0,0]} normal={[0,1,0]} groupRef={groupRef} onMove={onMove} controls={controls}/>} {y===-1&&<Sticker color={COLORS.D} position={[0,-.468,0]} rotation={[Math.PI/2,0,0]} normal={[0,-1,0]} groupRef={groupRef} onMove={onMove} controls={controls}/>} {z===1&&<Sticker color={COLORS.F} position={[0,0,.468]} normal={[0,0,1]} groupRef={groupRef} onMove={onMove} controls={controls}/>} {z===-1&&<Sticker color={COLORS.B} position={[0,0,-.468]} normal={[0,0,-1]} groupRef={groupRef} onMove={onMove} controls={controls}/>}</group>;});

function Scene({moves,step,onMove,onAnimating}:{moves:string[];step:number;onMove:(move:string)=>void;onAnimating:(value:boolean)=>void}){const cubies=useRef(new Map<string,THREE.Group>()),shown=useRef(0),active=useRef<Animation|null>(null),callback=useRef(onAnimating),moveRef=useRef(onMove),controls=useRef<OrbitControlsImpl|null>(null);const[settle,setSettle]=useState(0);useEffect(()=>{callback.current=onAnimating},[onAnimating]);useEffect(()=>{moveRef.current=onMove},[onMove]);const register=useCallback((key:string,group:THREE.Group|null)=>{group?cubies.current.set(key,group):cubies.current.delete(key)},[]);useEffect(()=>{if(step===shown.current||active.current)return;const forward=step>shown.current,move=forward?moves[shown.current]:invert(moves[shown.current-1]);if(!move)return;const target=spec(move),nextStep=forward?shown.current+1:shown.current-1,selected=Array.from(cubies.current.values()).filter(group=>Math.round(coordinate(group.matrix,target.axis))===target.layer).map(group=>({group,matrix:group.matrix.clone()}));if(selected.length!==9)return;active.current={...target,startedAt:performance.now(),nextStep,cubies:selected};callback.current(true);},[step,moves,settle]);useFrame(()=>{const current=active.current;if(!current)return;const t=Math.min(1,(performance.now()-current.startedAt)/330),e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,turn=rotation(current.axis,current.angle*e);for(const item of current.cubies){item.group.matrix.multiplyMatrices(turn,item.matrix);item.group.matrixWorldNeedsUpdate=true;}if(t>=1){const done=rotation(current.axis,current.angle);for(const item of current.cubies){item.group.matrix.copy(snap(new THREE.Matrix4().multiplyMatrices(done,item.matrix)));item.group.matrixWorldNeedsUpdate=true;}shown.current=current.nextStep;active.current=null;callback.current(false);setSettle(v=>v+1);}});return <><hemisphereLight args={["#fff","#18345f",1.65]}/><directionalLight position={[5,8,7]} intensity={2.15}/><directionalLight position={[-5,3,4]} intensity={1.15} color="#9fd8ff"/><group rotation={[-.08,-.08,0]} scale={.9}>{CELLS.map(cell=><Cubie key={`${cell.x}:${cell.y}:${cell.z}`} cell={cell} register={register} onMove={move=>moveRef.current(move)} controls={controls}/>)}</group><OrbitControls ref={controls} enablePan={false} enableZoom={false} minPolarAngle={Math.PI/4.5} maxPolarAngle={3.4*Math.PI/4.5}/></>;}

export default function InteractiveHeroCube(props:{moves:string[];step:number;onMove:(move:string)=>void;onAnimating:(value:boolean)=>void}){return <Canvas camera={{position:[4.4,3.5,5.1],fov:36}} dpr={[1,1.5]} gl={{antialias:true,alpha:true,powerPreference:"high-performance"}} style={{background:"transparent",touchAction:"none"}}><Scene {...props}/></Canvas>;}
