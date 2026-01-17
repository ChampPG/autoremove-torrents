"""
Web UI for configuring autoremove-torrents config.yml.
"""
import os
import subprocess

import yaml
from flask import Flask, jsonify, render_template, request

CONFIG_PATH = os.environ.get("CONFIG_PATH", "/app/config.yml")
OPTS_BASE = os.environ.get("OPTS", "-c /app/config.yml")
AUTOREMOVE_CMD = "/app/.venv/bin/autoremove-torrents"
CLIENTS = ("qbittorrent", "transmission", "utorrent")

app = Flask(__name__, static_folder="static", template_folder="templates")


def _cats_to_str(v):
    if isinstance(v, list):
        return ", ".join(str(x) for x in v)
    return str(v) if v is not None else ""


def parsed_to_form(obj):
    """Convert YAML config object to form-friendly { tasks: [...] }."""
    tasks = []
    if not isinstance(obj, dict):
        return {"tasks": []}
    for task_name, t in obj.items():
        if not isinstance(t, dict):
            continue
        strategies = []
        for sname, s in (t.get("strategies") or {}).items():
            if isinstance(s, dict) and "remove" in s:
                strategies.append({
                    "name": str(sname),
                    "categories": _cats_to_str(s.get("categories")),
                    "remove": str(s.get("remove") or ""),
                })
        tasks.append({
            "name": str(task_name),
            "client": str(t.get("client") or "qbittorrent"),
            "host": str(t.get("host") or ""),
            "username": str(t.get("username") or ""),
            "password": str(t.get("password") or ""),
            "delete_data": bool(t.get("delete_data")),
            "strategies": strategies,
        })
    return {"tasks": tasks}


def form_to_parsed(form):
    """Convert form { tasks: [...] } to YAML config object."""
    out = {}
    for t in form.get("tasks") or []:
        name = (t.get("name") or "").strip()
        if not name:
            continue
        strat_obj = {}
        for s in t.get("strategies") or []:
            sname = (s.get("name") or "").strip()
            remove = (s.get("remove") or "").strip()
            if not sname or not remove:
                continue
            strat_obj[sname] = {"remove": remove}
            cat = (s.get("categories") or "").strip()
            if cat:
                strat_obj[sname]["categories"] = cat
        out[name] = {
            "client": (t.get("client") or "qbittorrent").strip(),
            "host": (t.get("host") or "").strip(),
            "strategies": strat_obj,
        }
        u = (t.get("username") or "").strip()
        if u:
            out[name]["username"] = u
        p = (t.get("password") or "").strip()
        if p:
            out[name]["password"] = p
        if t.get("delete_data"):
            out[name]["delete_data"] = True
    return out


def get_opts():
    """Parse OPTS to get config path; fallback to CONFIG_PATH."""
    parts = OPTS_BASE.split()
    for i, p in enumerate(parts):
        if p in ("-c", "--conf") and i + 1 < len(parts):
            return parts[i + 1]
    return CONFIG_PATH


def read_config():
    path = get_opts()
    raw = ""
    if not os.path.isfile(path):
        return {"raw": "", "parsed": None, "error": f"Config file not found: {path}"}
    try:
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()
        data = yaml.safe_load(raw)
        parsed = parsed_to_form(data) if isinstance(data, dict) else {"tasks": []}
        return {"raw": raw, "parsed": parsed, "error": None}
    except yaml.YAMLError as e:
        return {"raw": raw, "parsed": None, "error": str(e)}
    except Exception as e:
        return {"raw": raw, "parsed": None, "error": str(e)}


def write_config(raw: str):
    path = get_opts()
    try:
        data = yaml.safe_load(raw)
        if not isinstance(data, dict) or not data:
            return False, "Config must be a non-empty YAML object (task names as keys)."
        # Basic structure check: each task should have client, host, strategies
        for name, task in data.items():
            if not isinstance(task, dict):
                return False, f"Task '{name}' must be an object."
            if "client" not in task:
                return False, f"Task '{name}' must have 'client'."
            if "strategies" not in task or not isinstance(task["strategies"], dict):
                return False, f"Task '{name}' must have 'strategies' (object)."
            for sname, strat in task["strategies"].items():
                if not isinstance(strat, dict) or "remove" not in strat:
                    return False, f"Strategy '{sname}' in task '{name}' must have 'remove'."
    except yaml.YAMLError as e:
        return False, f"Invalid YAML: {e}"

    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(raw)
        return True, None
    except Exception as e:
        return False, str(e)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/config", methods=["GET"])
def api_get_config():
    out = read_config()
    return jsonify(out)


@app.route("/api/config", methods=["POST"])
def api_save_config():
    data = request.get_json() or {}
    if "tasks" in data:
        obj = form_to_parsed({"tasks": data["tasks"]})
        if not obj:
            return jsonify({"ok": False, "error": "At least one task with a name and one strategy with a remove condition is required."}), 400
        raw = yaml.safe_dump(obj, sort_keys=False, default_flow_style=False, allow_unicode=True)
        ok, err = write_config(raw)
    elif "raw" in data:
        ok, err = write_config(data["raw"])
    else:
        return jsonify({"ok": False, "error": "Missing 'tasks' or 'raw' field"}), 400
    if ok:
        return jsonify({"ok": True})
    return jsonify({"ok": False, "error": err}), 400


@app.route("/api/preview", methods=["POST"])
def api_preview():
    """Run autoremove-torrents --view and return output."""
    return run_autoremove(view=True)


@app.route("/api/run", methods=["POST"])
def api_run():
    """Run autoremove-torrents (actually remove)."""
    return run_autoremove(view=False)


def run_autoremove(view: bool):
    opts = OPTS_BASE.split()
    if view:
        opts = [o for o in opts if o not in ("-v", "--view")]
        opts.extend(["--view"])
    cmd = [AUTOREMOVE_CMD] + opts
    try:
        r = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd="/app",
        )
        out = (r.stdout or "") + (r.stderr or "")
        return jsonify({"ok": r.returncode == 0, "output": out, "code": r.returncode})
    except subprocess.TimeoutExpired:
        return jsonify({"ok": False, "output": "Run timed out.", "code": -1}), 408
    except Exception as e:
        return jsonify({"ok": False, "output": str(e), "code": -1}), 500


def main():
    port = int(os.environ.get("WEBUI_PORT", "8080"))
    host = os.environ.get("WEBUI_HOST", "0.0.0.0")
    app.run(host=host, port=port, threaded=True)


if __name__ == "__main__":
    main()

