import { z } from 'zod';

export const FORM_FIELD_TYPES = ['text', 'textarea', 'checkbox', 'number', 'currency'] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const formFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_]+$/, 'use apenas minúsculas, números e underscore'),
  label: z.string().min(1).max(120),
  type: z.enum(FORM_FIELD_TYPES),
  required: z.boolean().default(false),
  // Para checkbox com múltiplas opções selecionáveis.
  options: z.array(z.string().min(1).max(120)).max(30).optional(),
});
export type FormField = z.infer<typeof formFieldSchema>;

export const createFormSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).nullable().optional(),
  fields: z.array(formFieldSchema).max(30).default([]),
  isActive: z.boolean().default(true),
});
export type CreateFormInput = z.infer<typeof createFormSchema>;

export const updateFormSchema = createFormSchema.partial();
export type UpdateFormInput = z.infer<typeof updateFormSchema>;

// Public submission: name / company / phone are always required.
export const formSubmissionSchema = z.object({
  name: z.string().min(1).max(160),
  company: z.string().min(1).max(160),
  phone: z.string().min(5).max(40),
  email: z.string().email().optional(),
  fields: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.number(), z.array(z.string())]))
    .default({}),
});
export type FormSubmissionInput = z.infer<typeof formSubmissionSchema>;
