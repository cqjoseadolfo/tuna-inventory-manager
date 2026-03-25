"use client";

import { useState } from "react";

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

  if (!items || items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];
  const isMultiple = items.length > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev: number) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev: number) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <section>
      <article
        className="relative min-h-[180px] overflow-visible rounded-[2rem] py-6 pl-6 pr-6 text-white shadow-[0_18px_30px_rgba(36,0,255,0.24)] transition-all duration-300"
        style={{ background: currentItem.backgroundColor }}
      >
        <div className="flex h-full flex-col justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: currentItem.accentColor }}>
              Newsletter
            </p>
            <h3 className="mt-2 text-[48px] font-black leading-[0.95]">{currentItem.title}</h3>
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
          />
        ) : (
          <div className="absolute bottom-0 right-3 grid h-[120px] w-[120px] place-items-center rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-center">
            <span className="text-xs text-slate-300">No se pudo cargar imagen</span>
          </div>
        )}
      </article>

      {isMultiple && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goToPrevious}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Noticia anterior"
          >
            ←
          </button>

          <div className="flex gap-2">
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

          <button
            type="button"
            onClick={goToNext}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Siguiente noticia"
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}
