'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePipelines, useStages } from '@/lib/queries';
import { KanbanBoard } from '@/components/pipeline/kanban-board';
import { NewLeadDialog } from '@/components/pipeline/new-lead-dialog';
import { Skeleton } from '@/components/ui/skeleton';

function PipelinePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pipelineId = searchParams.get('p') ?? undefined;

  const { data: pipelines, isLoading: loadingPipelines } = usePipelines();
  const { data: stages, isLoading: loadingStages } = useStages(pipelineId);

  useEffect(() => {
    if (!pipelineId && pipelines && pipelines.length > 0) {
      router.replace(`/pipeline?p=${pipelines[0].id}`);
    }
  }, [pipelineId, pipelines, router]);

  const currentPipeline = pipelines?.find((p) => p.id === pipelineId);
  const isLoading = loadingPipelines || loadingStages;

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {currentPipeline?.name ?? 'Pipeline'}
          </h1>
          <p className="text-sm text-muted-foreground">Arraste leads entre os estágios</p>
        </div>
        <NewLeadDialog pipelineId={pipelineId} />
      </div>

      {isLoading || !stages ? (
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72" />
          ))}
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <KanbanBoard stages={stages} pipelineId={pipelineId} />
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex gap-4 p-4 md:p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-72" />
          ))}
        </div>
      }
    >
      <PipelinePageInner />
    </Suspense>
  );
}
