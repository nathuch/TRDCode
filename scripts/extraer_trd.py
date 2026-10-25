"""Extrae las Tablas de Retención Documental (TRD) de los PDF del SENA.

Lee los seis PDF de scripts/trd-pdf/ y genera:
  - scripts/salida/trd.json  para revisar lo extraído
  - database/trd.sql         para cargarlo en MySQL

Uso, desde la raíz del proyecto:  .venv/Scripts/python scripts/extraer_trd.py

Hay dos formatos:
  - TRD 10 (2020): cuatro tablas por página; la serie y la subserie van en columnas
    separadas ("02" y "12" -> 02.12) y las marcas son "X".
  - TRD 11 (2025): una tabla por página; cada fila lleva una viñeta (g serie,
    c subserie, a tipo documental) y las marcas son el código escrito (IPU, CT...).
El número de columnas cambia entre páginas, así que cada celda se ubica por su
posición horizontal frente a los títulos de la cabecera (P, AG, AC, CT...).
"""
import json
import re
import sys
from pathlib import Path

import pdfplumber

RAIZ = Path(__file__).resolve().parent.parent
CARPETA_PDF = RAIZ / "scripts" / "trd-pdf"
SALIDA_JSON = RAIZ / "scripts" / "salida" / "trd.json"
SALIDA_SQL = RAIZ / "database" / "trd.sql"
CORRECCIONES = RAIZ / "scripts" / "correcciones.json"

# Archivo, versión de la TRD y plantilla. La plantilla se guarda siempre con punto (00.9000.4).
PDFS = [
    ("trd-2020_00.9000_subdireccion-centro.pdf", "10", "00.9000"),
    ("trd-2020_00.9000-2_administracion-educativa.pdf", "10", "00.9000.2"),
    ("trd-2020_00.9000-4_formacion-profesional-integral.pdf", "10", "00.9000.4"),
    ("trd-2025_00.9000_subdireccion-centros.pdf", "11", "00.9000"),
    ("trd-2025_00.9000.2_administracion-educativa.pdf", "11", "00.9000.2"),
    ("trd-2025_00.9000.4_formacion-profesional-integral.pdf", "11", "00.9000.4"),
]

# Títulos de la línea de cabecera de cada versión, de izquierda a derecha.
COLUMNAS = {
    "10": ["SERIE", "SUBSERIE", "PROCESO", "PROCEDIMIENTO", "P", "EL", "AG", "AC", "CT", "E", "S", "M", "D"],
    "11": ["PROCESO", "PROCEDIMIENTO", "SERIE", "SUBSERIE", "P", "ELECT", "IPU", "IPC", "IPR",
           "AG", "AC", "CT", "S", "MT", "E", "DDHH"],
}
# Columna que queda justo a la izquierda del nombre, y última columna antes del procedimiento.
ANTES_DEL_NOMBRE = "SUBSERIE"
ULTIMA_MARCA = {"10": "D", "11": "DDHH"}

DISPOSICIONES = {"10": ["CT", "E", "S", "M", "D"], "11": ["CT", "S", "MT", "E"]}
CLASIFICACIONES = ["IPU", "IPC", "IPR"]


