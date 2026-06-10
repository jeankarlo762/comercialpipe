import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from '@commercialpipe/shared-types';
import { db } from '../../shared/database/client.js';
import { tasks } from '../../shared/database/schema.js';
import { NotFoundError } from '../../shared/errors/app-error.js';

type TaskRow = typeof tasks.$inferSelect;

function withComputedStatus(task: TaskRow): TaskRow & { status: TaskRow['status'] } {
  if (task.status === 'pending' && task.dueDate && task.dueDate.getTime() < Date.now()) {
    return { ...task, status: 'overdue' };
  }
  return task;
}

export async function listTasks(tenantId: string, query: ListTasksQuery) {
  const offset = (query.page - 1) * query.limit;
  const filters: SQL[] = [eq(tasks.tenantId, tenantId)];
  if (query.leadId) filters.push(eq(tasks.leadId, query.leadId));
  if (query.assignedTo) filters.push(eq(tasks.assignedTo, query.assignedTo));
  if (query.status) filters.push(eq(tasks.status, query.status));
  const where = and(...filters);

  const [rows, [totals]] = await Promise.all([
    db.select().from(tasks).where(where).orderBy(desc(tasks.createdAt)).limit(query.limit).offset(offset),
    db.select({ value: count() }).from(tasks).where(where),
  ]);
  return { rows: rows.map(withComputedStatus), total: totals?.value ?? 0 };
}

export async function createTask(
  tenantId: string,
  createdBy: string,
  input: CreateTaskInput,
) {
  const [task] = await db
    .insert(tasks)
    .values({
      tenantId,
      leadId: input.leadId,
      assignedTo: input.assignedTo ?? createdBy,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdBy,
    })
    .returning();
  return task ? withComputedStatus(task) : task;
}

export async function updateTask(tenantId: string, taskId: string, input: UpdateTaskInput) {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.assignedTo !== undefined) patch.assignedTo = input.assignedTo;
  if (input.dueDate !== undefined) patch.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.status !== undefined) patch.status = input.status;

  const [task] = await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)))
    .returning();
  if (!task) throw new NotFoundError('Tarefa não encontrada', 'TASK_NOT_FOUND');
  return withComputedStatus(task);
}
