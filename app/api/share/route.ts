import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { songId } = await req.json();
  if (!songId || typeof songId !== "string") {
    return Response.json({ error: "Invalid songId." }, { status: 400 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // Verify the caller is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Generate a short unique share ID
  const shareId = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 9);

  // Only update the song if it actually belongs to this user (prevents ID enumeration)
  const { error, data } = await supabase
    .from("songs")
    .update({ share_id: shareId })
    .eq("id", songId)
    .eq("user_id", user.id)
    .select("id");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return Response.json({ error: "Song not found." }, { status: 404 });

  return Response.json({ shareId });
}
