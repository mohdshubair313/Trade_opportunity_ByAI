import { NextResponse } from "next/server";

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/**
 * Converts a JSON object to clean YAML string.
 */
function jsonToYaml(obj: any, indent = 0): string {
  const spaces = " ".repeat(indent);
  if (obj === null || obj === undefined) return "null\n";
  if (typeof obj === "boolean" || typeof obj === "number") return `${obj}\n`;
  if (typeof obj === "string") {
    if (obj.includes("\n") || obj.includes(":") || obj.includes("#") || obj.startsWith("@")) {
      return `"${obj.replace(/"/g, '\\"')}"\n`;
    }
    return `${obj}\n`;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]\n";
    let yaml = "\n";
    for (const item of obj) {
      yaml += `${spaces}- ${jsonToYaml(item, indent + 2).trimStart()}`;
    }
    return yaml;
  }
  if (typeof obj === "object") {
    let yaml = "\n";
    for (const [key, value] of Object.entries(obj)) {
      yaml += `${spaces}${key}: ${jsonToYaml(value, indent + 2).trimStart()}`;
    }
    return yaml;
  }
  return String(obj) + "\n";
}

export async function GET() {
  try {
    const resp = await fetch(`${BACKEND_URL}/openapi.json`, {
      next: { revalidate: 3600 },
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
    const yamlString = jsonToYaml(spec).trim();

    return new NextResponse(yamlString, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Content-Type": "application/yaml; charset=utf-8",
        "RateLimit-Limit": "100",
        "RateLimit-Remaining": "99",
        "RateLimit-Reset": "60",
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
