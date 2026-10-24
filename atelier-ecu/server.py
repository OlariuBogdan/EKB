# -*- coding: utf-8 -*-
"""Fișe ECU: server local (doar biblioteca standard Python 3.8+, fără instalări suplimentare).

Pornire:  python server.py        (Windows: dublu-click pe start.bat)
Deschide: http://localhost:8080   sau adresa afișată în consolă, de pe iPhone (aceeași rețea Wi-Fi).
Datele se salvează în folderul `data` de lângă acest fișier (baza de date + pozele).
"""
import hashlib
import http.server
import io
import json
import mimetypes
import os
import re
import secrets
import socket
import socketserver
import sqlite3
import sys
import tempfile
import time
import urllib.parse
import zipfile
from datetime import datetime

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")
PHOTOS = os.path.join(DATA, "photos")
DB = os.path.join(DATA, "atelier.db")
STATIC = os.path.join(BASE, "static")
PORT = int(os.environ.get("PORT", "8080"))
MAX_PHOTO = 25 * 1024 * 1024

SESSIONS = set()
DEFAULT_SETTINGS = {
    "shop_name": "Atelier ECU",
    "shop_contact": "",
    "warranty_days": "30",
    "hourly_rate": "150",
    "currency": "lei",
    "terms": "Garanția acoperă defectul reparat și piesele înlocuite, în condiții normale de utilizare. "
             "Nu acoperă defecte provocate de apă, supratensiune, polaritate inversată sau intervenții ale terților după predare.",
    "pin_hash": "",
}


def db():
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    return con


def init():
    os.makedirs(PHOTOS, exist_ok=True)
    con = db()
    con.executescript("""
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS cases(
            id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT UNIQUE, created TEXT, updated TEXT, data TEXT);
        CREATE TABLE IF NOT EXISTS photos(
            id INTEGER PRIMARY KEY AUTOINCREMENT, case_id INTEGER, cat TEXT, caption TEXT, file TEXT,
            client INTEGER DEFAULT 1, created TEXT);
        CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
    """)
    for k, v in DEFAULT_SETTINGS.items():
        con.execute("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", (k, v))
    con.commit()
    con.close()


def get_settings(con):
    return {r["key"]: r["value"] for r in con.execute("SELECT key,value FROM settings")}


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def new_case_data(settings):
    return {
        "status": "Primit", "client_name": "", "client_phone": "", "vehicle": "", "plate": "", "vin": "",
        "ecu_model": "", "ecu_hw": "", "ecu_sw": "", "ecu_family": "", "symptom": "", "visual_state": "",
        "data_risk_ok": False,
        "rails": [{"name": n, "expected": "", "cold": "", "hot": ""} for n in
                  ["KL30 la conector", "După protecție", "Pre-regulator", "5 V logică", "5 V senzori", "3,3 V", "Nucleu (VCORE)", "Reset (stare)"]],
        "outputs": [], "components": [],
        "backup": {"done": False, "method": "", "hash": "", "note": ""},
        "entries": [], "diagnosis": "", "client_summary": "", "internal_notes": "",
        "price": "", "warranty_days": settings.get("warranty_days", "30"), "delivered_date": "", "signature": "",
        "module_type": "", "job_types": [], "job_other": "", "checklist": [],
        "compliance": {"docs_checked": False, "docs_note": "", "lawful_use": "", "lawful_note": "",
                       "declaration_signed": False, "safety_validated": False},
        "estimate": {"best_hours": "", "best_parts": "", "best_note": "", "worst_hours": "", "worst_parts": "",
                     "worst_note": "", "scope": "", "risks": "", "success": ""},
    }


def next_number(con):
    year = datetime.now().strftime("%Y")
    rows = con.execute("SELECT number FROM cases WHERE number LIKE ?", (year + "-%",)).fetchall()
    top = 0
    for r in rows:
        m = re.match(r"^\d{4}-(\d+)$", r["number"])
        if m:
            top = max(top, int(m.group(1)))
    return "%s-%03d" % (year, top + 1)


def case_row(con, cid):
    r = con.execute("SELECT * FROM cases WHERE id=?", (cid,)).fetchone()
    if not r:
        return None
    photos = [dict(p) for p in con.execute("SELECT * FROM photos WHERE case_id=? ORDER BY id", (cid,))]
    return {"id": r["id"], "number": r["number"], "created": r["created"], "updated": r["updated"],
            "data": json.loads(r["data"]), "photos": photos}


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


