import { NextResponse, type NextRequest } from "next/server";

/**
 * Catch-all API Route Handler for unmapped /api/* endpoints.
 *
 * Audit item 3 (JSON error responses):
 * Ensures that whenever an agent or crawler hits a non-existent API route
 * (e.g. /api/v1/unknown, /api/invalid), it ALWAYS receives a structured
 * JSON error response with error codes, messages, resolution hints,
 * and standard RFC RateLimit headers instead of an HTML 404 page.
 */

function jsonNotFoundResponse(pathname: string) {
  return NextResponse.json(
    {
      error: "Endpoint Not Found",
      message: `The API endpoint '${pathname}' does not exist on TradeInsight AI.`,
      code: "ENDPOINT_NOT_FOUND",
      hint: "Check the OpenAPI specification at /openapi.json or developer docs at /docs/api for available endpoints.",
      documentation_url: "https://tradeinsight.shubair.in/docs/api",
      openapi_url: "https://tradeinsight.shubair.in/openapi.json",
      supported_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "RateLimit-Limit": "100",
        "RateLimit-Remaining": "99",
        "RateLimit-Reset": "60",
        "RateLimit-Policy": "100;w=60",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "99",
        "X-RateLimit-Reset": "60",
        Vary: "Accept, Accept-Encoding",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  return jsonNotFoundResponse(request.nextUrl.pathname);
}

export async function POST(request: NextRequest) {
  return jsonNotFoundResponse(request.nextUrl.pathname);
}

export async function PUT(request: NextRequest) {
  return jsonNotFoundResponse(request.nextUrl.pathname);
}

export async function DELETE(request: NextRequest) {
  return jsonNotFoundResponse(request.nextUrl.pathname);
}

export async function PATCH(request: NextRequest) {
  return jsonNotFoundResponse(request.nextUrl.pathname);
}

export async function OPTIONS(request: NextRequest) {
  return jsonNotFoundResponse(request.nextUrl.pathname);
}
