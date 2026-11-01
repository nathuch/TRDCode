"""Convierte el reporte de expedientes de OnBase (Excel) en un script SQL para cargarlo en MySQL.

Uso, desde la raíz del proyecto:
    .venv/Scripts/python scripts/generar_expedientes_sql.py [reporte.xlsx] [--fecha AAAA-MM-DD]

Escribe datos-prueba/expedientes.sql, que crea una carga activa con los expedientes de los
tres centros. Ese archivo trae nombres de personas: NO va al repositorio.

Aplica la normalización del plan (sección 5):
  - Solo los expedientes de dependencias de los tres centros (73.9226, 73.9310, 73.9123).
  - "Serie Código" 73.9226.4-85 -> dependencia 73.9226.4 y serie 85; "Subserie Código"
    73.9226.4-85.15 -> subserie 85.15 (vacía -> '').
  - Fecha de creación a AAAA-MM-DD (el Excel la trae como número de fecha).
  - Control de acceso PÚBLICO / PÚBLICO CLASIFICADO / PÚBLICO RESERVADO -> IPU / IPC / IPR.
Lee el Excel sin librerías externas.
"""
import argparse
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
REPORTE = RAIZ / "datos-prueba" / "reporte-tolima-2026-08-10.xlsx"
SALIDA = RAIZ / "datos-prueba" / "expedientes.sql"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

# Las mismas de database/datos_iniciales.sql.
DEPENDENCIAS = {"73.9226", "73.9226.2", "73.9226.4", "73.9310", "73.9310.2", "73.9310.4", "73.9123", "73.9123.4"}
COLUMNAS = ["Código", "Título", "TRD", "Serie Código", "Subserie Serie Nombre", "Subserie Código", "Subserie",
            "Fecha Creación", "Control de Acceso"]
CONTROL = {"PUBLICO": "IPU", "PUBLICO CLASIFICADO": "IPC", "PUBLICO RESERVADO": "IPR"}
LOTE = 500


def sin_tildes(texto):
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn").upper().strip()


def leer_xlsx(ruta):
    """Devuelve las filas de la primera hoja como listas de texto."""
    with zipfile.ZipFile(ruta) as z:
        compartidas = []
        if "xl/sharedStrings.xml" in z.namelist():
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(f"{NS}si"):
                compartidas.append("".join(t.text or "" for t in si.iter(f"{NS}t")))
        hoja = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    filas = []
    for fila in hoja.iter(f"{NS}row"):
        valores, posicion = {}, -1
        for celda in fila.findall(f"{NS}c"):
            ref = celda.get("r")
            if ref:
                letras = re.match(r"[A-Z]+", ref).group(0)
                posicion = 0
                for letra in letras:
                    posicion = posicion * 26 + ord(letra) - 64
                posicion -= 1
            else:
                posicion += 1
            v, en_linea = celda.find(f"{NS}v"), celda.find(f"{NS}is")
            if celda.get("t") == "s" and v is not None:
                valores[posicion] = compartidas[int(v.text)]
            elif en_linea is not None:
                valores[posicion] = "".join(t.text or "" for t in en_linea.iter(f"{NS}t"))
            else:
                valores[posicion] = v.text if v is not None else ""
        if valores:
            filas.append([valores.get(i, "") for i in range(max(valores) + 1)])
    return filas


def fecha(texto):
    """Fecha del Excel (número de serie o texto) a AAAA-MM-DD; None si no se reconoce."""
    texto = (texto or "").strip()
    if re.fullmatch(r"\d+(\.\d+)?", texto):
        return (date(1899, 12, 30) + timedelta(days=int(float(texto)))).isoformat()
    for formato in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y %I:%M:%S %p"):
        try:
            return datetime.strptime(texto, formato).date().isoformat()
        except ValueError:
            continue
    return None


def dependencia(codigo):
    """'739226' y '73.9226' son lo mismo; se devuelve siempre con puntos."""
    codigo = codigo.strip()
    if re.fullmatch(r"\d{6,7}", codigo):
        codigo = f"{codigo[:2]}.{codigo[2:6]}" + (f".{codigo[6:]}" if len(codigo) > 6 else "")
    return codigo


