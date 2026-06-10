export const TENANT_STATUSES = ['active', 'suspended', 'trial'] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const USER_ROLES = ['admin', 'manager', 'closer', 'sdr'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;
export type AccountSize = (typeof ACCOUNT_SIZES)[number];

export const LEAD_STATUSES = ['open', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const AI_SCORES = ['A', 'B', 'C', 'D'] as const;
export type AiScore = (typeof AI_SCORES)[number];

export const LEAD_SOURCES = ['webhook', 'manual', 'import'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const TIMELINE_TYPES = [
  'note',
  'email',
  'call',
  'meeting',
  'stage_change',
  'ai_action',
  'system',
  'webhook',
] as const;
export type TimelineType = (typeof TIMELINE_TYPES)[number];

export const TASK_STATUSES = ['pending', 'done', 'overdue'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TRIGGER_TYPES = [
  'stage_change',
  'new_lead',
  'inactivity',
  'deal_won',
  'deal_lost',
  'webhook',
  'manual',
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const ACTION_TYPES = [
  'n8n_workflow',
  'send_email',
  'create_task',
  'assign_lead',
  'change_stage',
  'ai_score',
  'add_timeline_note',
  'webhook_outbound',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const EXECUTION_STATUSES = ['queued', 'running', 'success', 'failed'] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const CONDITION_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains'] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];
