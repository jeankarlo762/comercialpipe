export interface DefaultStage {
  name: string;
  color: string;
  isClosedWon: boolean;
  isClosedLost: boolean;
}

export const DEFAULT_PIPELINE_STAGES: DefaultStage[] = [
  { name: 'Novo', color: '#6366f1', isClosedWon: false, isClosedLost: false },
  { name: 'Qualificação', color: '#8b5cf6', isClosedWon: false, isClosedLost: false },
  { name: 'Proposta', color: '#0ea5e9', isClosedWon: false, isClosedLost: false },
  { name: 'Negociação', color: '#f59e0b', isClosedWon: false, isClosedLost: false },
  { name: 'Ganho', color: '#10b981', isClosedWon: true, isClosedLost: false },
  { name: 'Perdido', color: '#ef4444', isClosedWon: false, isClosedLost: true },
];
