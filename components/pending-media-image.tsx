"use client";

import { useCallback, useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';
import { isPendingMediaUrl, openPendingMediaWindow } from '@/lib/image-prep';

/** Owner-facing images reopen their server-authorized window without exposing storage URLs. */
export function PendingMediaImage({ src, alt, className, onError, ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
  const [state, setState] = useState<{ source: string; phase: 'loading' | 'ready' | 'error'; revision: number }>({ source: src, phase: isPendingMediaUrl(src) ? 'loading' : 'ready', revision: 0 });
  const generation = useRef(0);
  const recovered = useRef(false);
  const open = useCallback((force = false) => {
    const current = ++generation.current;
    setState(previous => ({ ...previous, source: src, phase: 'loading' }));
    void openPendingMediaWindow(src, force).then(result => {
      if (generation.current === current) setState(previous => ({ source: src, phase: result.ok ? 'ready' : 'error', revision: previous.revision + 1 }));
    });
  }, [src]);
  useEffect(() => {
    recovered.current = false;
    if (isPendingMediaUrl(src)) open();
    else setState(previous => ({ ...previous, source: src, phase: 'ready' }));
    return () => { generation.current++; };
  }, [src, open]);
  if (isPendingMediaUrl(src) && (state.source !== src || state.phase !== 'ready')) {
    return <span className={['inline-flex items-center justify-center', className].filter(Boolean).join(' ')} role="status">
      {state.source !== src || state.phase === 'loading' ? 'Opening photo...' : <button type="button" onClick={() => { recovered.current = false; open(true); }} className="min-h-11 px-2 text-xs" aria-label={'Retry ' + alt}>Retry photo</button>}
    </span>;
  }
  // The proxy remains authoritative even when an earlier window was cached locally.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} key={src + ':' + state.revision} src={src} alt={alt} className={className} onError={event => {
    if (isPendingMediaUrl(src) && !recovered.current) { recovered.current = true; open(true); }
    else { setState(previous => ({ ...previous, phase: 'error' })); onError?.(event); }
  }} />;
}
