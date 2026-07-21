"use client";

/**
 * Solver playback cube.
 *
 * The cube always animates the exact layer belonging to the move being played,
 * including inverse moves when stepping backward. The active layer is stored
 * separately from the requested step so React cannot regroup the wrong cubies
 * while a reverse animation is running.
 */
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { applySequence, solved, toFaceletString } from "@/lib/cube-engine";

const COLOR: Record<string, string> = {
  U: "#f7f7f2", R: "#e53935", F: "#24c45a",
  D: "#ffd21f", L: "#ff7a18", B: "#1464e8",
};

type Vec3 = [number, number, number];
type Axis = "x"|"y"|"z";
type MoveSpec = { axis: Axis; layer: -1|0|1; angle: number };
type Cell = {x:number;y:number;z:number};

const MOVE: Record<string, Omit<MoveSpec,"angle"> & { clockwise:number }> = {
  U:{axis:"y",layer:1,clockwise:-1}, D:{axis:"y",layer:-1,clockwise:1},
  F:{axis:"z",layer:1,clockwise:-1}, B:{axis:"z",layer:-1,clockwise:1},
  R:{axis:"x",layer:1,clockwise:-1}, L:{axis:"x",layer:-1,clockwise:1},
};

function invert(move:string){return move.endsWith("2")?move:move.endsWith("'")?move[0]:move+"'";}
function spec(move:string):MoveSpec{
  const base=MOVE[move[0]];
  const turns=move.endsWith("2")?2:move.endsWith("'")?-1:1;
  return {...base,angle:base.clockwise*turns*Math.PI/2};
}

function stickerIndex(face:string,x:number,y:number,z:number){
  if(face==="U") return (z+1)*3+(x+1);
  if(face==="R") return 9+(1-y)*3+(1-z);
  if(face==="F") return 18+(1-y)*3+(x+1);
  if(face==="D") return 27+(1-z)*3+(x+1);
  if(face==="L") return 36+(1-y)*3+(z+1);
  return 45+(1-y)*3+(1-x);
}

function Sticker({color,position,rotation=[0,0,0]}:{color:string;position:Vec3;rotation?:Vec3}){
  return <RoundedBox args={[.76,.76,.045]} radius={.055} smoothness={3} position={position} rotation={rotation}>
    {/* No emissive channel: changing all 54 emissive materials together caused a visible mobile flash. */}
    <meshStandardMaterial color={color} roughness={.3} metalness={.02}/>
  </RoundedBox>;
}

function Cubie({x,y,z,facelets}:{x:number;y:number;z:number;facelets:string}){
  return <group position={[x,y,z]}>
    <RoundedBox args={[.9,.9,.9]} radius={.075} smoothness={3}><meshStandardMaterial color="#111318" roughness={.38} metalness={.08}/></RoundedBox>
    {x===1&&<Sticker color={COLOR[facelets[stickerIndex("R",x,y,z)]]} position={[.468,0,0]} rotation={[0,Math.PI/2,0]}/>} 
    {x===-1&&<Sticker color={COLOR[facelets[stickerIndex("L",x,y,z)]]} position={[-.468,0,0]} rotation={[0,Math.PI/2,0]}/>} 
    {y===1&&<Sticker color={COLOR[facelets[stickerIndex("U",x,y,z)]]} position={[0,.468,0]} rotation={[Math.PI/2,0,0]}/>} 
    {y===-1&&<Sticker color={COLOR[facelets[stickerIndex("D",x,y,z)]]} position={[0,-.468,0]} rotation={[Math.PI/2,0,0]}/>} 
    {z===1&&<Sticker color={COLOR[facelets[stickerIndex("F",x,y,z)]]} position={[0,0,.468]}/>} 
    {z===-1&&<Sticker color={COLOR[facelets[stickerIndex("B",x,y,z)]]} position={[0,0,-.468]}/>} 
  </group>;
}

const CELLS:Cell[]=[];
for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)CELLS.push({x,y,z});

function Scene({scramble,solution,step,onAnimating}:{scramble:string;solution:string[];step:number;onAnimating:(v:boolean)=>void}){
  const initial=useMemo(()=>toFaceletString(applySequence(solved(),scramble)),[scramble]);
  const [facelets,setFacelets]=useState(initial);
  const [active,setActive]=useState<MoveSpec|null>(null);
  const shownStep=useRef(0);
  const layerRef=useRef<THREE.Group>(null);
  const animation=useRef<{axis:Axis;from:number;to:number;start:number;next:string;nextStep:number}|null>(null);

  useEffect(()=>{
    setFacelets(initial);
    setActive(null);
    shownStep.current=0;
    animation.current=null;
    onAnimating(false);
  },[initial,onAnimating]);

  useEffect(()=>{
    if(step===shownStep.current||animation.current)return;
    const forward=step>shownStep.current;
    const move=forward?solution[shownStep.current]:invert(solution[shownStep.current-1]);
    if(!move)return;
    const target=spec(move);
    const nextStep=forward?shownStep.current+1:shownStep.current-1;
    const next=toFaceletString(applySequence(solved(),[scramble,...solution.slice(0,nextStep)].filter(Boolean).join(" ")));

    // Store the exact move being animated. This fixes Previous selecting the
    // neighboring move's layer after the parent step counter has already changed.
    setActive(target);
    animation.current={axis:target.axis,from:0,to:target.angle,start:performance.now(),next,nextStep};
    onAnimating(true);
  },[step,solution,scramble,onAnimating]);

  useFrame(()=>{
    const a=animation.current,g=layerRef.current;
    if(!a||!g)return;
    const t=Math.min(1,(performance.now()-a.start)/460);
    const eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    g.rotation[a.axis]=a.from+(a.to-a.from)*eased;
    if(t>=1){
      g.rotation.set(0,0,0);
      shownStep.current=a.nextStep;
      animation.current=null;
      // React batches these two updates, avoiding an intermediate frame where
      // new sticker colors appear while the old layer grouping is still active.
      setFacelets(a.next);
      setActive(null);
      onAnimating(false);
    }
  });

  const inLayer=(c:Cell)=>active?c[active.axis]===active.layer:false;
  return <>
    <hemisphereLight args={["#ffffff","#18345f",1.55]}/>
    <directionalLight position={[5,8,7]} intensity={1.9}/>
    <directionalLight position={[-5,3,4]} intensity={.95} color="#9fd8ff"/>
    <group rotation={[-.08,-.08,0]} scale={.9}>
      <group ref={layerRef}>{CELLS.filter(inLayer).map(c=><Cubie key={`${c.x}:${c.y}:${c.z}`} {...c} facelets={facelets}/>)}</group>
      {CELLS.filter(c=>!inLayer(c)).map(c=><Cubie key={`${c.x}:${c.y}:${c.z}`} {...c} facelets={facelets}/>) }
    </group>
    <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI/4.5} maxPolarAngle={3.4*Math.PI/4.5}/>
  </>;
}

export default function SolverCube3D({scramble,solution,step,onAnimating}:{scramble:string;solution:string[];step:number;onAnimating:(v:boolean)=>void}){
  return <Canvas camera={{position:[4.4,3.5,5.1],fov:36}} dpr={[1,1.5]} gl={{antialias:true,alpha:true,powerPreference:"high-performance"}} style={{background:"transparent"}}>
    <Scene scramble={scramble} solution={solution} step={step} onAnimating={onAnimating}/>
  </Canvas>;
}
