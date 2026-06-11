import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'suspended', 'trial']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'closer', 'sdr']);
export const accountSizeEnum = pgEnum('account_size', ['1-10', '11-50', '51-200', '201-500', '500+']);
export const leadStatusEnum = pgEnum('lead_status', ['open', 'won', 'lost']);
export const aiScoreEnum = pgEnum('ai_score', ['A', 'B', 'C', 'D']);
export const timelineTypeEnum = pgEnum('timeline_type', [
  'note',
  'email',
  'call',
  'meeting',
  'stage_change',
  'ai_action',
  'system',
  'webhook',
]);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'done', 'overdue']);
export const triggerTypeEnum = pgEnum('trigger_type', [
  'stage_change',
  'new_lead',
  'inactivity',
  'deal_won',
  'deal_lost',
  'webhook',
  'manual',
]);
export const executionStatusEnum = pgEnum('execution_status', ['queued', 'running', 'success', 'failed']);
export const meetingStatusEnum = pgEnum('meeting_status', ['scheduled', 'done', 'canceled']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 160 }).notNull(),
  slug: varchar('slug', { length: 60 }).notNull().unique(),
  status: tenantStatusEnum('status').notNull().default('trial'),
  apiKey: varchar('api_key', { length: 80 }).notNull().unique(),
  aiCreditsLimit: integer('ai_credits_limit').notNull().default(1000),
  aiCreditsUsed: integer('ai_credits_used').notNull().default(0),
  aiCreditsResetAt: timestamp('ai_credits_reset_at', { withTimezone: true }).notNull().defaultNow(),
  n8nBaseUrl: varchar('n8n_base_url', { length: 300 }),
  n8nApiKeyEnc: text('n8n_api_key_enc'),
  n8nWebhookSecretEnc: text('n8n_webhook_secret_enc'),
  googleClientIdEnc: text('google_client_id_enc'),
  googleClientSecretEnc: text('google_client_secret_enc'),
  ...timestamps,
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 200 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull(),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_tenant_email_uq').on(t.tenantId, t.email)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('refresh_tokens_user_idx').on(t.userId)],
);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 128 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ...timestamps,
});

export const pipelines = pgTable(
  'pipelines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    color: varchar('color', { length: 9 }).notNull().default('#6366f1'),
    isDefault: boolean('is_default').notNull().default(false),
    orderIndex: integer('order_index').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('pipelines_tenant_idx').on(t.tenantId)],
);
export type Pipeline = typeof pipelines.$inferSelect;

export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    pipelineId: uuid('pipeline_id').references(() => pipelines.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    orderIndex: integer('order_index').notNull(),
    color: varchar('color', { length: 9 }).notNull().default('#6366f1'),
    isClosedWon: boolean('is_closed_won').notNull().default(false),
    isClosedLost: boolean('is_closed_lost').notNull().default(false),
    ...timestamps,
  },
  (t) => [index('pipeline_stages_tenant_idx').on(t.tenantId, t.orderIndex)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    domain: varchar('domain', { length: 160 }),
    industry: varchar('industry', { length: 120 }),
    size: accountSizeEnum('size'),
    website: varchar('website', { length: 300 }),
    linkedinUrl: varchar('linkedin_url', { length: 300 }),
    address: jsonb('address').$type<Record<string, unknown>>(),
    customFields: jsonb('custom_fields').$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('accounts_tenant_idx').on(t.tenantId)],
);

export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 160 }).notNull(),
    email: varchar('email', { length: 200 }),
    phone: varchar('phone', { length: 40 }),
    roleTitle: varchar('role_title', { length: 120 }),
    linkedinUrl: varchar('linkedin_url', { length: 300 }),
    customFields: jsonb('custom_fields').$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('contacts_tenant_idx').on(t.tenantId)],
);

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => pipelineStages.id, { onDelete: 'restrict' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    estimatedValue: decimal('estimated_value', { precision: 15, scale: 2 }),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    probability: integer('probability'),
    status: leadStatusEnum('status').notNull().default('open'),
    lostReason: varchar('lost_reason', { length: 500 }),
    expectedCloseDate: date('expected_close_date'),
    aiScore: aiScoreEnum('ai_score'),
    aiScoreReason: text('ai_score_reason'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    source: varchar('source', { length: 40 }).notNull().default('manual'),
    utmData: jsonb('utm_data').$type<Record<string, unknown>>(),
    customFields: jsonb('custom_fields').$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('leads_tenant_stage_idx').on(t.tenantId, t.stageId),
    index('leads_tenant_owner_idx').on(t.tenantId, t.ownerId),
    index('leads_tenant_status_idx').on(t.tenantId, t.status),
  ],
);