def limpiar(texto):
    """Une las líneas de una celda y quita viñetas y caracteres de control."""
    if not texto:
        return ""
    texto = texto.replace("", " ").replace("•", " ").replace("‐", "-")
    texto = re.sub(r"\(cid:\d+\)", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()


def leer_encabezado(pagina):
    """Devuelve la vigencia (año) y el código de dependencia que trae la página."""
    texto = pagina.extract_text() or ""
    vigencia = re.search(r"VIGENCIA\s+(\d{4})", texto) or re.search(r"FECHA\s+\d{2}/\d{2}/(\d{4})", texto)
    codigo = re.search(r"00[‐\-.]9000+(?:[‐\-.]\d)?", texto)
    return (vigencia.group(1) if vigencia else None, codigo.group(0) if codigo else None)


def ubicar_columnas(pagina, version, previas=None):
    """Busca la línea de cabecera (la que tiene AG y AC) y devuelve [(título, x central)].

    Si el texto del cuerpo se monta sobre la cabecera y falta algún título, se toma su
    posición de la página anterior: todas las páginas de un PDF usan la misma plantilla.
    """
    palabras = pagina.extract_words(keep_blank_chars=False)
    ag = [p for p in palabras if p["text"] == "AG"]
    if not ag:
        return None, None
    linea = ag[0]["top"]
    alto = ag[0]["bottom"] - ag[0]["top"]
    en_linea = sorted((p for p in palabras if abs(p["top"] - linea) < alto), key=lambda p: p["x0"])
    esperadas = list(COLUMNAS[version])
    columnas = []
    for p in en_linea:
        nombre = p["text"]
        if nombre == "SERIE" and any(c == "SERIE" for c, _ in columnas):
            nombre = "DDHH"  # "SERIE DE DDHH/DIH" de la TRD 11
        if nombre in esperadas:
            esperadas.remove(nombre)
            columnas.append((nombre, (p["x0"] + p["x1"]) / 2))
    if version == "11" and "DDHH" in esperadas:
        # A veces "SERIE DE DDHH/DIH" va en dos líneas: se ubica por la palabra DDHH/DIH.
        ddhh = [p for p in palabras if "DDHH" in p["text"]]
        if ddhh:
            esperadas.remove("DDHH")
            columnas.append(("DDHH", (ddhh[0]["x0"] + ddhh[0]["x1"]) / 2))
    if esperadas and previas:
        columnas += [(nombre, x) for nombre, x in previas if nombre in esperadas]
        esperadas = []
    if esperadas:
        raise ValueError(f"pág {pagina.page_number}: no se encontraron las columnas {esperadas}")
    return sorted(columnas, key=lambda c: c[1]), ag[0]["bottom"]


def columna_de(celda, columnas, version):
    """Asigna una celda (x0, x1) a un título de columna, a NOMBRE o a PROCEDIMIENTO_TEXTO."""
    x0, x1 = celda
    dentro = [nombre for nombre, x in columnas if x0 <= x <= x1]
    if len(dentro) == 1:
        return dentro[0]
    centro = dict(columnas)
    if x0 >= centro[ULTIMA_MARCA[version]]:
        return "PROCEDIMIENTO_TEXTO"
    siguiente = min((x for _, x in columnas if x > centro[ANTES_DEL_NOMBRE]), default=None)
    if x0 >= centro[ANTES_DEL_NOMBRE] and (siguiente is None or x1 <= siguiente):
        return "NOMBRE"
    if len(dentro) > 1:
        return dentro[0]
    # Celda angosta sin título encima: se asigna a la columna más cercana.
    medio = (x0 + x1) / 2
    return min(columnas, key=lambda c: abs(c[1] - medio))[0]


def es_vineta(objeto):
    """En las TRD 11 las viñetas (g serie, c subserie, a tipo) son letras de la fuente Webdings."""
    return objeto.get("object_type") == "char" and "Webdings" in objeto.get("fontname", "")


def leer_filas(pagina, version, previas=None):
    """Devuelve las columnas de la página y sus filas del cuerpo como diccionarios {columna: texto}.

    En la TRD 11 las viñetas se sacan de la página antes de leer las tablas, para que no se
    mezclen con el texto (en un tipo de dos renglones la viñeta queda entre los dos), y cada
    fila recibe en "_vineta" la que cae dentro de su altura.
    """
    vinetas = []
    if version == "11":
        vinetas = [c for c in pagina.chars if es_vineta(c) and c["text"] in "gca"]
        pagina = pagina.filter(lambda o: not es_vineta(o))
    columnas, fin_cabecera = ubicar_columnas(pagina, version, previas)
    if columnas is None:
        return previas, []
    limite_nombre = dict(columnas)["P"]
    cuerpo = []
    for tabla in pagina.find_tables():
        for fila, valores in zip(tabla.rows, tabla.extract()):
            celdas = [(c, v) for c, v in zip(fila.cells, valores) if c is not None]
            if not celdas or min(c[1] for c, _ in celdas) < fin_cabecera:
                continue
            if any("CONVENCIONES" in (v or "") for _, v in celdas):
                break
            # La altura de la fila se mide con la celda del nombre: las de proceso y
            # procedimiento abarcan varias filas y harían que la fila "contenga" viñetas ajenas.
            lado_nombre = ([c for c, _ in celdas if columna_de((c[0], c[2]), columnas, version) == "NOMBRE"]
                           or [c for c, _ in celdas])
            cuerpo.append({"celdas": celdas, "arriba": min(c[1] for c in lado_nombre),
                           "abajo": max(c[3] for c in lado_nombre), "vineta": None, "distancia": None})

    # Cada viñeta va a una sola fila: la de centro más cercano entre las que la contienen
    # (las filas vecinas comparten el borde y una viñeta puede caer en las dos).
    for v in vinetas:
        y = (v["top"] + v["bottom"]) / 2
        candidatas = [f for f in cuerpo if f["arriba"] <= y <= f["abajo"]]
        if v["x0"] >= limite_nombre or not candidatas:
            continue
        fila = min(candidatas, key=lambda f: abs((f["arriba"] + f["abajo"]) / 2 - y))
        distancia = abs((fila["arriba"] + fila["abajo"]) / 2 - y)
        if fila["distancia"] is None or distancia < fila["distancia"]:
            fila["vineta"], fila["distancia"] = v["text"], distancia

    filas = []
    for fila in cuerpo:
        dic = {"_vineta": fila["vineta"]} if fila["vineta"] else {}
        for c, v in fila["celdas"]:
            col = columna_de((c[0], c[2]), columnas, version)
            # En la TRD 10 los tipos documentales empiezan con una viñeta; sin ella, la fila
            # puede ser la segunda línea del tipo anterior.
            if version == "10" and col == "NOMBRE" and (v or "").lstrip().startswith(("", "•")):
                dic["_vineta"] = True
            v = limpiar(v)
            if not v:
                continue
            dic[col] = f"{dic[col]} {v}" if col in dic else v
        if dic:
            dic["_pagina"] = pagina.page_number
            filas.append(dic)
    return columnas, filas


def codigo_dos_digitos(codigo):
    """'2' -> '02'; deja intactos los códigos con punto."""
    return codigo.zfill(2) if codigo.isdigit() else codigo


def tipo_de_fila(fila, version):
    """Clasifica la fila: ('serie', código, nombre), ('subserie', código, nombre),
    ('tipo', None, nombre), ('continuacion', None, texto), ('grupo', None, subtítulo) o None.

    En la TRD 11 las filas sin viñeta son subtítulos que agrupan tipos documentales
    ("Modalidad Licitación Pública"); en la TRD 10, una fila sin viñeta ni marca es la
    segunda línea del tipo anterior.
    """
    nombre = fila.get("NOMBRE", "")
    serie = fila.get("SERIE", "").replace(" ", "")
    subserie = fila.get("SUBSERIE", "").replace(" ", "")
    if version == "11":
        vineta = fila.get("_vineta")
        if subserie and vineta in ("c", None):
            return "subserie", subserie, nombre
        if serie and vineta in ("g", None):
            return "serie", codigo_dos_digitos(serie), nombre
        if vineta == "a":
            # Algunas filas del PDF traen la viñeta sin texto: se cuentan para la validación.
            return ("tipo", None, nombre) if nombre else ("vacia", None, "")
        if nombre and not serie and not subserie:
            return "grupo", None, nombre
        return None
    if subserie:
        return "subserie", f"{codigo_dos_digitos(serie)}.{codigo_dos_digitos(subserie)}", nombre
    if serie:
        return "serie", codigo_dos_digitos(serie), nombre
    if nombre:
        nuevo = fila.get("_vineta") or fila.get("P") or fila.get("EL")
        return ("tipo" if nuevo else "continuacion"), None, nombre
    return None


def marcar_columnas(fila, version):
    """Convierte las marcas de soporte, clasificación y disposición en listas."""
    soporte = []
    if fila.get("P"):
        soporte.append("P")
    if fila.get("EL") or fila.get("ELECT"):
        soporte.append("EL")
    clasificacion = [c for c in CLASIFICACIONES if fila.get(c)]
    disposicion = [d for d in DISPOSICIONES[version] if fila.get(d)]
    return soporte, clasificacion, disposicion


def numero(texto):
    m = re.search(r"\d+", texto or "")
    return int(m.group(0)) if m else None


def extraer_inicio(procedimiento):
    """Toma la frase de cuándo empieza a contar la retención.

    Las TRD 11 la redactan de varias formas ("El tiempo de retención inicia con...",
    "El cierre administrativo de la subserie inicia con...", "...a partir de..."). Las TRD 10
    no la traen, y en ese caso se deja vacía.
    """
    for frase in re.split(r"(?<=\.)\s+(?=[A-ZÁÉÍÓÚ])", procedimiento or ""):
        if (re.search(r"tiempo de retención|cierre administrativo", frase, re.IGNORECASE)
                and re.search(r"\binicia|a partir de|empieza|comienza|se cuenta", frase, re.IGNORECASE)
                and not frase.lower().startswith("cumplido")):
            return frase.strip()
    return None


def procesar_pdf(ruta, version, plantilla):
    registros, actual, nombres_serie, grupo, vacias = [], None, {}, None, 0
    with pdfplumber.open(ruta) as pdf:
        vigencia, codigo = leer_encabezado(pdf.pages[0])
        esperada = "2020" if version == "10" else "2025"
        if vigencia != esperada:
            print(f"  aviso: {ruta.name} dice vigencia {vigencia}, se esperaba {esperada}")
        columnas = None
        for pagina in pdf.pages:
            columnas, filas = leer_filas(pagina, version, columnas)
            for fila in filas:
                clase = tipo_de_fila(fila, version)
                texto_proc = fila.get("PROCEDIMIENTO_TEXTO", "")
                if clase and clase[0] in ("serie", "subserie"):
                    tipo, codigo_fila, nombre = clase
                    # La serie sale del propio código (39.32 -> 39), no de la última fila de serie leída.
                    codigo_serie = codigo_fila.split(".")[0]
                    if tipo == "serie" and nombre:
                        nombres_serie.setdefault(codigo_serie, nombre)
                    soporte, clasificacion, disposicion = marcar_columnas(fila, version)
                    actual = {
                        "version": version,
                        "plantilla": plantilla,
                        "proceso": fila.get("PROCESO") or (actual or {}).get("proceso"),
                        "codigo_serie": codigo_serie,
                        "nombre_serie": "",
                        "codigo_subserie": codigo_fila if tipo == "subserie" else "",
                        "nombre_subserie": nombre if tipo == "subserie" else "",
                        "soporte": soporte,
                        "clasificacion": clasificacion,
                        "retencion_ag": numero(fila.get("AG")),
                        "retencion_ac": numero(fila.get("AC")),
                        "disposicion": disposicion,
                        "ddhh": bool(fila.get("DDHH")),
                        "procedimiento": texto_proc,
                        "tipos": [],
                        "pagina": fila["_pagina"],
                    }
                    registros.append(actual)
                    grupo = None
                elif actual is not None:
                    if clase and clase[0] == "tipo":
                        actual["tipos"].append({"nombre": clase[2][0].upper() + clase[2][1:], "grupo": grupo})
                    elif clase and clase[0] == "continuacion":
                        if actual["tipos"]:
                            actual["tipos"][-1]["nombre"] += " " + clase[2]
                        else:
                            actual["tipos"].append({"nombre": clase[2][0].upper() + clase[2][1:], "grupo": grupo})
                    elif clase and clase[0] == "grupo":
                        grupo = clase[2]
                    elif clase and clase[0] == "vacia":
                        vacias += 1
                        print(f"  aviso: pág {fila['_pagina']} tiene una viñeta de tipo documental sin texto")
                    if texto_proc:
                        actual["procedimiento"] = f"{actual['procedimiento']} {texto_proc}".strip()
    # Una serie que tiene subseries no se guarda como registro propio: sus datos están en las subseries.
    # Si su fila trae el procedimiento (la celda combinada se alinea con ella), pasa a la primera
    # subserie cuando esta no tiene uno propio.
    con_subseries = {r["codigo_serie"] for r in registros if r["codigo_subserie"]}
    for anterior, siguiente in zip(registros, registros[1:]):
        if (not anterior["codigo_subserie"] and anterior["codigo_serie"] in con_subseries
                and siguiente["codigo_serie"] == anterior["codigo_serie"] and not siguiente["procedimiento"]):
            siguiente["procedimiento"] = anterior["procedimiento"]
    finales = [r for r in registros if r["codigo_subserie"] or r["codigo_serie"] not in con_subseries]
    for r in finales:
        r["nombre_serie"] = nombres_serie.get(r["codigo_serie"], "")
        if not r["nombre_serie"]:
            print(f"  aviso: la serie {r['codigo_serie']} (pág {r['pagina']}) no tiene nombre")
        r["inicio_retencion"] = extraer_inicio(r["procedimiento"])
    return finales, vacias


def contar_codigos(ruta, version):
    """Cuenta los códigos de serie y subserie leyendo las palabras de esas columnas, sin usar las tablas.

    Sirve para validar la extracción: los dos conteos deben coincidir.
    """
    series, subseries, tipos = set(), set(), 0
    with pdfplumber.open(ruta) as pdf:
        columnas = None
        for pagina in pdf.pages:
            if version == "11":
                # Viñetas "a" del cuerpo, sin las de la leyenda de convenciones.
                convenciones = [p["top"] for p in pagina.extract_words() if p["text"] == "CONVENCIONES"]
                tope = min(convenciones) if convenciones else pagina.height
                tipos += sum(1 for c in pagina.chars if es_vineta(c) and c["text"] == "a" and c["top"] < tope)
                pagina = pagina.filter(lambda o: not es_vineta(o))
            columnas, _ = ubicar_columnas(pagina, version, columnas)
            if columnas is None:
                continue
            centro = dict(columnas)
            ancho = abs(centro["SUBSERIE"] - centro["SERIE"]) / 2
            en_serie, en_subserie = [], []
            for p in pagina.extract_words():
                x = (p["x0"] + p["x1"]) / 2
                if abs(x - centro["SERIE"]) < ancho and re.fullmatch(r"\d{1,3}", p["text"]):
                    series.add(codigo_dos_digitos(p["text"]))
                    en_serie.append(p)
                elif abs(x - centro["SUBSERIE"]) < ancho and re.fullmatch(r"\d{1,3}(\.\d{1,3})?", p["text"]):
                    en_subserie.append(p)
            for p in en_subserie:
                if "." in p["text"]:
                    subseries.add(p["text"])
                    continue
                # TRD 10: la subserie trae solo la parte final; la serie va en la misma línea.
                misma_linea = [s for s in en_serie if abs(s["top"] - p["top"]) < 3]
                serie = codigo_dos_digitos(misma_linea[0]["text"]) if misma_linea else "??"
                subseries.add(f"{serie}.{codigo_dos_digitos(p['text'])}")
    return series, subseries, (tipos if version == "11" else None)


def aplicar_correcciones(registros):
    """Aplica scripts/correcciones.json.

    - "textos": reemplazos en todos los textos (palabras que el PDF parte en dos renglones).
    - "procesos": nombre completo de un proceso que el PDF corta.
    - "registros": campos que se reemplazan en un registro, por llave version|plantilla|serie|subserie.
    """
    if not CORRECCIONES.exists():
        return
    datos = json.loads(CORRECCIONES.read_text(encoding="utf-8"))

    def corregir(texto):
        for viejo, nuevo in datos.get("textos", {}).items():
            texto = texto.replace(viejo, nuevo) if texto else texto
        return texto

    for r in registros:
        for campo in ("proceso", "nombre_serie", "nombre_subserie", "procedimiento"):
            r[campo] = corregir(r[campo])
        r["proceso"] = datos.get("procesos", {}).get(r["proceso"], r["proceso"])
        for t in r["tipos"]:
            t["nombre"] = corregir(t["nombre"])

    por_llave = {f"{r['version']}|{r['plantilla']}|{r['codigo_serie']}|{r['codigo_subserie']}": r for r in registros}
    for llave, cambios in datos.get("registros", {}).items():
        if llave not in por_llave:
            print(f"  aviso: la corrección {llave} no coincide con ningún registro")
            continue
        cambios = {k: v for k, v in cambios.items() if not k.startswith("_")}
        por_llave[llave].update(cambios)
        if "procedimiento" in cambios and "inicio_retencion" not in cambios:
            por_llave[llave]["inicio_retencion"] = extraer_inicio(cambios["procedimiento"])


def sql_texto(valor):
    if valor is None or valor == "":
        return "NULL"
    return "'" + str(valor).replace("\\", "\\\\").replace("'", "''") + "'"


def generar_sql(registros):
    lineas = [
        "-- Generado por scripts/extraer_trd.py. No editar a mano: corregir en scripts/correcciones.json.",
        "SET NAMES utf8mb4;",
        "START TRANSACTION;",
        "DELETE FROM trd_registros WHERE version IN ("
        + ", ".join(sorted({sql_texto(r["version"]) for r in registros})) + ");",
    ]
    for r in registros:
        valores = [
            sql_texto(r["version"]), sql_texto(r["plantilla"]), sql_texto(r["proceso"]),
            sql_texto(r["codigo_serie"]), sql_texto(r["nombre_serie"]),
            "'" + r["codigo_subserie"].replace("'", "''") + "'",
            "'" + r["nombre_subserie"].replace("\\", "\\\\").replace("'", "''") + "'",
            sql_texto(",".join(r["soporte"])), sql_texto(",".join(r["clasificacion"])),
            "NULL" if r["retencion_ag"] is None else str(r["retencion_ag"]),
            "NULL" if r["retencion_ac"] is None else str(r["retencion_ac"]),
            sql_texto(r["inicio_retencion"]), sql_texto(",".join(r["disposicion"])), sql_texto(r["procedimiento"]),
        ]
        lineas.append(
            "INSERT INTO trd_registros (version, plantilla, proceso, codigo_serie, nombre_serie, codigo_subserie, "
            "nombre_subserie, soporte, clasificacion, retencion_ag, retencion_ac, inicio_retencion, disposicion, "
            f"procedimiento) VALUES ({', '.join(valores)});"
        )
        if r["tipos"]:
            lineas.append("SET @id = LAST_INSERT_ID();")
            tipos = ", ".join(f"(@id, {i}, {sql_texto(t['grupo'])}, {sql_texto(t['nombre'])})"
                              for i, t in enumerate(r["tipos"], start=1))
            lineas.append(f"INSERT INTO trd_tipos_documentales (trd_id, orden, grupo, nombre) VALUES {tipos};")
    lineas.append("COMMIT;")
    return "\n".join(lineas) + "\n"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    todos = []
    for archivo, version, plantilla in PDFS:
        registros, vacias = procesar_pdf(CARPETA_PDF / archivo, version, plantilla)
        print(f"{archivo}: {len(registros)} registros, "
              f"{sum(len(r['tipos']) for r in registros)} tipos documentales")
        series, subseries, vinetas_tipo = contar_codigos(CARPETA_PDF / archivo, version)
        tipos_extraidos = sum(len(r["tipos"]) for r in registros)
        if vinetas_tipo is not None and vinetas_tipo != tipos_extraidos + vacias:
            print(f"  DIFERENCIA en tipos documentales: {vinetas_tipo} viñetas en el PDF, "
                  f"{tipos_extraidos} extraídos y {vacias} sin texto")
        extraidas = {r["codigo_serie"] for r in registros}
        extraidas_sub = {r["codigo_subserie"] for r in registros if r["codigo_subserie"]}
        mal_ubicadas = [r["codigo_subserie"] for r in registros
                        if r["codigo_subserie"] and not r["codigo_subserie"].startswith(r["codigo_serie"] + ".")]
        if mal_ubicadas:
            print(f"  DIFERENCIA: subseries con serie equivocada {mal_ubicadas}")
        for nombre, en_pdf, leidas in (("series", series, extraidas), ("subseries", subseries, extraidas_sub)):
            if en_pdf != leidas:
                print(f"  DIFERENCIA en {nombre}: solo en el PDF {sorted(en_pdf - leidas)}, "
                      f"solo en lo extraído {sorted(leidas - en_pdf)}")
        todos += registros
    aplicar_correcciones(todos)
    SALIDA_JSON.parent.mkdir(parents=True, exist_ok=True)
    SALIDA_JSON.write_text(json.dumps(todos, ensure_ascii=False, indent=2), encoding="utf-8")
    SALIDA_SQL.write_text(generar_sql(todos), encoding="utf-8")
    print(f"Total: {len(todos)} registros -> {SALIDA_JSON.relative_to(RAIZ)} y {SALIDA_SQL.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
