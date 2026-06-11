import type {
  AiScore,
  LeadStatus,
  TimelineType,
  UserRole,
} from '@commercialpipe/shared-types';

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  apiKey: string;
  aiCreditsLimit: number;
  aiCreditsUsed: number;
  aiCreditsResetAt: string;
  n8nBaseUrl: string | null;
  n8nConfigured: boolean;
  googleConfigured: boolean;
}

export interface Stage {
  id: string;
  name: string;
  orderIndex: number;
  color: string;
  isClosedWon: boolean;
  isClosedLost: boolean;
}

export interface BoardStage extends Stage {
  leadCount: number;
  totalValue: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  title: string;
  ownerId: string | null;
  stageId: string;
  contactId: string | null;
  accountId: string | null;
  estimatedValue: string | null;
  currency: string;
  probability: number | null;
  status: LeadStatus;
  lostReason: string | null;
  expectedCloseDate: string | null;
  aiScore: AiScore | null;
  aiScoreReason: string | null;
  lastActivityAt: string;
  source: string;
  createdAt: string;
  customFields?: Record<string, unknown>;
  ownerName?: string | null;
  stageName?: string | null;
  stageColor?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  accountName?: string | null;
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleTitle: string | null;
  accountId: string | null;
  linkedinUrl: string | null;
}

export interface Account {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
}

export interface TimelineEntry {
  id: string;
  leadId: string;
  type: TimelineType;
  content: string;
  metadata: Record<string, unknown> | null;
  aiGenerated: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface LeadDetail {
  lead: Lead;
  contact: Contact | null;
  account: Account | null;
  stage: Stage | null;
  timeline: TimelineEntry[];
}

export interface CreditsBalance {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  conditions: unknown[];
  actions: unknown[];
  isActive: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
  createdAt: string;
}

export interface FormFieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'checkbox' | 'number' | 'currency';
  required: boolean;
  options?: string[];
}

export interface Meeting {
  id: string;
  leadId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  notes: string | null;
  meetLink: string | null;
  status: 'scheduled' | 'done' | 'canceled';
  scheduledById: string | null;
  hostId: string | null;
  leadTitle: string | null;
  scheduledByName: string | null;
  hostName: string | null;
}

export interface FormItem {
  id: string;
  name: string;
  description: string | null;
  publicId: string;
  fields: FormFieldDef[];
  isActive: boolean;
  submissionsCount: number;
  targetStageId: string | null;
  createdAt: string;
}

export interface PublicForm {
  name: string;
  description: string | null;
  fields: FormFieldDef[];
  isActive: boolean;
  publicId: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  userName: string | null;
}

export interface NbaResult {
  action_type: string;
  priority: string;
  suggested_message: string;
  reasoning: string;
  best_time: string;
  cached?: boolean;
}

export interface EmailDraftResult {
  subject: string;
  body: string;
}
