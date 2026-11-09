"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Pause, Play } from "lucide-react";
import WoodCard, { type WoodCardData } from "./wood-card";

type Wood = WoodCardData & { id: string };

export default function WoodCarousel({ woods }: { woods: Wood[] }) {
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ pointerId: number; x: number; scrollLeft: number; active: boolean } | null>(null);
  const animated = woods.length > 2;
  const cards = () => woods.map((wood, index) => <WoodCard key={wood.id} wood={wood} index={index} />);

  if (!woods.length) return <p className="wood-empty">Gatunki drewna pojawią się wkrótce.</p>;

  return (
    <div className={`wood-carousel${animated ? " wood-carousel-moving" : ""}${paused ? " is-paused" : ""}`}>
      {animated && (
        <button
          aria-label={paused ? "Włącz przesuwanie" : "Zatrzymaj przesuwanie"}
          className="wood-motion-toggle"
          title={paused ? "Włącz przesuwanie" : "Zatrzymaj przesuwanie"}
          type="button"
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? <Play aria-hidden="true" size={18} /> : <Pause aria-hidden="true" size={18} />}
        </button>
      )}
      <div
        aria-label="Gatunki drewna"
        className={`wood-carousel-viewport${dragging ? " is-dragging" : ""}`}
        role="region"
        tabIndex={animated ? 0 : undefined}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          const viewport = event.currentTarget;
          if (!animated && viewport.scrollWidth <= viewport.clientWidth) return;
          if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [contenteditable='true']")) return;
          drag.current = { pointerId: event.pointerId, x: event.clientX, scrollLeft: viewport.scrollLeft, active: false };
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current || current.pointerId !== event.pointerId) return;
          if (!(event.buttons & 1)) {
            drag.current = null;
            setDragging(false);
            return;
          }
          const distance = event.clientX - current.x;
          if (!current.active && Math.abs(distance) >= 5) {
            current.active = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }
          if (!current.active) return;
          event.preventDefault();
          const track = event.currentTarget.querySelector<HTMLElement>(".wood-carousel-track");
          const animation = track?.getAnimations()[0];
          const duration = animation?.effect?.getComputedTiming().duration;
          const cycleWidth = track ? track.scrollWidth / 2 : 0;
          if (animation && typeof duration === "number" && duration > 0 && cycleWidth > 0 && typeof animation.currentTime === "number") {
            const delta = event.clientX - current.x;
            const time = animation.currentTime - delta / cycleWidth * duration;
            animation.currentTime = ((time % duration) + duration) % duration;
            current.x = event.clientX;
          } else {
            event.currentTarget.scrollLeft = current.scrollLeft - distance;
          }
        }}
        onPointerUp={() => { drag.current = null; setDragging(false); }}
        onPointerCancel={() => { drag.current = null; setDragging(false); }}
        onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
        onPointerLeave={() => { if (drag.current && !drag.current.active) drag.current = null; }}
        onDragStart={(event) => {
          if (event.target instanceof HTMLImageElement && drag.current) event.preventDefault();
        }}
      >
        <div className="wood-carousel-track" style={{ "--wood-duration": `${woods.length * 12}s` } as CSSProperties}>
          <div className="wood-guide-list">{cards()}</div>
          {animated && <div aria-hidden="true" className="wood-guide-list wood-carousel-copy">{cards()}</div>}
        </div>
      </div>
    </div>
  );
}
