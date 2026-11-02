import { tool } from "ai";
import { z } from "zod";

import type { ToolExecutionRecord } from "@/core/types/app-state";
import { createRecord } from "@/modules/tools/built-in/shared";

/**
 * Web search via DuckDuckGo HTML endpoint. No API key required.
 * Uses DuckDuckGo's public HTML search and parses results client-side.
 */
export function createDuckDuckGoTools(input: {
  onRecord?: (record: ToolExecutionRecord) => void;
}) {
  const { onRecord } = input;

  const handleRecord = (record: ToolExecutionRecord) => {
    onRecord?.(record);
  };

  return {
    tools: {
      web_search: tool({
        description:
          "Search the web using DuckDuckGo. Returns a list of results with titles, URLs, and content snippets. No API key required. Use this when you need current information or facts not in your training data.",
        inputSchema: z.object({
          query: z.string().min(1).describe("The search query."),
          maxResults: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .default(5)
            .describe("Maximum number of results to return (1-20)."),
        }),
        execute: async ({ query, maxResults }) => {
          try {
            const encodedQuery = encodeURIComponent(query);
            const response = await fetch(
              `https://html.duckduckgo.com/html/?q=${encodedQuery}`,
              {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  Accept: "text/html,application/xhtml+xml",
                },
              },
            );

            if (!response.ok) {
              return {
                ok: false,
                error: `DuckDuckGo error (${response.status})`,
              };
            }

            const html = await response.text();
            const results = parseDuckDuckGoResults(html, maxResults);

            handleRecord(
              createRecord({
                toolName: "web_search",
                status: "completed",
                inputSummary: `Search: ${query}`,
              }),
            );

            return {
              ok: true,
              query,
              results,
              count: results.length,
            };
          } catch (error) {
            handleRecord(
              createRecord({
                toolName: "web_search",
                status: "failed",
                inputSummary: `Search: ${query}`,
                error: error instanceof Error ? error.message : String(error),
              }),
            );
            return {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      }),
    },
  };
}

/**
 * Parse DuckDuckGo HTML search results client-side.
 * Extracts title, URL, and snippet from result blocks.
 */
function parseDuckDuckGoResults(html: string, maxResults: number) {
  const results: {
    title: string;
    url: string;
    content: string;
  }[] = [];

  // Match result links: <a rel="nofollow" class="result__a" href="...">Title</a>
  const linkRegex =
    /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>/g;
  // Match snippets: <a class="result__snippet" ...>...</a> or <div class="result__snippet">...</div>
  const snippetRegex =
    /class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/g;

  const links: { url: string; title: string }[] = [];
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    links.push({
      url: decodeURIComponent(linkMatch[1]),
      title: linkMatch[2].trim(),
    });
  }

  const snippets: string[] = [];
  let snippetMatch;
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    const snippet = (snippetMatch[1] || snippetMatch[2] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (snippet) snippets.push(snippet);
  }

  for (let i = 0; i < Math.min(links.length, maxResults); i++) {
    results.push({
      title: links[i]?.title || "",
      url: links[i]?.url || "",
      content: snippets[i] || "",
    });
  }

  return results;
}
