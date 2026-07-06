#!/usr/bin/env python3
"""Serve Wordle Paint with NYT auto-fetch enabled.

The NYT daily-word endpoint (nytimes.com/svc/wordle/v2/<date>.json) sends no
CORS headers, so the browser can't fetch it cross-origin. This server serves
the static app and proxies that endpoint same-origin at /api/today, where CORS
doesn't apply.

Usage: python3 serve.py [port]   (default 8000)
"""
import json
import re
import sys
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urlparse(self.path)
        if url.path != "/api/today":
            return super().do_GET()

        date = parse_qs(url.query).get("date", [""])[0]
        if not DATE_RE.fullmatch(date):
            return self.send_error(400, "date must be YYYY-MM-DD")
        try:
            req = urllib.request.Request(
                f"https://www.nytimes.com/svc/wordle/v2/{date}.json",
                headers={"User-Agent": "wordle-paint (local tool)"},
            )
            with urllib.request.urlopen(req, timeout=10) as res:
                body = res.read()
            json.loads(body)  # only relay what parses as JSON
        except Exception as err:
            return self.send_error(502, f"NYT fetch failed: {err}")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Wordle Paint: http://localhost:{port} (NYT auto-fetch enabled)")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