class H(http.server.BaseHTTPRequestHandler):
    server_version = "AtelierECU/1.0"

    def log_message(self, fmt, *a):
        if os.environ.get("QUIET"):
            return
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % a))

    # ---------- utilități
    def send_json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def send_bytes(self, b, ctype, code=200, extra=None):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(b)

    def body(self, limit=MAX_PHOTO):
        n = int(self.headers.get("Content-Length") or 0)
        if n > limit:
            raise ValueError("Fișier prea mare")
        return self.rfile.read(n)

    def json_body(self):
        return json.loads(self.body(5 * 1024 * 1024).decode("utf-8") or "{}")

    def authed(self, con):
        pin = get_settings(con).get("pin_hash", "")
        if not pin:
            return True
        c = self.headers.get("Cookie", "")
        m = re.search(r"tok=([A-Za-z0-9_\-]+)", c)
        return bool(m and m.group(1) in SESSIONS)

    # ---------- rutare
    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def do_PUT(self):
        self.route("PUT")

    def do_DELETE(self):
        self.route("DELETE")

    def route(self, method):
        try:
            u = urllib.parse.urlparse(self.path)
            path = urllib.parse.unquote(u.path)
            q = urllib.parse.parse_qs(u.query)
            if path.startswith("/api/"):
                return self.api(method, path, q)
            if path.startswith("/photos/"):
                con = db()
                ok = self.authed(con)
                con.close()
                if not ok:
                    return self.send_json({"error": "auth"}, 401)
                fn = os.path.basename(path)
                fp = os.path.join(PHOTOS, fn)
                if not os.path.isfile(fp):
                    return self.send_json({"error": "negăsit"}, 404)
                with open(fp, "rb") as f:
                    return self.send_bytes(f.read(), "image/jpeg", extra={"Cache-Control": "private, max-age=86400"})
            if method != "GET":
                return self.send_json({"error": "metodă"}, 405)
            return self.static(path)
        except Exception as e:  # noqa
            try:
                self.send_json({"error": str(e)}, 500)
            except Exception:
                pass

    def static(self, path):
        if path in ("/", ""):
            path = "/index.html"
        fp = os.path.normpath(os.path.join(STATIC, path.lstrip("/")))
        if not fp.startswith(STATIC) or not os.path.isfile(fp):
            return self.send_json({"error": "negăsit"}, 404)
        ctype = mimetypes.guess_type(fp)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            ctype += "; charset=utf-8"
        with open(fp, "rb") as f:
            self.send_bytes(f.read(), ctype, extra={"Cache-Control": "no-cache"})

    # ---------- API
    def api(self, method, path, q):
        con = db()
        try:
            if path == "/api/status" and method == "GET":
                pin = bool(get_settings(con).get("pin_hash"))
                return self.send_json({"pin": pin, "authed": self.authed(con)})
            if path == "/api/login" and method == "POST":
                b = self.json_body()
                s = get_settings(con)
                h = hashlib.sha256((b.get("pin", "")).encode()).hexdigest()
                if s.get("pin_hash") and h != s["pin_hash"]:
                    return self.send_json({"error": "PIN greșit"}, 403)
                tok = secrets.token_urlsafe(24)
                SESSIONS.add(tok)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Set-Cookie", "tok=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000" % tok)
                out = b'{"ok":true}'
                self.send_header("Content-Length", str(len(out)))
                self.end_headers()
                self.wfile.write(out)
                return
            if not self.authed(con):
                return self.send_json({"error": "auth"}, 401)

            if path == "/api/info" and method == "GET":
                return self.send_json({"lan": "http://%s:%d" % (lan_ip(), PORT), "data_dir": DATA})

            if path == "/api/settings":
                if method == "GET":
                    s = get_settings(con)
                    s["pin_set"] = bool(s.pop("pin_hash", ""))
                    return self.send_json(s)
                if method == "PUT":
                    b = self.json_body()
                    for k in ("shop_name", "shop_contact", "warranty_days", "terms", "hourly_rate", "currency"):
                        if k in b:
                            con.execute("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)", (k, str(b[k])))
                    if "pin" in b:
                        ph = hashlib.sha256(b["pin"].encode()).hexdigest() if b["pin"] else ""
                        con.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('pin_hash',?)", (ph,))
                    con.commit()
                    return self.send_json({"ok": True})

            if path == "/api/cases" and method == "GET":
                term = (q.get("q", [""])[0]).strip().lower()
                status = q.get("status", [""])[0]
                out = []
                for r in con.execute("SELECT * FROM cases ORDER BY id DESC"):
                    d = json.loads(r["data"])
                    if status and d.get("status") != status:
                        continue
                    hay = " ".join(str(d.get(k, "")) for k in ("client_name", "client_phone", "vehicle", "plate", "vin",
                                                               "ecu_model", "ecu_hw", "ecu_sw", "symptom", "module_type")) + " " + " ".join(d.get("job_types", [])) + " " + r["number"]
                    if term and term not in hay.lower():
                        continue
                    n = con.execute("SELECT COUNT(*) c FROM photos WHERE case_id=?", (r["id"],)).fetchone()["c"]
                    out.append({"id": r["id"], "number": r["number"], "created": r["created"], "status": d.get("status"),
                                "client_name": d.get("client_name"), "vehicle": d.get("vehicle"), "plate": d.get("plate"),
                                "ecu_model": d.get("ecu_model"), "ecu_hw": d.get("ecu_hw"), "photos": n,
                                "module_type": d.get("module_type", ""), "job_types": d.get("job_types", [])})
                return self.send_json(out)

            if path == "/api/cases" and method == "POST":
                s = get_settings(con)
                data = new_case_data(s)
                num = next_number(con)
                cur = con.execute("INSERT INTO cases(number,created,updated,data) VALUES(?,?,?,?)",
                                  (num, now(), now(), json.dumps(data, ensure_ascii=False)))
                con.commit()
                return self.send_json(case_row(con, cur.lastrowid), 201)

            m = re.match(r"^/api/cases/(\d+)$", path)
            if m:
                cid = int(m.group(1))
                if method == "GET":
                    c = case_row(con, cid)
                    return self.send_json(c) if c else self.send_json({"error": "negăsit"}, 404)
                if method == "PUT":
                    b = self.json_body()
                    con.execute("UPDATE cases SET data=?, updated=? WHERE id=?",
                                (json.dumps(b["data"], ensure_ascii=False), now(), cid))
                    con.commit()
                    return self.send_json({"ok": True, "updated": now()})
                if method == "DELETE":
                    for p in con.execute("SELECT file FROM photos WHERE case_id=?", (cid,)).fetchall():
                        try:
                            os.remove(os.path.join(PHOTOS, os.path.basename(p["file"])))
                        except OSError:
                            pass
                    con.execute("DELETE FROM photos WHERE case_id=?", (cid,))
                    con.execute("DELETE FROM cases WHERE id=?", (cid,))
                    con.commit()
                    return self.send_json({"ok": True})

            m = re.match(r"^/api/cases/(\d+)/photos$", path)
            if m and method == "POST":
                cid = int(m.group(1))
                if not con.execute("SELECT 1 FROM cases WHERE id=?", (cid,)).fetchone():
                    return self.send_json({"error": "caz inexistent"}, 404)
                raw = self.body()
                if raw[:2] != b"\xff\xd8":
                    return self.send_json({"error": "Fișierul nu este JPEG"}, 400)
                fn = "%d_%s.jpg" % (cid, secrets.token_hex(6))
                with open(os.path.join(PHOTOS, fn), "wb") as f:
                    f.write(raw)
                cat = q.get("cat", ["Altele"])[0]
                client = 1
                cur = con.execute("INSERT INTO photos(case_id,cat,caption,file,client,created) VALUES(?,?,?,?,?,?)",
                                  (cid, cat, q.get("caption", [""])[0], fn, client, now()))
                con.commit()
                return self.send_json(dict(con.execute("SELECT * FROM photos WHERE id=?", (cur.lastrowid,)).fetchone()), 201)

            m = re.match(r"^/api/photos/(\d+)$", path)
            if m:
                pid = int(m.group(1))
                if method == "PUT":
                    b = self.json_body()
                    for k in ("cat", "caption", "client"):
                        if k in b:
                            con.execute("UPDATE photos SET %s=? WHERE id=?" % k, (b[k], pid))
                    con.commit()
                    return self.send_json({"ok": True})
                if method == "DELETE":
                    r = con.execute("SELECT file FROM photos WHERE id=?", (pid,)).fetchone()
                    if r:
                        try:
                            os.remove(os.path.join(PHOTOS, os.path.basename(r["file"])))
                        except OSError:
                            pass
                        con.execute("DELETE FROM photos WHERE id=?", (pid,))
                        con.commit()
                    return self.send_json({"ok": True})

            if path == "/api/backup" and method == "GET":
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
                tmp.close()
                dst = sqlite3.connect(tmp.name)
                con.backup(dst)
                dst.close()
                buf = io.BytesIO()
                with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
                    z.write(tmp.name, "atelier.db")
                    for fn in os.listdir(PHOTOS):
                        z.write(os.path.join(PHOTOS, fn), "photos/" + fn)
                os.remove(tmp.name)
                name = "backup_atelier_%s.zip" % datetime.now().strftime("%Y-%m-%d_%H%M")
                return self.send_bytes(buf.getvalue(), "application/zip",
                                       extra={"Content-Disposition": 'attachment; filename="%s"' % name})

            return self.send_json({"error": "rută necunoscută"}, 404)
        finally:
            con.close()


class Srv(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    init()
    srv = Srv(("0.0.0.0", PORT), H)
    print("=" * 60)
    print(" Fișe ECU pornit")
    print(" Pe acest calculator:  http://localhost:%d" % PORT)
    print(" De pe iPhone (Wi-Fi): http://%s:%d" % (lan_ip(), PORT))
    print(" Datele sunt în:       %s" % DATA)
    print(" Oprește cu Ctrl+C sau închide fereastra.")
    print("=" * 60)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nOprit.")
