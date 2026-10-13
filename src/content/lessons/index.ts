import { M0 } from './m0';
import { M1 } from './m1';
import { M2 } from './m2';
import { M3 } from './m3';
import { M4 } from './m4';
import { M5 } from './m5';
import { M6 } from './m6';
import type { Lesson } from './types';
import { CHAPTERS } from '../chapters';

export type { Lesson, Block, ShowOption, WorkedStep } from './types';

const ALL: Lesson[] = [...M0, ...M1, ...M2, ...M3, ...M4, ...M5, ...M6];
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(ALL.map((l) => [l.id, l]));

/** Toutes les leçons, dans l'ordre du parcours (chapitres 1 à 12). */
export const LESSONS: Lesson[] = CHAPTERS.flatMap((c) => c.lessons.map((id) => LESSON_BY_ID[id]));

export function lessonsOfModule(module: string): Lesson[] {
  return LESSONS.filter((l) => l.module === module);
}

export function nextLesson(id: string): Lesson | undefined {
  const i = LESSONS.findIndex((l) => l.id === id);
  return i >= 0 ? LESSONS[i + 1] : undefined;
}
