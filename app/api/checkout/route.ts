import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const { userId, userEmail } = await req.json();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${appUrl}/studio?upgraded=true`,
    cancel_url: `${appUrl}/studio`,
    client_reference_id: userId,
    customer_email: userEmail,
    metadata: { userId },
  });

  return Response.json({ url: session.url });
}
