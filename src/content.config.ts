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
    // Astro parses unquoted YYYY-MM-DD as a Date object; convert it back to a string.
    // We also use the `nullable` helper so blank fields don't crash the build.
    eta: nullable(
      z.union([z.string(), z.date()]).transform((v) =>
        v instanceof Date ? v.toISOString().split("T")[0] : v
      )
    ),
    order: nullable(z.number()),
    link: z.string().optional(),
    role: z.string().optional(),
    ctaLabel: z.string().optional(),
    version: z.string().optional(),
    // Preprocess handles missing (undefined), empty strings (''), and null.
    // If valid, it checks the enum; otherwise, it turns into undefined.
    effort: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.enum(['high', 'medium', 'low']).optional()
    ),
    leverage: z.preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.enum(['high', 'medium', 'low']).optional()
    ),
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
