// Mesure du temps d'apprentissage ACTIF : on ne compte que le temps où la page est
// visible et où l'utilisateur a interagi récemment (moins de 90 s d'inactivité).
import { useEffect } from 'react';
import { addActiveTime } from '../state/store';

const IDLE_MS = 90_000;
const FLUSH_MS = 15_000;

export function useActiveTimer(kind: 'lesson' | 'exercise' | 'review', enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let lastInput = Date.now();
    let lastTick = Date.now();
    let acc = 0;
    const onInput = () => {
      lastInput = Date.now();
    };
    const tick = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && now - lastInput < IDLE_MS) acc += now - lastTick;
      lastTick = now;
    };
    const flush = () => {
      tick();
      if (acc > 0) {
        addActiveTime(kind, acc);
        acc = 0;
      }
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onInput, { passive: true }));
    const t1 = setInterval(tick, 1000);
    const t2 = setInterval(flush, FLUSH_MS);
    document.addEventListener('visibilitychange', flush);
    return () => {
      flush();
      events.forEach((e) => window.removeEventListener(e, onInput));
      clearInterval(t1);
      clearInterval(t2);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [kind, enabled]);
}
