import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("send-invoice-email: rejects unauthenticated requests", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-invoice-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to_email: "test@test.com",
      guest_name: "Test Guest",
      invoice_number: "INV-test123",
      amount: 100,
      currency: "USD",
      hotel_name: "Test Hotel",
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertExists(body.error);
});

Deno.test("send-checkout-email: rejects unauthenticated requests", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-checkout-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to_email: "test@test.com",
      guest_name: "Test Guest",
      reservation_code: "RES-test123",
      check_in: "2026-04-01",
      check_out: "2026-04-03",
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 401);
  assertExists(body.error);
});

Deno.test("send-invoice-email: CORS preflight returns 200", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-invoice-email`, {
    method: "OPTIONS",
  });
  await res.text();
  assertEquals(res.status, 200);
});

Deno.test("send-checkout-email: CORS preflight returns 200", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-checkout-email`, {
    method: "OPTIONS",
  });
  await res.text();
  assertEquals(res.status, 200);
});
