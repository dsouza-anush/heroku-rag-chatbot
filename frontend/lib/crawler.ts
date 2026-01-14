import * as cheerio from "cheerio";

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
}

export interface CrawlProgress {
  crawled: number;
  total: number | null;
  currentUrl?: string;
}

export interface CrawlOptions {
  maxPages?: number;
  sameDomain?: boolean;
  onProgress?: (progress: CrawlProgress) => void;
}

// Text chunking utilities
const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200;

export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at a sentence or paragraph boundary
    if (end < text.length) {
      // Look for paragraph break
      const paragraphBreak = text.lastIndexOf("\n\n", end);
      if (paragraphBreak > start + chunkSize / 2) {
        end = paragraphBreak;
      } else {
        // Look for sentence break
        const sentenceBreak = text.lastIndexOf(". ", end);
        if (sentenceBreak > start + chunkSize / 2) {
          end = sentenceBreak + 1;
        }
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;

    // Avoid creating tiny final chunks
    if (text.length - start < chunkSize / 2) {
      chunks[chunks.length - 1] += " " + text.slice(start).trim();
      break;
    }
  }

  return chunks.filter((chunk) => chunk.length > 50); // Filter out very small chunks
}

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HerokuRAGBot/1.0)",
      },
      redirect: "follow",
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = await response.text();
    return { html, finalUrl: response.url };
  } catch {
    return null;
  }
}

// Fallback for JS-rendered pages using jina.ai reader
async function fetchWithJinaReader(url: string): Promise<{ content: string; title: string } | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
      },
    });

    if (!response.ok) return null;

    const text = await response.text();

    // Extract title from first line if it starts with # (markdown heading)
    const lines = text.split('\n');
    let title = url;
    let content = text;

    if (lines[0]?.startsWith('# ')) {
      title = lines[0].replace(/^# /, '').trim();
      content = lines.slice(1).join('\n').trim();
    } else if (lines[0]?.startsWith('Title: ')) {
      title = lines[0].replace(/^Title: /, '').trim();
      content = lines.slice(1).join('\n').trim();
    }

    // Clean up markdown formatting for plain text
    content = content
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/#{1,6}\s+/g, '') // Remove markdown headings
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
      .replace(/\n{3,}/g, '\n\n') // Normalize newlines
      .trim();

    if (content.length < 100) return null;

    return { content, title };
  } catch (error) {
    console.error("Jina reader fallback failed:", error);
    return null;
  }
}

function extractContent($: cheerio.CheerioAPI): string {
  // Remove script, style, nav, footer elements
  $("script, style, nav, header, footer, .sidebar, .navigation, .menu, .ad, .advertisement, noscript, [role='navigation'], [role='banner'], [role='contentinfo']").remove();

  // Try various selectors for main content
  const selectors = [
    "article",
    "main",
    ".article-content",
    ".content",
    "#content",
    ".post-content",
    ".entry-content",
    "[role='main']",
    ".blog-post",
    ".post",
  ];

  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const content = el.text().replace(/\s+/g, " ").trim();
      if (content.length > 100) return content;
    }
  }

  // Fallback to body, but this often includes nav junk
  return $("body").text().replace(/\s+/g, " ").trim();
}

// Detect if content is likely junk (nav spam, JS framework placeholder, etc.)
function isLikelyJunkContent(content: string, htmlLength: number): boolean {
  // If HTML is huge but extracted content is small relative to it, likely JS-rendered
  if (htmlLength > 100000 && content.length < htmlLength * 0.05) {
    return true;
  }

  // Check for repeated navigation patterns at start
  const first500 = content.slice(0, 500).toLowerCase();
  const navPatterns = ['sign in', 'sign up', 'login', 'menu', 'navigation', 'pricing', 'docs', 'blog'];
  let navHits = 0;
  for (const pattern of navPatterns) {
    if (first500.includes(pattern)) navHits++;
  }
  // If 4+ nav patterns in first 500 chars, likely junk
  if (navHits >= 4) {
    return true;
  }

  // Check for common JS framework placeholders
  if (content.includes('Loading...') && content.length < 500) {
    return true;
  }

  return false;
}

function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links: string[] = [];
  const base = new URL(baseUrl);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const url = new URL(href, baseUrl);
      // Only follow http/https links
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      // Remove hash
      url.hash = "";
      links.push(url.toString());
    } catch {
      // Invalid URL, skip
    }
  });

  return [...new Set(links)]; // Dedupe
}

export async function crawlUrl(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<CrawledPage[]> {
  const { maxPages = 20, sameDomain = true, onProgress } = options;

  const pages: CrawledPage[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startUrl];
  const startHost = new URL(startUrl).hostname;

  while (queue.length > 0 && pages.length < maxPages) {
    const url = queue.shift()!;

    // Normalize URL for deduplication
    const normalizedUrl = url.split("#")[0];
    if (visited.has(normalizedUrl)) continue;
    visited.add(normalizedUrl);

    onProgress?.({
      crawled: pages.length,
      total: maxPages,
      currentUrl: url,
    });

    const result = await fetchPage(url);
    if (!result) continue;

    const $ = cheerio.load(result.html);
    let title = $("title").text().trim();
    let content = extractContent($);

    // Use jina.ai fallback if content is minimal or looks like nav junk
    const shouldTryJina = content.length < 200 || isLikelyJunkContent(content, result.html.length);

    if (shouldTryJina) {
      try {
        const jinaResult = await fetchWithJinaReader(url);
        if (jinaResult && jinaResult.content.length > 100) {
          content = jinaResult.content;
          title = jinaResult.title || title;
        }
      } catch {
        // Jina fallback failed, continue with cheerio content
      }
    }

    if (content.length > 50) {
      pages.push({
        url: result.finalUrl,
        title: title || result.finalUrl,
        content,
      });
    }

    // Extract and queue links
    const links = extractLinks($, result.finalUrl);
    for (const link of links) {
      if (visited.has(link.split("#")[0])) continue;

      const linkHost = new URL(link).hostname;
      if (sameDomain && linkHost !== startHost) continue;

      queue.push(link);
    }
  }

  onProgress?.({
    crawled: pages.length,
    total: pages.length,
  });

  return pages;
}

// Prepare pages for indexing (with chunking)
export interface IndexableChunk {
  url: string;
  title: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;
}

export interface PrepareOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export function prepareForIndexing(pages: CrawledPage[], options?: PrepareOptions): IndexableChunk[] {
  const chunks: IndexableChunk[] = [];
  const chunkSize = options?.chunkSize || CHUNK_SIZE;
  const overlap = options?.chunkOverlap || CHUNK_OVERLAP;

  for (const page of pages) {
    const textChunks = chunkText(page.content, chunkSize, overlap);

    for (let i = 0; i < textChunks.length; i++) {
      chunks.push({
        url: page.url,
        title: page.title,
        content: textChunks[i],
        chunkIndex: i,
        totalChunks: textChunks.length,
      });
    }
  }

  return chunks;
}
