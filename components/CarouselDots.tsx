/* Position indicator placeholder for future section carousels. */
export default function CarouselDots() {
  return (
    <div className="mt-[18px] flex justify-center gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <i key={i} className={i===0?"h-[7px] w-[22px] rounded-[4px] bg-[var(--blue)]":"h-[7px] w-[7px] rounded-full bg-[var(--faint)]"}/>
      ))}
    </div>
  );
}
