import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { songId } = await req.json();
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // Generate a short unique share ID
  const shareId = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 9);

  const { error } = await supabase
    .from("songs")
    .update({ share_id: shareId })
    .eq("id", songId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ shareId });
}
