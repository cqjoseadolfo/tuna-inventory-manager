"use client";

import { useRef, useState } from "react";

export type NewsletterItem = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  backgroundColor: string;
  accentColor: string;
};

interface Props {
  items: NewsletterItem[];
}

export default function NewsletterCarousel({ items }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageBroken, setImageBroken] = useState<Record<string, boolean>>({});
  const dragStartXRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const isDraggingRef = useRef(false);

  if (!items || items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];
  const isMultiple = items.length > 1;

  const goToSlide = (index: number) => {
    const boundedIndex = Math.max(0, Math.min(items.length - 1, index));
    setCurrentIndex(boundedIndex);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMultiple) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartTimeRef.current = Date.now();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const deltaX = e.clientX - dragStartXRef.current;
    const deltaTime = Date.now() - dragStartTimeRef.current;
    const velocity = Math.abs(deltaX / deltaTime);

    // Swipe detection: significant movement or fast flick
    if (Math.abs(deltaX) > 50 || velocity > 0.5) {
      if (deltaX > 0) {
        goToSlide(currentIndex - 1);
      } else {
        goToSlide(currentIndex + 1);
      }
    }
  };

  return (
    <section>
      <article
        className="relative h-[240px] overflow-hidden rounded-[2rem] py-6 pl-6 pr-6 text-white shadow-[0_18px_30px_rgba(36,0,255,0.24)] transition-all duration-300 sm:h-[280px]"
        style={{ background: currentItem.backgroundColor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex h-full flex-col justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: currentItem.accentColor }}>
              Newsletter
            </p>
            <h3 className="mt-2 text-[clamp(2rem,8vw,3rem)] font-black leading-[0.95]">{currentItem.title}</h3>
          </div>
          <p className="pr-[110px] text-[15px] leading-[1.3] text-white/80">{currentItem.description}</p>
        </div>

        {!imageBroken[currentItem.id] ? (
          <img
            src={currentItem.imageUrl}
            alt={currentItem.title}
            className="absolute bottom-0 -right-3 h-[200px] w-auto object-contain"
            style={{ zIndex: 2 }}
            onError={() => setImageBroken((prev: Record<string, boolean>) => ({ ...prev, [currentItem.id]: true }))}
            draggable={false}
          />
        ) : (
          <div className="absolute bottom-0 right-3 grid h-[120px] w-[120px] place-items-center rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-center">
            <span className="text-xs text-slate-300">No se pudo cargar imagen</span>
          </div>
        )}
      </article>

      {isMultiple && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`Ir a noticia ${index + 1}`}
              className={`h-2 rounded-full transition ${
                index === currentIndex
                  ? "w-8 bg-slate-900"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
