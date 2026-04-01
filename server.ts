import express from "express";
import { createServer as createViteServer } from "vite";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Notion client
const NOTION_KEY = process.env.NOTION_API_KEY || "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";
console.log("Initializing Notion client with key starting with:", NOTION_KEY.substring(0, 7));
const notion = new Client({ auth: NOTION_KEY });

// Cache songs to avoid hitting Notion API too much
let cachedSongs: any[] = [];
let lastFetchTime = 0;

async function fetchNotionSongs() {
  console.log("fetchNotionSongs called. Cache age:", Date.now() - lastFetchTime);
  if (Date.now() - lastFetchTime < 60000 && cachedSongs.length > 0) {
    console.log("Returning cached songs:", cachedSongs.length);
    return cachedSongs;
  }

  try {
    console.log("Searching for 'Canciones' page...");
    // 1. Find the page
    let pagesResponse = await notion.search({
      query: "Canciones",
      filter: { value: "page", property: "object" }
    });

    if (pagesResponse.results.length === 0) {
      console.log("No pages found with query 'Canciones'. Trying 'Canciones ✡️'...");
      pagesResponse = await notion.search({
        query: "Canciones ✡️",
        filter: { value: "page", property: "object" }
      });
    }

    let pageId = "";
    if (pagesResponse.results.length > 0) {
      pageId = pagesResponse.results[0].id;
      console.log("Found page via search:", pageId);
    } else {
      console.log("No pages found via search. Using hardcoded fallback ID...");
      pageId = "318ae493-78ac-802c-9622-ea219b46ec1a";
    }

    console.log("Using page ID:", pageId);

    // 2. Get blocks of the page
    const blocksResponse = await notion.blocks.children.list({ block_id: pageId });
    const toggles = blocksResponse.results.filter((b: any) => b.type === "toggle");
    console.log("Toggles found:", toggles.length);

    if (toggles.length === 0) {
      console.log("No toggles found. Listing all blocks for debug:");
      blocksResponse.results.forEach((b: any) => console.log("- Block type:", b.type));
    }

    const songs = [];
    let idCounter = 1;

    // 3. For each toggle, get its children (files)
    for (const toggle of toggles as any[]) {
      const mood = toggle.toggle.rich_text[0]?.plain_text || "Unknown";
      console.log("Fetching children for toggle:", mood);
      
      const childrenResponse = await notion.blocks.children.list({ block_id: toggle.id });
      const files = childrenResponse.results.filter((b: any) => b.type === "file");
      console.log("Files found in toggle:", files.length);

      for (const fileBlock of files as any[]) {
        const fileObj = fileBlock.file;
        let url = "";
        let name = "Unknown Song";

        if (fileObj.type === "file") {
          url = fileObj.file.url;
          name = fileObj.name || "Unknown Song";
        } else if (fileObj.type === "external") {
          url = fileObj.external.url;
          name = fileObj.name || "Unknown Song";
        }

        // Clean up name (remove .mp or .mp3)
        const title = name.replace(/\.mp3?$/i, "").replace(/_/g, " ");

        songs.push({
          id: String(idCounter++),
          title: title,
          artist: "Notion Audio",
          genre: "Various",
          currentMood: "Any",
          targetMood: mood,
          energy: 50, // Default energy
          audioUrl: `/api/stream?url=${encodeURIComponent(url)}`,
          cover: `https://picsum.photos/seed/${encodeURIComponent(title)}/400/400`,
          duration: "3:00"
        });
      }
    }

    cachedSongs = songs;
    lastFetchTime = Date.now();
    return songs;
  } catch (error) {
    console.error("Error fetching from Notion:", error);
    throw error;
  }
}

app.get("/api/test-notion", async (req, res) => {
  try {
    const songs = await fetchNotionSongs();
    res.json({ count: songs.length, songs });
  } catch (e: any) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

function normalize(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

app.get("/api/recommendations", async (req, res) => {
  const { current, desired } = req.query;

  if (!current || !desired) {
    return res.status(400).json({ error: "Missing current or desired state" });
  }

  const allSongs = await fetchNotionSongs();
  console.log("All songs fetched:", allSongs.length);

  const normalizedDesired = normalize(desired as string);

  // Filter songs by desired mood (targetMood)
  let filtered = allSongs.filter(song => {
    const normalizedTarget = normalize(song.targetMood);
    return normalizedTarget.includes(normalizedDesired) || normalizedDesired.includes(normalizedTarget);
  });

  // If no match, try some mapping
  if (filtered.length === 0) {
    if (normalizedDesired.includes("paz")) {
      filtered = allSongs.filter(s => normalize(s.targetMood).includes("relajado"));
    } else if (normalizedDesired.includes("energia") || normalizedDesired.includes("motivado")) {
      filtered = allSongs.filter(s => normalize(s.targetMood).includes("energetico"));
    }
  }

  // If still no match, just return some random songs
  if (filtered.length === 0) {
    filtered = allSongs.slice(0, 5);
  }

  res.json({ songs: filtered });
});

app.get("/api/stream", async (req, res) => {
  const fileUrl = req.query.url as string;
  if (!fileUrl) {
    return res.status(400).send("Missing url");
  }

  try {
    const headers: Record<string, string> = {};
    if (req.headers.range) {
      headers.range = req.headers.range;
    }

    const response = await fetch(fileUrl, { headers });
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(500).send("No body in response");
    }
  } catch (error) {
    console.error("Stream error:", error);
    res.status(500).send("Error streaming file");
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
