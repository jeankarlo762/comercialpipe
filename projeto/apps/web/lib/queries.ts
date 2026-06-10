import { useQuery } from '@tanstack/react-query';
import { apiGet } from './api';
import type { BoardStage, CreditsBalance, Stage, Tenant } from './types';

export interface PipelineItem {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  orderIndex: number;
  createdAt: string;
}

export function useTenant() {
  return useQuery({
    queryKey: ['tenant'],
    queryFn: () => apiGet<{ tenant: Tenant }>('/tenants/current').then((r) => r.tenant),
    staleTime: 5 * 60_000,
  });
}

export function useCredits() {
  return useQuery({
    queryKey: ['credits'],
    queryFn: () => apiGet<CreditsBalance>('/ai/credits'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: () => apiGet<{ pipelines: PipelineItem[] }>('/pipelines').then((r) => r.pipelines),
    staleTime: 5 * 60_000,
  });
}

export function useStages(pipelineId?: string) {
  return useQuery({
    queryKey: ['stages', pipelineId],
    queryFn: () =>
      apiGet<{ stages: Stage[] }>('/pipeline/stages', pipelineId ? { pipelineId } : undefined).then(
        (r) => r.stages,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useBoard(pipelineId?: string) {
  return useQuery({
    queryKey: ['board', pipelineId],
    queryFn: () =>
      apiGet<{ stages: BoardStage[] }>('/pipeline', pipelineId ? { pipelineId } : undefined).then(
        (r) => r.stages,
      ),
    staleTime: 30_000,
  });
}
