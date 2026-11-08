"""Local OIDC provider for development verification of ArborCursus frontend.

Issues real RS256 access tokens that ArborCursus verifies through JWKS, so the
backend authorization paths (platform_admin claim, reviewer membership) run
unmodified. Development-only; never deploy.

    uv run --project ../ArborCursus python tests/fixtures/dev-idp.py
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlparse

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ISSUER = os.environ.get("IDP_ISSUER", "http://127.0.0.1:8099/realms/arborcursus")
AUDIENCE = "arborcursus-api"
KID = "dev-idp-1"
PORT = int(os.environ.get("IDP_PORT", "8099"))
CLIENT_ID = os.environ.get("IDP_CLIENT_ID", "arborcursus-web")
REDIRECT_URI = os.environ.get("IDP_REDIRECT_URI", "http://localhost:8081/callback")
TTL = int(os.environ.get("IDP_TOKEN_TTL", "900"))

_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_pem = _key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
).decode()
_jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(_key.public_key()))
_jwk.update({"kid": KID, "use": "sig", "alg": "RS256"})

# username -> (password, subject, display name, email, claims)
USERS = {
    "admin@local.dev": ("admin", "sub-platform-admin", "Platform Admin", "admin@local.dev", {"platform_admin": True}),
    "reviewer@local.dev": ("reviewer", "sub-reviewer", "Riley Reviewer", "reviewer@local.dev", {}),
    "student@local.dev": ("student", "sub-student", "Sam Student", "student@local.dev", {}),
    "student2@local.dev": ("student2", "sub-student-2", "Alex Student", "student2@local.dev", {}),
}
CODES: dict[str, dict] = {}
REFRESH: dict[str, str] = {}


def access_token(username: str, scopes: str = "openid profile email") -> str:
    password, subject, name, email, extra = USERS[username]
    now = int(time.time())
    claims = {
        "iss": ISSUER,
        "aud": AUDIENCE,
        "sub": subject,
        "exp": now + TTL,
        "iat": now,
        "azp": CLIENT_ID,
        "name": name,
        "email": email,
        "preferred_username": username,
        "scope": scopes,
        **extra,
    }
    return jwt.encode(claims, _pem, algorithm="RS256", headers={"kid": KID, "typ": "Bearer"})


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *_args):  # quiet
        pass

    def _json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.send_header("access-control-allow-origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _redirect(self, location: str) -> None:
        self.send_response(302)
        self.send_header("location", location)
        self.send_header("content-length", "0")
        self.send_header("access-control-allow-origin", "*")
        self.end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-headers", "*")
        self.send_header("access-control-allow-methods", "GET,POST,OPTIONS")
        self.send_header("content-length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/realms/arborcursus/.well-known/openid-configuration":
            self._json({
                "issuer": ISSUER,
                "authorization_endpoint": f"{ISSUER}/protocol/openid-connect/auth",
                "token_endpoint": f"{ISSUER}/protocol/openid-connect/token",
                "end_session_endpoint": f"{ISSUER}/protocol/openid-connect/logout",
                "jwks_uri": f"{ISSUER}/protocol/openid-connect/certs",
                "response_types_supported": ["code"],
                "grant_types_supported": ["authorization_code", "refresh_token", "password"],
                "code_challenge_methods_supported": ["S256"],
                "subject_types_supported": ["public"],
                "id_token_signing_alg_values_supported": ["RS256"],
            })
        elif path == "/realms/arborcursus/protocol/openid-connect/certs":
            self._json({"keys": [_jwk]})
        elif path == "/realms/arborcursus/protocol/openid-connect/auth":
            self._authorize(parse_qs(urlparse(self.path).query))
        else:
            self._json({"error": "not_found"}, 404)

    def _authorize(self, query: dict[str, list[str]]) -> None:
        # Dev login page: pick a user, preserves the PKCE exchange.
        users = "".join(
            f'<li><a href="?{urlencode({**{k: v[0] for k, v in query.items()}, "login_hint": name})}">'
            f"{USERS[name][2]} ({name})</a></li>"
            for name in USERS
        )
        body = f"<html><body><h1>Dev identity provider</h1><ul>{users}</ul></body></html>".encode()
        self.send_response(200)
        self.send_header("content-type", "text/html; charset=utf-8")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        hint = query.get("login_hint", [None])[0]
        if not hint or hint not in USERS:
            return
        code = secrets.token_urlsafe(24)
        CODES[code] = {k: v[0] for k, v in query.items()}
        redirect = query.get("redirect_uri", [REDIRECT_URI])[0]
        self._redirect(f"{redirect}?{urlencode({'code': code, 'state': query.get('state', [''])[0]})}")

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/realms/arborcursus/protocol/openid-connect/token":
            self._json({"error": "not_found"}, 404)
            return
        length = int(self.headers.get("content-length", "0"))
        form = {k: v[0] for k, v in parse_qs(self.rfile.read(length).decode()).items()}
        grant = form.get("grant_type", "")
        if grant == "password":
            username = form.get("username", "")
            entry = USERS.get(username)
            if entry is None or entry[0] != form.get("password"):
                self._json({"error": "invalid_grant", "error_description": "Invalid user credentials"}, 401)
                return
        elif grant == "refresh_token":
            username = REFRESH.get(form.get("refresh_token", ""))
            if username is None:
                self._json({"error": "invalid_grant", "error_description": "Refresh token is not valid"}, 401)
                return
        elif grant == "authorization_code":
            record = CODES.pop(form.get("code", ""), None)
            if record is None:
                self._json({"error": "invalid_grant", "error_description": "Code is not valid"}, 401)
                return
            challenge = record.get("code_challenge")
            verifier = form.get("code_verifier", "")
            digest = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
            if challenge and challenge != digest:
                self._json({"error": "invalid_grant", "error_description": "PKCE verification failed"}, 401)
                return
            username = record.get("login_hint", "student@local.dev")
        else:
            self._json({"error": "unsupported_grant_type"}, 400)
            return
        refresh = secrets.token_urlsafe(32)
        REFRESH[refresh] = username
        self._json({
            "access_token": access_token(username),
            "expires_in": TTL,
            "refresh_token": refresh,
            "token_type": "Bearer",
            "scope": "openid profile email",
        })


if __name__ == "__main__":
    print(f"dev IdP on http://127.0.0.1:{PORT} (issuer {ISSUER})", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
