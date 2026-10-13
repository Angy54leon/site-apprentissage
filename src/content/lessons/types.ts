import type { ModuleId } from '../skills';
import type { ExerciseSpec } from '../../exercises/types';

export type ShowOption = 'numbers' | 'chain' | 'subs' | 'groups' | 'carbons' | 'hydrogens';

export type Block =
  | { t: 'p'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'tip' | 'warn' | 'info' | 'mnemo'; text: string; title?: string }
  | { t: 'mol'; smiles: string; caption?: string; show?: ShowOption[]; mode?: 'topo' | 'semi' | 'dev'; compare?: boolean; asWritten?: boolean }
  | { t: 'table'; head: string[]; rows: string[][] };

export interface WorkedStep {
  title: string;
  text: string;
  /** Ce que l'on met en évidence sur la molécule à cette étape. */
  show?: ShowOption[];
}

export interface Lesson {
  id: string;
  module: ModuleId;
  title: string;
  /** Durée estimée en minutes. */
  duration: number;
  skills: string[];
  /** Notion avancée, qui peut être étudiée plus tard. */
  advanced?: boolean;
  objective: string;
  explanation: Block[];
  rule: Block[];
  worked: { smiles?: string; intro: string; steps?: WorkedStep[]; answer?: string; mode?: 'topo' | 'semi' | 'dev' };
  mistake: { wrong: string; right: string; why: string; smiles?: string };
  mnemonic?: string;
  examples: { smiles: string; comment?: string }[];
  guided: ExerciseSpec[];
  autonomous: ExerciseSpec[];
  quiz: ExerciseSpec[];
  summary: string[];
}
