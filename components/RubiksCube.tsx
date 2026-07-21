"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls,RoundedBox } from "@react-three/drei";
const RED="#e6352b",ORANGE="#ff7a18",WHITE="#f4f6f8",YELLOW="#ffd21f",BLUE="#1667e0",GREEN="#24b84a",PLASTIC="#0b0b0d";
type Cell=[number,number,number];
function Cubie({position}:{position:Cell}){const [x,y,z]=position;const faces=[x===1?RED:PLASTIC,x===-1?ORANGE:PLASTIC,y===1?WHITE:PLASTIC,y===-1?YELLOW:PLASTIC,z===1?BLUE:PLASTIC,z===-1?GREEN:PLASTIC];return <RoundedBox args={[.94,.94,.94]} radius={.08} smoothness={3} position={position}>{faces.map((color,i)=><meshStandardMaterial key={i} attach={`material-${i}`} color={color} roughness={.42} metalness={.05}/>)}</RoundedBox>}
function buildCells():Cell[]{const cells:Cell[]=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)cells.push([x,y,z]);return cells}
export default function RubiksCube(){const reduce=typeof window!=="undefined"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;return <Canvas camera={{position:[3.4,2.6,3.8],fov:40}} dpr={[1,2]} gl={{antialias:true,alpha:true}} style={{background:"transparent"}}><ambientLight intensity={.85}/><directionalLight position={[5,7,5]} intensity={1.15}/><directionalLight position={[-5,-2,-4]} intensity={.35} color="#2ea6ff"/><group>{buildCells().map((cell,i)=><Cubie key={i} position={cell}/>)}</group><OrbitControls enablePan={false} enableZoom={false} autoRotate={!reduce} autoRotateSpeed={.9} minPolarAngle={Math.PI/4} maxPolarAngle={3*Math.PI/4}/></Canvas>}
