import { anthropic, SYSTEM_PROMPT } from "@/lib/claude";
import { buildUserPrompt, buildRefinementPrompt, buildPolishPrompt, buildMelodyPrompt, buildExpandPrompt, buildLyricsToBeatPrompt } from "@/lib/prompts";
import { FREE_LIMIT } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type { GenerationRequest } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  // Free tier enforcement (skipped if service role key not configured)
  const authHeader = req.headers.get("Authorization");
  if (authHeader && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: sub } = await supabase.from("subscriptions").select("status").eq("user_id", user.id).single();
      if (!sub || sub.status !== "pro") {
        const { count } = await supabase.from("songs").select("*", { count: "exact", head: true }).eq("user_id", user.id);
        if ((count ?? 0) >= FREE_LIMIT) {
          return Response.json({ error: `Free limit of ${FREE_LIMIT} songs reached. Upgrade to Pro for unlimited.` }, { status: 402 });
        }
      }
    }
  }

  const body: GenerationRequest & { refinement?: string } = await req.json();

  const { conversationHistory = [], refinement, temperature = 0.7, voiceMode } = body;

  let userMessage: string;
  if (refinement) {
    userMessage = buildRefinementPrompt(refinement);
  } else if (voiceMode === "polish") {
    userMessage = buildPolishPrompt(body.input, body);
  } else if (voiceMode === "melody") {
    userMessage = buildMelodyPrompt(body.input, body);
  } else if (body.mode === "expand-lyrics") {
    userMessage = buildExpandPrompt(body);
  } else if (body.mode === "lyrics-to-beat") {
    userMessage = buildLyricsToBeatPrompt(body);
  } else {
    userMessage = buildUserPrompt(body);
  }

  const messages = [
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
