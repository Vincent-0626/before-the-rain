"""Serve a private copy of the demo next to its Ollama instance."""

import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


DIST = Path(__file__).resolve().parent / "dist"
PORT = int(os.environ.get("RAIN_APP_PORT", "18787"))
OLLAMA_PORT = int(os.environ.get("RAIN_OLLAMA_PORT", "11443"))
MODEL = "qwen3:8b"
HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
CLIENT = urllib.request.build_opener(urllib.request.ProxyHandler({}))
ASSETS = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/lore.js": ("lore.js", "text/javascript; charset=utf-8"),
    "/story.js": ("story.js", "text/javascript; charset=utf-8"),
    "/model.js": ("model.js", "text/javascript; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/rain-window.jpg": ("rain-window.jpg", "image/jpeg"),
}


def call_ollama(path, payload=None, timeout=40):
    data = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None
    request = urllib.request.Request(
        f"http://127.0.0.1:{OLLAMA_PORT}{path}", data=data,
        headers={"Content-Type": "application/json"},
    )
    with CLIENT.open(request, timeout=timeout) as response:
        return json.load(response)


def chat_messages(data):
    messages = data.get("messages") if isinstance(data, dict) else None
    if not isinstance(messages, list) or not 2 <= len(messages) <= 20:
        return None
    for item in messages:
        if not isinstance(item, dict) or item.get("role") not in {"system", "user", "assistant"}:
            return None
        if not isinstance(item.get("content"), str) or not 0 < len(item["content"]) <= 12000:
            return None
    if messages[0]["role"] != "system" or messages[-1]["role"] != "user":
        return None
    return [{"role": item["role"], "content": item["content"]} for item in messages]


def model_ready():
    try:
        models = call_ollama("/api/tags", timeout=3).get("models", [])
        return any(item["name"] == MODEL for item in models)
    except (OSError, ValueError, KeyError):
        return False


class RainHandler(BaseHTTPRequestHandler):
    def reply(self, status, content, mime):
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        try:
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def json_reply(self, status, value):
        self.reply(status, json.dumps(value, ensure_ascii=False).encode(), "application/json; charset=utf-8")

    def allowed(self):
        host = self.headers.get("Host")
        origin = self.headers.get("Origin")
        return host in HOSTS and (origin is None or origin == f"http://{host}")

    def do_GET(self):
        if not self.allowed():
            self.json_reply(403, {"error": "Open this app through its private SSH tunnel."})
            return
        path = urlsplit(self.path).path
        if path == "/api/model":
            self.json_reply(200, {"provider": "rented-ollama", "ready": model_ready(), "model": MODEL})
            return
        if path not in ASSETS:
            self.json_reply(404, {"error": "Not found"})
            return
        filename, mime = ASSETS[path]
        content = (DIST / filename).read_bytes()
        if filename == "index.html":
            state = b"ready" if model_ready() else b"waiting"
            content = content.replace(b"<body>", b'<body data-rain-model="' + state + b'">', 1)
        self.reply(200, content, mime)

    def do_POST(self):
        if not self.allowed():
            self.json_reply(403, {"error": "Invalid request origin."})
            return
        if urlsplit(self.path).path != "/api/chat":
            self.json_reply(404, {"error": "Not found"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 65536:
                raise ValueError()
            messages = chat_messages(json.loads(self.rfile.read(size)))
            if messages is None:
                raise ValueError()
        except (ValueError, UnicodeError):
            self.json_reply(400, {"error": "Invalid dialogue payload."})
            return
        try:
            result = call_ollama("/api/chat", {
                "model": MODEL, "messages": messages, "think": False, "stream": False,
                "format": "json", "keep_alive": "5m",
                "options": {"num_ctx": 8192, "num_predict": 640, "temperature": 0.75},
            })
            content = result["message"]["content"]
            if not isinstance(content, str) or not content.strip():
                raise ValueError("Empty model reply")
        except (OSError, KeyError, ValueError, TypeError):
            self.json_reply(503, {"error": "The model did not return a reply."})
            return
        self.json_reply(200, {"message": {"role": "assistant", "content": content}, "model": MODEL})


if __name__ == "__main__":
    with ThreadingHTTPServer(("127.0.0.1", PORT), RainHandler) as server:
        print(f"Rain story listening on 127.0.0.1:{PORT}", flush=True)
        server.serve_forever()
