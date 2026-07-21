"use client";
import { useToast } from "./Toast";
import { WandIcon,ArrowRightIcon,LockIcon } from "./icons";
export default function SolveButton(){const toast=useToast();return <><button onClick={()=>toast("✨ Solving… your step-by-step guide is ready below.")} className="cta-green relative mt-4 flex w-full items-center justify-center gap-3 rounded-2xl p-[19px] text-[19px] font-extrabold tracking-[.6px]"><WandIcon className="absolute left-[22px] h-6 w-6"/>SOLVE MY CUBE<ArrowRightIcon className="absolute right-5 h-6 w-6"/></button><div className="mt-[14px] flex items-center justify-center gap-2 text-sm font-semibold text-[var(--muted)]"><LockIcon className="h-4 w-4 text-[var(--green)]"/>100% Free <span className="text-[var(--faint)]">•</span> No Sign Up Required</div></>}
