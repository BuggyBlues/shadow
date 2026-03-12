import { z } from 'zod'

// ─── App CRUD ───

export const createAppSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  iconUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  sourceType: z.enum(['zip', 'url']),
  /** For 'url' type → external URL; for 'zip' type → MinIO object key (set after upload) */
  sourceUrl: z.string().min(1).max(2000),
  version: z.string().max(50).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
  isHomepage: z.boolean().optional().default(false),
  settings: z.record(z.unknown()).optional(),
})

export type CreateAppInput = z.infer<typeof createAppSchema>

export const updateAppSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  sourceType: z.enum(['zip', 'url']).optional(),
  sourceUrl: z.string().min(1).max(2000).optional(),
  version: z.string().max(50).nullable().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  isHomepage: z.boolean().optional(),
  settings: z.record(z.unknown()).nullable().optional(),
})

export type UpdateAppInput = z.infer<typeof updateAppSchema>

// ─── App Listing (public query) ───

export const listAppsQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

// ─── Publish from workspace ───

export const publishFromWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  iconUrl: z.string().nullable().optional(),
  /** The workspace file ID of the zip to publish */
  fileId: z.string().uuid(),
  version: z.string().max(50).optional(),
  isHomepage: z.boolean().optional().default(false),
})

export type PublishFromWorkspaceInput = z.infer<typeof publishFromWorkspaceSchema>
