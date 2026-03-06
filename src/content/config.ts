import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  schema: z.object({
    title: z.string(),
    status: z.string(),
    category: z.string(),
    link: z.string(),
    description: z.string(),
  }),
});

export const collections = { projects };