def normalizar(filas):
    encabezado = [c.strip() for c in filas[0]]
    faltan = [c for c in COLUMNAS if c not in encabezado]
    if faltan:
        sys.exit(f"Al reporte le faltan las columnas: {', '.join(faltan)}")
    col = {c: encabezado.index(c) for c in COLUMNAS}
    validos, descartados, problemas = [], Counter(), Counter()
    for numero, fila in enumerate(filas[1:], start=2):
        dato = lambda c: (fila[col[c]] if col[c] < len(fila) else "").strip()
        serie_codigo = dato("Serie Código")
        if "-" not in serie_codigo:
            problemas["sin código de serie"] += 1
            continue
        dep, serie = serie_codigo.split("-", 1)
        dep = dependencia(dep)
        if dep not in DEPENDENCIAS:
            descartados[dep.split(".")[0] + "." + dep.split(".")[1] if dep.count(".") else dep] += 1
            continue
        subserie_codigo = dato("Subserie Código")
        subserie = subserie_codigo.split("-", 1)[1] if "-" in subserie_codigo else ""
        expediente = {
            "codigo": dato("Código"),
            "nombre": dato("Título")[:300],
            "trd_version": dato("TRD"),
            "codigo_dependencia": dep,
            "codigo_serie": serie,
            "codigo_subserie": subserie,
            "nombre_serie": dato("Subserie Serie Nombre")[:200],
            "nombre_subserie": dato("Subserie")[:250],
            "fecha_creacion": fecha(dato("Fecha Creación")),
            "control_acceso": CONTROL.get(sin_tildes(dato("Control de Acceso")), dato("Control de Acceso")[:30]),
        }
        motivo = None
        if not re.fullmatch(r"\d{4}EX-\d{6}", expediente["codigo"]):
            motivo = "código de expediente inválido"
        elif expediente["trd_version"] not in ("10", "11"):
            motivo = "versión de TRD distinta de 10 u 11"
        elif expediente["fecha_creacion"] is None:
            motivo = "fecha de creación vacía o inválida"
        elif subserie and not subserie.startswith(serie + "."):
            motivo = "la subserie no pertenece a la serie"
        if motivo:
            problemas[motivo] += 1
            continue
        expediente["anio"] = int(expediente["fecha_creacion"][:4])
        expediente["_fila"] = numero
        validos.append(expediente)
    repetidos = {c for c, n in Counter(e["codigo"] for e in validos).items() if n > 1}
    if repetidos:
        problemas["código de expediente repetido"] += sum(1 for e in validos if e["codigo"] in repetidos)
        validos = [e for e in validos if e["codigo"] not in repetidos]
    return validos, descartados, problemas


def sql_texto(valor):
    if valor is None:
        return "NULL"
    return "'" + str(valor).replace("\\", "\\\\").replace("'", "''") + "'"


def generar_sql(expedientes, fecha_reporte, archivo):
    campos = ["codigo", "nombre", "trd_version", "codigo_dependencia", "codigo_serie", "codigo_subserie",
              "nombre_serie", "nombre_subserie", "fecha_creacion", "anio", "control_acceso"]
    lineas = [
        f"-- Generado por scripts/generar_expedientes_sql.py a partir de {archivo}.",
        "-- Trae nombres de personas: no va al repositorio. Se importa después de schema.sql,",
        "-- datos_iniciales.sql y trd.sql. Deja esta carga como la activa.",
        "SET NAMES utf8mb4;",
        "START TRANSACTION;",
        # Usuario técnico para registrar la carga: está inactivo y su clave '!' no corresponde a ningún hash,
        # así que no se puede usar para iniciar sesión.
        "INSERT INTO usuarios (correo, nombre, clave_hash, activo) "
        "VALUES ('carga-inicial@trdcode.local', 'Carga inicial del prototipo', '!', 0) "
        "ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);",
        "SET @usuario = LAST_INSERT_ID();",
        "UPDATE cargas SET estado = 'reemplazada' WHERE estado = 'activa';",
        "INSERT INTO cargas (usuario_id, fecha_reporte, fecha_carga, archivo, total_esperado, total_expedientes, estado) "
        f"VALUES (@usuario, '{fecha_reporte}', NOW(), {sql_texto(archivo)}, {len(expedientes)}, {len(expedientes)}, 'activa');",
        "SET @carga = LAST_INSERT_ID();",
    ]
    for i in range(0, len(expedientes), LOTE):
        valores = ",\n".join(
            "(@carga, " + ", ".join(str(e[c]) if c == "anio" else sql_texto(e[c]) for c in campos) + ")"
            for e in expedientes[i:i + LOTE]
        )
        lineas.append(f"INSERT INTO expedientes (carga_id, {', '.join(campos)}) VALUES\n{valores};")
    lineas.append("COMMIT;")
    return "\n".join(lineas) + "\n"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("reporte", nargs="?", default=str(REPORTE))
    parser.add_argument("--fecha", default="2026-08-10", help="fecha del reporte, AAAA-MM-DD")
    args = parser.parse_args()
    ruta = Path(args.reporte)
    filas = leer_xlsx(ruta)
    validos, descartados, problemas = normalizar(filas)
    SALIDA.write_text(generar_sql(validos, args.fecha, ruta.name), encoding="utf-8")
    print(f"{len(filas) - 1} filas leídas; {len(validos)} expedientes de los tres centros -> {SALIDA.relative_to(RAIZ)}")
    print("  por centro:", dict(Counter(e["codigo_dependencia"][:7] for e in validos)))
    print("  descartados por dependencia:", sum(descartados.values()), dict(descartados.most_common()))
    print("  con problemas:", dict(problemas) or "ninguno")


if __name__ == "__main__":
    main()
