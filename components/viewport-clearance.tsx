'use client';

import { useEffect, useRef } from 'react';

/** Reserve space for the actual floating chrome, including wrapped or enlarged text. */
export function ViewportClearance() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const shell = marker.current?.closest<HTMLElement>('[data-styld-app-shell]');
    if (!shell) return;
    const root = document.documentElement;
    const previousScrollPadding = root.style.scrollPaddingBottom;
    let frame = 0;
    const observed = new Set<Element>();
    function measure() {
      frame = 0;
      let clearance = 32;
      for (const overlay of observed) {
        if (!overlay.isConnected || getComputedStyle(overlay).position !== 'fixed') continue;
        const rect = overlay.getBoundingClientRect();
        if (rect.height > 0 && rect.width > 0 && rect.top < window.innerHeight) {
          clearance = Math.max(clearance, window.innerHeight - rect.top + 16);
        }
      }
      shell!.style.setProperty('--styld-page-bottom-clearance', `${Math.ceil(clearance)}px`);
      root.style.scrollPaddingBottom = `${Math.ceil(clearance)}px`;
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(measure); }
    const resize = new ResizeObserver(schedule);
    function observeOverlays() {
      for (const element of observed) {
        if (!element.isConnected) { resize.unobserve(element); observed.delete(element); }
      }
      for (const element of shell!.querySelectorAll('.mobile-bottom-nav, [aria-label="Plan shortlist"]')) {
        if (!observed.has(element)) { observed.add(element); resize.observe(element); }
      }
      schedule();
    }
    const mutations = new MutationObserver(observeOverlays);
    mutations.observe(shell, { childList: true, subtree: true });
    observeOverlays();
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect();
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      shell.style.removeProperty('--styld-page-bottom-clearance');
      root.style.scrollPaddingBottom = previousScrollPadding;
    };
  }, []);
  return <span ref={marker} hidden aria-hidden="true" />;
}
