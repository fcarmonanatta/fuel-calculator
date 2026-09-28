#!/usr/bin/env python3
"""Regenera la base de aeropuertos embebida en index.html.

Fuente: OurAirports (https://ourairports.com/data/), dominio público.
Incluye aeropuertos grandes y medianos de todo el mundo y los chicos de
Sudamérica, siempre que tengan código OACI de 4 letras.

Uso:  python3 tools/build_airports.py [ruta/a/airports.csv]
Sin argumento descarga el CSV desde GitHub.
"""
import csv, io, json, re, sys, urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv"
ROOT = Path(__file__).resolve().parent.parent
RANK = {"large_airport": 2, "medium_airport": 1, "small_airport": 0}
ABBR = [(r"\bInternational\b", "Intl"), (r"\bAirport\b", ""), (r"\bAeropuerto\b", "Aerop."),
        (r"\bAeroporto\b", "Aerop."), (r"\bRegional\b", "Rgnl"), (r"\bMunicipal\b", "Muni"),
        (r"\bExecutive\b", "Exec"), (r"\bAir Force Base\b", "AFB"), (r"\bAirfield\b", "Afld"),
        (r"\bAerodrome\b", "Aerod."), (r"\bAeródromo\b", "Aerod.")]


def short(name):
    for a, b in ABBR:
        name = re.sub(a, b, name)
    return re.sub(r"\s{2,}", " ", name).strip(" -–,")


def main():
    if len(sys.argv) > 1:
        text = Path(sys.argv[1]).read_text(encoding="utf-8")
    else:
        text = urllib.request.urlopen(URL, timeout=60).read().decode("utf-8")
    best = {}
    for r in csv.DictReader(io.StringIO(text)):
        code = (r["icao_code"] or r["gps_code"] or "").strip().upper()
        t = r["type"]
        if not re.fullmatch(r"[A-Z]{4}", code) or t not in RANK:
            continue
        if t == "small_airport" and r["continent"] != "SA":
            continue
        row = [code, r["iata_code"] or "", short(r["name"]), r["municipality"] or "", r["iso_country"], RANK[t]]
        if code not in best or row[5] > best[code][5]:
            best[code] = row
    data = sorted(best.values(), key=lambda x: x[0])
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    html_path = ROOT / "index.html"
    html = html_path.read_text(encoding="utf-8")
    new, n = re.subn(r'(<script type="application/json" id="airports-data">).*?(</script>)',
                     lambda m: m.group(1) + payload + m.group(2), html, flags=re.S)
    if n != 1:
        sys.exit("No se encontró el bloque airports-data en index.html")
    html_path.write_text(new, encoding="utf-8")
    print(f"{len(data)} aeropuertos, {len(payload) // 1024} KB")


if __name__ == "__main__":
    main()
