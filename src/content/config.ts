import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  schema: z.object({
    banner: z.string(),
    title: z.string(),
    status: z.string(),
    tags: z.string(),
    link: z.string(),
    description: z.string(),
    role: z.string(),
    'relative-scale': z.string(),
  }),
});

const pages = defineCollection({
  schema: z.object({
    title: z.string(),
    version: z.number(),
  }),
});

export const collections = { projects, pages };