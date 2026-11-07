import { useEffect, useRef } from 'react';

/** Progressive enhancement: content stays visible without observers or animation. */
export function useSignatureMotion() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cleanup = () => {};
    const setup = () => {
      cleanup();
      if (preference.matches) return;
      const targets = element.querySelectorAll<HTMLElement>(
        '.signature-heading, .signature-assurances, .signature-provenance-art, .signature-provenance-copy, .signature-terroir>div, .signature-journal, .signature-footer-top>div',
      );
      const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          entry.target.classList.add('signature-arrived');
          observer?.unobserve(entry.target);
        }
      }, { threshold: 0.12 }) : null;
      targets.forEach(target => observer?.observe(target));
      let frame = 0;
      const update = () => {
        frame = 0;
        const distance = document.documentElement.scrollHeight - window.innerHeight;
        element.style.setProperty('--reading-progress', String(distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0));
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      update();
      cleanup = () => {
        observer?.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        targets.forEach(target => target.classList.remove('signature-arrived'));
        element.style.removeProperty('--reading-progress');
      };
    };
    setup();
    preference.addEventListener('change', setup);
    return () => { cleanup(); preference.removeEventListener('change', setup); };
  }, []);
  return root;
}
