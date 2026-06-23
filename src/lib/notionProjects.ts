// src/lib/notionProjects.ts
//
// Fetches the Notion "Projects" database at build time and normalizes
// each page into the same shape ProjectsList.astro already expects from
// markdown content collection entries.
//
// Caching: on a successful fetch, writes results to a local JSON cache
// file. If the Notion API is unreachable (network error, rate limit,
// token revoked, etc.), falls back to the cache file so the build
// doesn't break and the site shows the last known good data.

import fs from "node:fs";
import path from "node:path";

const NOTION_VERSION = "2022-06-28";
const CACHE_PATH = path.join(process.cwd(), "src", "data", "projects-cache.json");

type StatusValue = "live" | "building" | "planned" | "paused" | "archived";

export interface NormalizedProject {
  slug: string;
  data: {
    title: string;
    description?: string;
    status: StatusValue | StatusValue[];
    eta?: string;
    link?: string;
    role?: string;
    order?: number;
    ctaLabel?: string;
    hidden?: boolean;
    source: "notion";
  };
}

// --- Notion API response helpers ---

function getCheckbox(prop: any): boolean {
  return prop?.checkbox ?? false;
}

function getTitle(prop: any): string {
  return prop?.title?.[0]?.plain_text ?? "";
}

function getRichText(prop: any): string | undefined {
  const text = prop?.rich_text?.[0]?.plain_text;
  return text || undefined;
}

// Notion's url-type property does no validation: typing "google.com"
// (no scheme) is stored and returned exactly as "google.com". Notion's
// own UI resolves bare domains for you when you click them, but a raw
// <a href="google.com"> on our site is a relative URL, so the browser
// resolves it against the current page path (e.g. becomes
// "/projects/google.com") instead of going to the external site. Add
// a scheme whenever one is missing so the href is always absolute.
function withScheme(value: string): string {
  // mailto:, tel:, etc. are already absolute — leave them alone.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return value;
  }
  // Protocol-relative ("//example.com") is already absolute too.
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  return `https://${value}`;
}

// Notion's "Link" column might be configured as a real `url` property,
// or it might be a `rich_text` column where someone just typed/pasted a
// URL. Only checking prop.url meant every row that used rich_text came
// back as undefined, which made ProjectsList.astro fall through to
// rendering the row as an internal link (no href) for everything except
// the one row that happened to use a true url-type field. Check both
// shapes, trim stray whitespace, and normalize missing schemes.
function getUrl(prop: any): string | undefined {
  if (typeof prop?.url === "string" && prop.url.trim()) {
    return withScheme(prop.url.trim());
  }
  const rich = prop?.rich_text?.[0]?.plain_text;
  if (typeof rich === "string" && rich.trim()) {
    return withScheme(rich.trim());
  }
  return undefined;
}

function getNumber(prop: any): number | undefined {
  return typeof prop?.number === "number" ? prop.number : undefined;
}

function getMultiSelect(prop: any): string[] {
  return (prop?.multi_select ?? []).map((opt: any) => opt.name);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function normalizePage(page: any): NormalizedProject {
  const props = page.properties;

  const title = getTitle(props["Title"]);
  const statusRaw = getMultiSelect(props["Status"]);
  const status = (statusRaw.length > 0 ? statusRaw : ["planned"]) as StatusValue[];

  return {
    slug: slugify(title),
    data: {
      title,
      description: getRichText(props["Description"]),
      status,
      eta: getRichText(props["ETA"]),
      link: getUrl(props["Link"]),
      role: getRichText(props["Role"]),
      order: getNumber(props["Order"]),
      ctaLabel: getRichText(props["CTA Label"]),
      hidden: getCheckbox(props["Hidden"]),
      source: "notion",
    },
  };
}

// --- Cache helpers ---

function readCache(): NormalizedProject[] | null {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const raw = fs.readFileSync(CACHE_PATH, "utf-8");
      return JSON.parse(raw) as NormalizedProject[];
    }
  } catch {
    console.warn("[notionProjects] Cache file exists but couldn't be parsed — ignoring.");
  }
  return null;
}

function writeCache(projects: NormalizedProject[]): void {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(projects, null, 2), "utf-8");
  } catch (err) {
    console.warn("[notionProjects] Failed to write cache file:", err);
  }
}

// --- Main export ---

export async function getNotionProjects(): Promise<NormalizedProject[]> {
  const token = import.meta.env.NOTION_TOKEN;
  const databaseId = import.meta.env.NOTION_PROJECTS_DB_ID;

  if (!token || !databaseId) {
    console.warn(
      "[notionProjects] NOTION_TOKEN or NOTION_PROJECTS_DB_ID is missing — " +
      "checking cache..."
    );
    const cached = readCache();
    if (cached) {
      console.log(`[notionProjects] Loaded ${cached.length} projects from cache.`);
      return cached;
    }
    console.warn("[notionProjects] No cache available — returning empty array.");
    return [];
  }

  try {
    const results: any[] = [];
    let cursor: string | undefined = undefined;

    do {
      const res: Response = await fetch(
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cursor ? { start_cursor: cursor } : {}),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(
          `[notionProjects] Notion API request failed: ${res.status} ${body}`
        );
      }

      const json: any = await res.json();
      results.push(...json.results);
      cursor = json.has_more ? json.next_cursor : undefined;
    } while (cursor);

    const projects = results.map(normalizePage).filter(p => !p.data.hidden);
    writeCache(projects);
    console.log(`[notionProjects] Fetched ${projects.length} projects from Notion.`);
    return projects;
  } catch (err) {
    console.warn("[notionProjects] Fetch failed:", err);
    console.warn("[notionProjects] Falling back to cache...");
    const cached = readCache();
    if (cached) {
      console.log(`[notionProjects] Loaded ${cached.length} projects from cache.`);
      return cached;
    }
    console.warn("[notionProjects] No cache available — returning empty array.");
    return [];
  }
}