import { anthropic } from "@/lib/claude";
import { rateLimit, getIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!rateLimit(getIp(req), 30, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { content } = await req.json();
  if (!content || typeof content !== "string") {
    return Response.json({ titles: [] });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: `Based on these song lyrics, suggest exactly 3 short, creative, evocative song titles. Return ONLY a valid JSON array of 3 strings — no explanation, no markdown, no extra text. Example format: ["Title One", "Title Two", "Title Three"]\n\n${content.slice(0, 2000)}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
    const match = text.match(/\[[\s\S]*\]/);
    const titles: unknown[] = match ? JSON.parse(match[0]) : [];
    return Response.json({
      titles: titles.filter((t): t is string => typeof t === "string").slice(0, 3),
    });
  } catch {
    return Response.json({ titles: [] });
  }
}
