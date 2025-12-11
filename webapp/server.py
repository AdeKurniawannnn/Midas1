#!/usr/bin/env python3
"""
Simple HTTP Server for SERP Aggregator Web UI
Serves static files and provides API endpoint
"""

import asyncio
import json
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import socketserver

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from aiohttp import ClientSession
from bright_data_client import fetch_all_pages
from config import DEFAULT_CONCURRENCY

class CORSRequestHandler(SimpleHTTPRequestHandler):
    """HTTP handler with CORS support and API endpoint"""

    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        """Handle preflight requests"""
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        """Handle POST requests for API"""
        if self.path == '/api/search':
            self.handle_search_api()
        else:
            self.send_error(404, 'Not Found')

    def handle_search_api(self):
        """Handle search API request"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            # Extract parameters
            query = data.get('query', '')
            max_pages = data.get('max_pages', 5)
            concurrency = data.get('concurrency', DEFAULT_CONCURRENCY)

            if not query:
                self.send_json_error(400, 'Query is required')
                return

            # Run async search
            result = asyncio.run(self.perform_search(query, max_pages, concurrency))

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))

        except json.JSONDecodeError:
            self.send_json_error(400, 'Invalid JSON')
        except Exception as e:
            self.send_json_error(500, str(e))

    async def perform_search(self, query: str, max_pages: int, concurrency: int) -> dict:
        """Perform SERP search"""
        async with ClientSession() as session:
            result = await fetch_all_pages(
                session=session,
                query=query,
                max_pages=max_pages,
                concurrency=concurrency
            )
            return result

    def send_json_error(self, code: int, message: str):
        """Send JSON error response"""
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode('utf-8'))

    def log_message(self, format, *args):
        """Custom log format"""
        print(f"[{self.log_date_time_string()}] {args[0]}")


def run_server(port=8000):
    """Run the HTTP server"""
    # Change to webapp directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    with socketserver.TCPServer(("", port), CORSRequestHandler) as httpd:
        print(f"""
╔═══════════════════════════════════════════════════════════╗
║           🔍 SERP Aggregator Web Server                   ║
╠═══════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:{port}                 ║
║  API endpoint:      http://localhost:{port}/api/search      ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝
""")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='SERP Aggregator Web Server')
    parser.add_argument('--port', '-p', type=int, default=8000, help='Port number (default: 8000)')
    args = parser.parse_args()

    run_server(args.port)
