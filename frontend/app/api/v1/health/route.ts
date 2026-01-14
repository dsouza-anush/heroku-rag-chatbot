import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { HealthResponse } from "@/types/api";

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const services = {
    database: "down" as "up" | "down",
    embedding: "up" as "up" | "down",
    chat: "up" as "up" | "down",
  };

  // Check database connection
  try {
    await sql`SELECT 1`;
    services.database = "up";
  } catch {
    services.database = "down";
  }

  const allUp = Object.values(services).every((s) => s === "up");
  const allDown = Object.values(services).every((s) => s === "down");

  const status = allUp ? "healthy" : allDown ? "unhealthy" : "degraded";

  return NextResponse.json({
    status,
    version: "1.0.0",
    services,
  });
}
