import { NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/**
 * Proxy the FastAPI OpenAPI spec to the frontend domain so agents
 * hitting tradeinsight.shubair.in/openapi.json get the spec directly.
 *
 * Audit items 3 (OpenAPI spec published) + 6 (developer resource discoverability).
 */
export async function GET() {
  try {
    const resp = await fetch(`${BACKEND_URL}/openapi.json`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!resp.ok) {
      return NextResponse.json(
        {
          error: "OpenAPI spec unavailable",
          message: `Backend returned ${resp.status}`,
          code: "OPENAPI_UNAVAILABLE",
          hint: "The backend API may be starting up. Try again in a moment.",
        },
        { status: 502 }
      );
    }

    const spec = await resp.json();
    return NextResponse.json(spec, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Content-Type": "application/json",
        Vary: "Accept, Accept-Encoding",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Backend unreachable",
        message: "Could not connect to the API backend to fetch the OpenAPI spec.",
        code: "BACKEND_UNREACHABLE",
        hint: "Check that NEXT_PUBLIC_API_URL is set correctly and the backend is running.",
      },
      { status: 502 }
    );
  }
}
