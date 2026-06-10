import { z } from 'zod';
import { ACCOUNT_SIZES } from '../enums.js';

const customFields = z.record(z.string(), z.unknown());

export const createContactSchema = z.object({
  accountId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(160),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  roleTitle: z.string().max(120).nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  customFields: customFields.optional(),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial();
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

const address = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zip: z.string().optional(),
  })
  .partial();

export const createAccountSchema = z.object({
  name: z.string().min(1).max(160),
  domain: z.string().max(160).nullable().optional(),
  industry: z.string().max(120).nullable().optional(),
  size: z.enum(ACCOUNT_SIZES).nullable().optional(),
  website: z.string().url().nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),
  address: address.nullable().optional(),
  customFields: customFields.optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
