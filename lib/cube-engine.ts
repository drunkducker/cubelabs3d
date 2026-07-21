/* Portable cubie-level 3×3 engine used to create, display, and verify solver states. */
export type CubeState={cp:number[];co:number[];ep:number[];eo:number[]};
export const solved=():CubeState=>({cp:[0,1,2,3,4,5,6,7],co:Array(8).fill(0),ep:[0,1,2,3,4,5,6,7,8,9,10,11],eo:Array(12).fill(0)});
export const clone=(c:CubeState):CubeState=>({cp:[...c.cp],co:[...c.co],ep:[...c.ep],eo:[...c.eo]});
const MOVES:Record<string,CubeState>={
U:{cp:[3,0,1,2,4,5,6,7],co:[0,0,0,0,0,0,0,0],ep:[3,0,1,2,4,5,6,7,8,9,10,11],eo:Array(12).fill(0)},
R:{cp:[4,1,2,0,7,5,6,3],co:[2,0,0,1,1,0,0,2],ep:[8,1,2,3,11,5,6,7,4,9,10,0],eo:Array(12).fill(0)},
F:{cp:[1,5,2,3,0,4,6,7],co:[1,2,0,0,2,1,0,0],ep:[0,9,2,3,4,8,6,7,1,5,10,11],eo:[0,1,0,0,0,1,0,0,1,1,0,0]},
D:{cp:[0,1,2,3,5,6,7,4],co:Array(8).fill(0),ep:[0,1,2,3,5,6,7,4,8,9,10,11],eo:Array(12).fill(0)},
L:{cp:[0,2,6,3,4,1,5,7],co:[0,1,2,0,0,2,1,0],ep:[0,1,10,3,4,5,9,7,8,2,6,11],eo:Array(12).fill(0)},
B:{cp:[0,1,3,7,4,5,2,6],co:[0,0,1,2,0,0,2,1],ep:[0,1,2,11,4,5,6,10,8,9,3,7],eo:[0,0,0,1,0,0,0,1,0,0,1,1]}};
const applyBasic=(c:CubeState,m:CubeState):CubeState=>{const cp=Array(8),co=Array(8),ep=Array(12),eo=Array(12);for(let i=0;i<8;i++){cp[i]=c.cp[m.cp[i]];co[i]=(c.co[m.cp[i]]+m.co[i])%3;}for(let i=0;i<12;i++){ep[i]=c.ep[m.ep[i]];eo[i]=(c.eo[m.ep[i]]+m.eo[i])%2;}return{cp,co,ep,eo};};
export const tokenize=(seq:string)=>seq.trim().split(/\s+/).filter(Boolean);
export const applyMove=(c:CubeState,move:string)=>{const m=MOVES[move[0]];if(!m)throw new Error(`Invalid move: ${move}`);const times=move.endsWith("2")?2:move.endsWith("'")?3:1;let out=c;for(let i=0;i<times;i++)out=applyBasic(out,m);return out;};
export const applySequence=(c:CubeState,seq:string)=>tokenize(seq).reduce((state,move)=>applyMove(state,move),clone(c));
export const isSolved=(c:CubeState)=>c.cp.every((v,i)=>v===i&&c.co[i]===0)&&c.ep.every((v,i)=>v===i&&c.eo[i]===0);
const FACES=['U','R','F','D','L','B'];const ALL_MOVES=FACES.flatMap(f=>[f,`${f}'`,`${f}2`]);
export const randomScramble=(count=25)=>{const out:string[]=[];let last='';while(out.length<count){const move=ALL_MOVES[Math.floor(Math.random()*ALL_MOVES.length)];if(move[0]===last)continue;last=move[0];out.push(move);}return out.join(' ');};
const cornerFacelet=[[8,9,20],[6,18,38],[0,36,47],[2,45,11],[29,26,15],[27,44,24],[33,53,42],[35,17,51]];
const cornerColor=[[0,1,2],[0,2,4],[0,4,5],[0,5,1],[3,2,1],[3,4,2],[3,5,4],[3,1,5]];
const edgeFacelet=[[5,10],[7,19],[3,37],[1,46],[32,16],[28,25],[30,43],[34,52],[23,12],[21,41],[50,39],[48,14]];
const edgeColor=[[0,1],[0,2],[0,4],[0,5],[3,1],[3,2],[3,4],[3,5],[2,1],[2,4],[5,4],[5,1]];
const LETTERS=['U','R','F','D','L','B'];
export const toFacelets=(c:CubeState)=>{const f=Array(54).fill(-1);for(let i=0;i<6;i++)f[i*9+4]=i;for(let i=0;i<8;i++){const piece=c.cp[i],ori=c.co[i];for(let n=0;n<3;n++)f[cornerFacelet[i][(n+ori)%3]]=cornerColor[piece][n];}for(let i=0;i<12;i++){const piece=c.ep[i],ori=c.eo[i];for(let n=0;n<2;n++)f[edgeFacelet[i][(n+ori)%2]]=edgeColor[piece][n];}return f;};
export const toFaceletString=(c:CubeState)=>toFacelets(c).map(v=>LETTERS[v]).join('');
