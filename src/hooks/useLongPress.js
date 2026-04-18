import { useRef, useCallback } from 'react';

export default function useLongPress(onLongPress, onClick, duration = 500) {
  const timer = useRef(null);
  const fired = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const start = useCallback((e) => {
    fired.current = false;
    const touch = e.touches?.[0] || e;
    startPos.current = { x: touch.clientX, y: touch.clientY };
    timer.current = setTimeout(() => {
      fired.current = true;
      onLongPress(e);
    }, duration);
  }, [onLongPress, duration]);

  const cancel = useCallback(() => {
    clearTimeout(timer.current);
  }, []);

  const end = useCallback((e) => {
    clearTimeout(timer.current);
    if (!fired.current && onClick) onClick(e);
  }, [onClick]);

  const move = useCallback((e) => {
    const touch = e.touches?.[0] || e;
    const dx = Math.abs(touch.clientX - startPos.current.x);
    const dy = Math.abs(touch.clientY - startPos.current.y);
    if (dx > 10 || dy > 10) clearTimeout(timer.current);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: move,
  };
}
