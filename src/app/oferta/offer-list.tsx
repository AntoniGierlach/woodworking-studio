"use client";

import { useRef, useState, type ReactNode } from "react";

type DragState = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  active: boolean;
};

export default function OfferList({ children, count }: { children: ReactNode; count: number }) {
  const drag = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  function finishDrag() {
    drag.current = null;
    setDragging(false);
  }

  return (
    <div
      aria-label={count > 1 ? "Lista ofert przewijana w poziomie" : undefined}
      className={`service-list page-width offer-list${count > 0 ? " offer-list-scroll" : ""}${dragging ? " is-dragging" : ""}`}
      role={count > 1 ? "region" : undefined}
      tabIndex={count > 1 ? 0 : undefined}
      onPointerDown={(event) => {
        const element = event.currentTarget;
        if (
          event.pointerType !== "mouse" ||
          event.button !== 0 ||
          element.scrollWidth <= element.clientWidth ||
          (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, label, [contenteditable='true']")) ||
          event.clientY >= element.getBoundingClientRect().top + element.clientHeight
        ) return;
        drag.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startScrollLeft: element.scrollLeft,
          active: false,
        };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (!(event.buttons & 1)) {
          finishDrag();
          return;
        }
        const distance = event.clientX - current.startX;
        if (!current.active && Math.abs(distance) >= 5) {
          current.active = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
        }
        if (current.active) {
          event.preventDefault();
          event.currentTarget.scrollLeft = current.startScrollLeft - distance;
        }
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onLostPointerCapture={finishDrag}
      onPointerLeave={() => {
        if (drag.current && !drag.current.active) finishDrag();
      }}
      onDragStart={(event) => {
        if (event.target instanceof HTMLImageElement && drag.current) event.preventDefault();
      }}
    >
      {children}
    </div>
  );
}
