'use client';

import { useEffect } from 'react';

/**
 * Walks every `[data-ll-animate]` element on the page and reveals it
 * once it scrolls into view. Mirrors the original `lumen-reveal.js`
 * behavior: also reveals `.ll-stage` triptych cards individually so
 * their nested SVGs draw in as the user scrolls past.
 */
export function LandingReveal() {
    useEffect(() => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const items = document.querySelectorAll<HTMLElement>('[data-ll-animate]');
        if (prefersReduced) {
            items.forEach((el) => el.classList.add('in'));
            return;
        }

        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in');
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '-40px 0px -40px 0px' },
        );
        items.forEach((el) => io.observe(el));

        const stages = document.querySelectorAll<HTMLElement>('.ll-stage');
        const stageIo = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in');
                        stageIo.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.25 },
        );
        stages.forEach((s) => stageIo.observe(s));

        return () => {
            io.disconnect();
            stageIo.disconnect();
        };
    }, []);

    return null;
}
