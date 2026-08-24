import { NextResponse } from "next/server";

/**
 * Frontend health endpoint — returns JSON so agents can verify the
 * frontend is up and discover the backend API URL.
 *
 * Audit items 4 (JSON error responses) + 7 (public API surface).
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "tradeinsight-frontend",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      links: {
        homepage: "https://tradeinsight.shubair.in",
        api_docs: "https://tradeinsight.shubair.in/docs/api",
        openapi_spec: "https://tradeinsight.shubair.in/openapi.json",
        llms_txt: "https://tradeinsight.shubair.in/llms.txt",
        sitemap: "https://tradeinsight.shubair.in/sitemap.xml",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
        Vary: "Accept, Accept-Encoding",
      },
    }
  );
}
