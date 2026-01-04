// Main entry point for Supabase Edge Functions
// This file is required by edge-runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req: Request) => {
  const url = new URL(req.url)
  const { pathname } = url

  // Health check endpoint
  if (pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  // Default response for root
  return new Response(
    JSON.stringify({ message: "Edge Functions ready" }),
    { headers: { "Content-Type": "application/json" } }
  )
})
