import { defineCollection, z } from 'astro:content';

const nullable = <T extends z.ZodTypeAny>(s: T) => s.nullish().transform(v => v ?? undefined);

const projects = defineCollection({
  schema: z.object({
    title: z.string(),
    description: nullable(z.string()),
    status: z.union([
      z.enum(['live', 'building', 'planned', 'paused', 'archived']),
      z.array(z.enum(['live', 'building', 'planned', 'paused', 'archived'])),
    ]).default('planned'),
    eta: nullable(z.string()),
    tags: z.array(z.string()).optional().default([]),
    link: nullable(z.string().url()),
    banner: nullable(z.string()),
    role: nullable(z.string()),
    relativeScale: nullable(z.number().min(1).max(10)),
    order: nullable(z.number()),
  }),
});

const pages = defineCollection({
  schema: z.object({
    title: z.string(),
    version: z.number().optional(),
  }),
});

export const collections = { projects, pages };