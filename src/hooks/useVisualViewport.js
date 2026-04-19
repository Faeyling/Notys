import { useState, useEffect } from 'react';

/**
 * Returns the current visual viewport height.
 * When the virtual keyboard opens on mobile, this value shrinks to the
 * space above the keyboard — unlike window.innerHeight which stays fixed.
 */
export default function useVisualViewport() {
  const [height, setHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight,
  );

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setHeight(vv.height);
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}
