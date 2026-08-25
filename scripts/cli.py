#!/usr/bin/env python3
"""
TradeInsight AI — Official CLI Tool
Author: Mohd Shubair
License: MIT

Command-line interface for interacting with TradeInsight AI's agentic market
intelligence platform for 20+ NSE Indian equity sectors.
"""
import sys
import os
import json
import argparse
import urllib.request
import urllib.error

DEFAULT_API_URL = os.environ.get("TRADEINSIGHT_API_URL", "https://tradeinsight.shubair.in")


def _get(url: str, token: str = None) -> dict:
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "TradeInsight-CLI/1.0")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return {"error": e.code, "detail": json.loads(body)}
        except Exception:
            return {"error": e.code, "detail": body}
    except Exception as e:
        return {"error": 500, "detail": str(e)}


def cmd_health(args):
    """Check API health."""
    url = f"{args.url}/api/health"
    data = _get(url)
    print(json.dumps(data, indent=2))


def cmd_sectors(args):
    """List available sectors."""
    url = f"{args.url}/api/v1/sectors"
    data = _get(url)
    if "sectors" in data:
        print(f"Supported NSE Sectors ({len(data['sectors'])} available):")
        for s in data["sectors"]:
            icon = s.get("icon", "•")
            name = s.get("name", "")
            desc = s.get("description", "")
            print(f"  {icon} {name:<22} {desc}")
    else:
        print(json.dumps(data, indent=2))


def cmd_analyze(args):
    """Analyze a sector."""
    sector = args.sector.strip().lower()
    url = f"{args.url}/api/v1/analyze/{sector}?use_cache=true"
    token = args.token or os.environ.get("TRADEINSIGHT_TOKEN")
    print(f"Analyzing {sector.title()} via TradeInsight AI...")
    data = _get(url, token=token)
    if args.format == "json":
        print(json.dumps(data, indent=2))
    else:
        if "analysis" in data:
            print("\n" + "=" * 60)
            print(data["analysis"])
            print("=" * 60)
        else:
            print(json.dumps(data, indent=2))


def main():
    parser = argparse.ArgumentParser(
        prog="tradeinsight",
        description="TradeInsight AI CLI — Agentic Market Intelligence by Mohd Shubair",
    )
    parser.add_argument(
        "--url",
        default=DEFAULT_API_URL,
        help="Base URL of TradeInsight API (default: https://tradeinsight.shubair.in)",
    )
    parser.add_argument(
        "--token",
        help="JWT bearer token (or set TRADEINSIGHT_TOKEN env var)",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # health
    subparsers.add_parser("health", help="Check system health")

    # sectors
    subparsers.add_parser("sectors", help="List all supported NSE sectors")

    # analyze
    analyze_parser = subparsers.add_parser("analyze", help="Analyze an Indian equity sector")
    analyze_parser.add_argument("sector", help="Sector name (e.g. pharmaceuticals, technology, fintech)")
    analyze_parser.add_argument("--format", choices=["text", "json"], default="text", help="Output format")

    args = parser.parse_args()

    if args.command == "health":
        cmd_health(args)
    elif args.command == "sectors":
        cmd_sectors(args)
    elif args.command == "analyze":
        cmd_analyze(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