export const timelineEntries = pgTable(
  'timeline_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    type: timelineTypeEnum('type').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    aiGenerated: boolean('ai_generated').notNull().default(false),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('timeline_lead_created_idx').on(t.leadId, t.createdAt)],
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    status: taskStatusEnum('status').notNull().default('pending'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('tasks_tenant_lead_idx').on(t.tenantId, t.leadId),
    index('tasks_assigned_idx').on(t.assignedTo),
  ],
);

export const automations = pgTable(
  'automations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    triggerType: triggerTypeEnum('trigger_type').notNull(),
    triggerConfig: jsonb('trigger_config').$type<Record<string, unknown>>().notNull().default({}),
    conditions: jsonb('conditions').$type<unknown[]>().notNull().default([]),
    actions: jsonb('actions').$type<unknown[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    executionCount: integer('execution_count').notNull().default(0),
    lastExecutedAt: timestamp('last_executed_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('automations_tenant_trigger_idx').on(t.tenantId, t.triggerType, t.isActive)],
);

export const automationExecutions = pgTable(
  'automation_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    automationId: uuid('automation_id')
      .notNull()
      .references(() => automations.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    status: executionStatusEnum('status').notNull().default('queued'),
    triggerPayload: jsonb('trigger_payload').$type<Record<string, unknown>>(),
    resultPayload: jsonb('result_payload').$type<Record<string, unknown>>(),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('automation_exec_automation_idx').on(t.automationId, t.createdAt)],
);

export const aiUsageLog = pgTable(
  'ai_usage_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    operation: varchar('operation', { length: 40 }).notNull(),
    creditsCost: decimal('credits_cost', { precision: 6, scale: 2 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index('ai_usage_tenant_idx').on(t.tenantId, t.createdAt)],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 80 }).notNull(),
    entityType: varchar('entity_type', { length: 40 }).notNull(),
    entityId: uuid('entity_id'),
    oldValue: jsonb('old_value').$type<Record<string, unknown>>(),
    newValue: jsonb('new_value').$type<Record<string, unknown>>(),
    ipAddress: varchar('ip_address', { length: 60 }),
    userAgent: varchar('user_agent', { length: 400 }),
    ...timestamps,
  },
  (t) => [index('audit_logs_tenant_idx').on(t.tenantId, t.createdAt)],
);

export const meetings = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    scheduledById: uuid('scheduled_by_id').references(() => users.id, { onDelete: 'set null' }),
    hostId: uuid('host_id').references(() => users.id, { onDelete: 'set null' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    location: varchar('location', { length: 300 }),
    notes: text('notes'),
    meetLink: varchar('meet_link', { length: 400 }),
    googleEventId: varchar('google_event_id', { length: 200 }),
    status: meetingStatusEnum('status').notNull().default('scheduled'),
    ...timestamps,
  },
  (t) => [index('meetings_tenant_start_idx').on(t.tenantId, t.startsAt)],
);

export const googleAccounts = pgTable('google_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 200 }),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc'),
  expiryDate: timestamp('expiry_date', { withTimezone: true }),
  scope: text('scope'),
  ...timestamps,
});

export const forms = pgTable(
  'forms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    publicId: varchar('public_id', { length: 40 }).notNull().unique(),
    description: text('description'),
    fields: jsonb('fields').$type<unknown[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    submissionsCount: integer('submissions_count').notNull().default(0),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    targetStageId: uuid('target_stage_id').references(() => pipelineStages.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('forms_tenant_idx').on(t.tenantId)],
);

export const webhookIdempotency = pgTable('webhook_idempotency', {
  key: varchar('key', { length: 200 }).primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps,
});

export const messageTemplates = pgTable(
  'message_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    category: varchar('category', { length: 60 }).notNull().default('geral'),
    body: text('body').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('msg_tpl_tenant_idx').on(t.tenantId)],
);

export const notificationTypeEnum = pgEnum('notification_type', [
  'lead_assigned',
  'lead_forgotten',
  'meeting_reminder',
  'lead_moved',
  'task_due',
  'goal_alert',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body').notNull(),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.isRead, t.createdAt)],
);

export const userGoals = pgTable(
  'user_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    targetRevenue: decimal('target_revenue', { precision: 15, scale: 2 }),
    targetLeads: integer('target_leads'),
    targetMeetings: integer('target_meetings'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('user_goals_user_month_uq').on(t.userId, t.month, t.year),
    index('user_goals_tenant_idx').on(t.tenantId),
  ],
);

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserGoal = typeof userGoals.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type TimelineEntry = typeof timelineEntries.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Automation = typeof automations.$inferSelect;
export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
