import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// Helper to check if input is a URL
function cleanUrl(input: string): string {
  let cleaned = input.trim();
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(cleaned)) {
    return `https://${cleaned}`;
  }
  if (!/^https?:\/\//i.test(cleaned)) {
    return "";
  }
  try {
    const url = new URL(cleaned);
    return url.toString();
  } catch (_) {
    return "";
  }
}

// Simple crawler function
async function crawlPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      },
      next: { revalidate: 60 } // cache for 1 minute
    });
    if (!res.ok) return "";
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Remove boilerplate elements
    $("script, style, nav, footer, iframe, noscript, header, svg").remove();
    
    // Extract textual content
    const text = $("body").text()
      .replace(/\s+/g, " ")
      .trim();
      
    return text.substring(0, 3000); // Truncate to avoid context limit
  } catch (err) {
    console.error(`Error crawling page: ${url}`, err);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query, openrouterKey, serperKey, model } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!serperKey || !openrouterKey) {
      return NextResponse.json({ error: "API Keys are required. Please set them in the sidebar." }, { status: 400 });
    }

    let targetUrl = cleanUrl(query);
    let companyName = "";

    // 1. Serper.dev integration to find website or search details
    let serperInfo = "";
    let competitorsInfo = "";

    if (!targetUrl) {
      // It's a company name, let's search it on Serper
      companyName = query;
      try {
        const serperRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ q: companyName })
        });
        
        if (serperRes.ok) {
          const data = await serperRes.json();
          // Extract official site from first organic link
          if (data.organic && data.organic.length > 0) {
            targetUrl = cleanUrl(data.organic[0].link);
          }
          // Capture knowledge graph or snippets
          serperInfo = JSON.stringify(data.organic?.slice(0, 4) || []);
        }
      } catch (err) {
        console.error("Serper search failed:", err);
      }
    }

    if (!targetUrl) {
      return NextResponse.json({ error: `Could not find an official website for "${query}". Try providing a direct URL.` }, { status: 400 });
    }

    // Determine domain for link filtering (normalize by stripping www.)
    let domain = "";
    try {
      domain = new URL(targetUrl).hostname.replace(/^www\./i, "");
    } catch (_) {}

    // 2. Crawl the main site and secondary pages
    let crawlData = "";
    try {
      const homeRes = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });
      
      if (homeRes.ok) {
        const homeHtml = await homeRes.text();
        const $ = cheerio.load(homeHtml);
        
        // Remove scripts/styles for clean text extraction
        const clean$ = cheerio.load(homeHtml);
        clean$("script, style, nav, footer, iframe, noscript, header, svg").remove();
        crawlData += `Home Page Content:\n${clean$("body").text().replace(/\s+/g, " ").trim().substring(0, 3000)}\n\n`;

        // Intelligent Page Discovery: Look for important paths
        const linksToCrawl: string[] = [];
        $("a").each((_, element) => {
          const href = $(element).attr("href");
          if (!href) return;
          
          try {
            const absoluteUrl = new URL(href, targetUrl);
            const linkDomain = absoluteUrl.hostname.replace(/^www\./i, "");
            // Must be the same domain and not main page
            if (linkDomain === domain && absoluteUrl.pathname !== "/") {
              const path = absoluteUrl.pathname.toLowerCase();
              if (
                path.includes("about") || 
                path.includes("contact") || 
                path.includes("product") || 
                path.includes("service") || 
                path.includes("solution") || 
                path.includes("pricing")
              ) {
                if (!linksToCrawl.includes(absoluteUrl.toString())) {
                  linksToCrawl.push(absoluteUrl.toString());
                }
              }
            }
          } catch (_) {}
        });

        // Limit to top 3 discovered secondary pages to be efficient
        const pagesToCrawl = linksToCrawl.slice(0, 3);
        for (const pageUrl of pagesToCrawl) {
          const pageContent = await crawlPage(pageUrl);
          if (pageContent) {
            crawlData += `Page (${pageUrl}):\n${pageContent}\n\n`;
          }
        }
      }
    } catch (err) {
      console.error("Crawling target site failed:", err);
    }

    // 3. Search Serper for contact info and competitors
    try {
      const searchTarget = domain || companyName;
      const contactRes = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ q: `${searchTarget} headquarters address phone number email` })
      });
      if (contactRes.ok) {
        const data = await contactRes.json();
        serperInfo += `\nContact search:\n${JSON.stringify(data.organic?.slice(0, 3) || [])}`;
      }

      const compRes = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ q: `${searchTarget} competitors alternative tools` })
      });
      if (compRes.ok) {
        const data = await compRes.json();
        competitorsInfo = JSON.stringify(data.organic?.slice(0, 4) || []);
      }
    } catch (err) {
      console.error("Enrichment search failed:", err);
    }

    // 4. OpenRouter AI reasoning to build the report
    const systemPrompt = `You are an expert AI Research Assistant. Your task is to analyze the crawled webpage content and online search data for a company, and return a comprehensive, highly accurate JSON object representing the company intelligence report.

Return ONLY a valid JSON object matching the schema below. Do not wrap it in markdown code blocks or add any conversational text.

JSON Schema:
{
  "companyName": "Name of the company",
  "website": "Official URL",
  "phone": "Phone number or 'Not publicly listed'",
  "address": "Headquarters Address or 'Not publicly listed'",
  "productsServices": ["Product 1", "Product 2", "Product 3", ...],
  "painPoints": [
    "Clear, highly descriptive pain point with professional analysis",
    "Describe what the company or its clients struggles with",
    ...
  ],
  "competitors": [
    {
      "name": "Competitor Name",
      "website": "Competitor Official URL"
    },
    ...
  ]
}`;

    const userPrompt = `Target Company URL: ${targetUrl}
Assumed Name: ${companyName || domain}

Crawl Data:
${crawlData || "No crawled web content available."}

Search Data / Contact Info:
${serperInfo || "No search content available."}

Competitor Search Data:
${competitorsInfo || "No competitor search content available."}

Based on the data above, generate a professional, accurate report for this company. Return the response in the specified JSON format.`;

    let selectedModel = model || "google/gemini-2.5-flash";
    let apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
    let apiKey = openrouterKey;

    if (!apiKey && process.env.GROQ_API_KEY) {
      apiKey = process.env.GROQ_API_KEY;
      apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";
      selectedModel = "llama3-70b-8192";
    } else if (apiKey && apiKey.startsWith("gsk_")) {
      apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";
      selectedModel = "llama3-70b-8192";
    }

    const authHeader = `Bearer ${apiKey}`;

    let openRouterRes = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        ...(apiEndpoint.includes("openrouter.ai") ? {
          "HTTP-Referer": "https://relu-ai-dev-hiring.vercel.app/",
          "X-Title": "Relu Company Intelligence Assistant"
        } : {})
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000
      })
    });

    let errorText = "";
    if (!openRouterRes.ok) {
      errorText = await openRouterRes.text();
      console.warn("Primary API failed. Checking for Groq fallback...", errorText);
      
      const fallbackKey = process.env.GROQ_API_KEY;
      if (fallbackKey && apiKey !== fallbackKey) {
        console.log("Retrying request using Groq fallback...");
        apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";
        selectedModel = "llama3-70b-8192";
        
        openRouterRes = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${fallbackKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            max_tokens: 2000
          })
        });
      }
    }

    if (!openRouterRes.ok) {
      const finalError = errorText || await openRouterRes.text();
      return NextResponse.json({ error: `API failed: ${finalError}` }, { status: openRouterRes.status });
    }

    const aiData = await openRouterRes.json();
    const contentText = aiData.choices?.[0]?.message?.content;
    if (!contentText) {
      return NextResponse.json({ error: "OpenRouter returned an empty response" }, { status: 500 });
    }

    try {
      let cleanedText = contentText.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```json?/i, "").replace(/```$/, "").trim();
      }
      const parsedReport = JSON.parse(cleanedText);
      // Fill in fallback website if missing
      if (!parsedReport.website) parsedReport.website = targetUrl;
      return NextResponse.json(parsedReport);
    } catch (parseError) {
      console.error("Failed to parse OpenRouter JSON:", contentText);
      return NextResponse.json({ error: "Failed to parse AI response. Retrying with cleaner settings might help.", raw: contentText }, { status: 500 });
    }
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 });
  }
}
