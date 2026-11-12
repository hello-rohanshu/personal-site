// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const nullable = <T extends z.ZodTypeAny>(s: T) => s.nullish().transform(v => v ?? undefined);

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    status: z.union([
      z.enum(['working-on', 'paused', 'planned']),
      z.array(z.enum(['working-on', 'paused', 'planned'])),
    ]),
    eta: z.string().optional(),
    link: z.string().optional(),
    role: z.string().optional(),
    order: z.number().optional(),
    ctaLabel: z.string().optional(),
    version: z.string().optional(),
    effort: z.enum(['high', 'medium', 'low']).optional(),
    leverage: z.enum(['high', 'medium', 'low']).optional(),
    visible: z.boolean().optional().default(true),
    changelog: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    version: z.number().optional(),
  }),
});

export const collections = { projects, pages };
