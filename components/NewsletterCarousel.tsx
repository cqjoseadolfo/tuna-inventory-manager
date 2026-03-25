"use client";

import { useEffect, useRef, useState } from "react";

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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  if (!items || items.length === 0) {
    return null;
  }

  const isMultiple = items.length > 1;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !isMultiple) {
      return;
    }

    const syncIndexFromScroll = () => {
      const width = track.clientWidth;
      if (!width) {
        return;
      }
      const nextIndex = Math.round(track.scrollLeft / width);
      if (nextIndex !== currentIndex) {
        setCurrentIndex(Math.max(0, Math.min(items.length - 1, nextIndex)));
      }
    };

    track.addEventListener("scroll", syncIndexFromScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", syncIndexFromScroll);
    };
  }, [currentIndex, isMultiple, items.length]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isMultiple || !trackRef.current) {
      return;
    }
    dragPointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = trackRef.current.scrollLeft;
    trackRef.current.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current || dragPointerIdRef.current !== event.pointerId) {
      return;
    }
    const delta = event.clientX - dragStartXRef.current;
    trackRef.current.scrollLeft = dragStartScrollLeftRef.current - delta;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current || dragPointerIdRef.current !== event.pointerId) {
      return;
    }
    trackRef.current.releasePointerCapture(event.pointerId);
    dragPointerIdRef.current = null;
  };

  const goToSlide = (index: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    track.scrollTo({
      left: index * track.clientWidth,
      behavior: "smooth",
    });
    setCurrentIndex(index);
  };

  return (
    <section>
      <div
        ref={trackRef}
        className="newsletter-track flex snap-x snap-mandatory overflow-x-auto"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {items.map((item) => (
          <article
            key={item.id}
            className="relative h-[250px] w-full shrink-0 snap-start overflow-hidden rounded-[2rem] py-6 pl-6 pr-6 text-white shadow-[0_18px_30px_rgba(36,0,255,0.24)] transition-all duration-300 sm:h-[270px]"
            style={{ background: item.backgroundColor }}
          >
            <div className="flex h-full flex-col justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: item.accentColor }}>
                  Newsletter
                </p>
                <h3 className="mt-2 pr-24 text-[clamp(2rem,10vw,3rem)] font-black leading-[0.95]">{item.title}</h3>
              </div>
              <p className="pr-[110px] text-[15px] leading-[1.3] text-white/80">{item.description}</p>
            </div>

            {!imageBroken[item.id] ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="absolute bottom-0 -right-3 h-[200px] w-auto object-contain"
                style={{ zIndex: 2 }}
                onError={() => setImageBroken((prev: Record<string, boolean>) => ({ ...prev, [item.id]: true }))}
                draggable={false}
              />
            ) : (
              <div className="absolute bottom-0 right-3 grid h-[120px] w-[120px] place-items-center rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-center">
                <span className="text-xs text-slate-300">No se pudo cargar imagen</span>
              </div>
            )}
          </article>
        ))}
      </div>

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
