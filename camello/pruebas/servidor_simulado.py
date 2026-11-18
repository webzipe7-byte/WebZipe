"""
Servidor Supabase simulado para probar Camello sin internet.

Imita lo que usa la app: cuentas (/auth/v1), tablas y funciones (/rest/v1)
y el tiempo real (/realtime/v1 por WebSocket), con las mismas reglas de
negocio que las funciones SQL (crear_pedido, avanzar_pedido, actualizar_pedido).
Cada página que se conecta queda identificada por su token.
"""
import json, re, time, uuid
from urllib.parse import unquote, urlparse, parse_qs

HOST = "https://sqjjxpxbqtwsejgjfojq.supabase.co"
CORS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*", "Content-Type": "application/json"}


def ahora_ms():
    return int(time.time() * 1000)


def iso(ms=None):
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime((ms or ahora_ms()) / 1000)) + ".000Z"


class Servidor:
    def __init__(self):
        self.usuarios = {}   # correo -> {id, clave, meta}
        self.tokens = {}     # token -> id
        self.t = {"perfiles": [], "privado": [], "pedidos": [], "pines": [], "mensajes": [], "ubicaciones": [], "reportes": []}
        self.sockets = []    # (ws, uid, filtros)
        self.errores = []
        self.seq = 0

    # ---------- utilidades ----------
    def uid(self, req):
        a = req.headers.get("authorization", "")
        return self.tokens.get(a.replace("Bearer ", ""))

    def emitir(self, tabla, tipo, fila):
        """Envía el cambio por tiempo real a quien tenga permiso de verlo (como RLS)."""
        for ws, uid, filtros in list(self.sockets):
            if not self.puede_ver(uid, tabla, fila):
                continue
            f = next((x for x in filtros if x["table"] == tabla), None)
            if not f:
                continue
            if f.get("filter"):
                col, val = f["filter"].split("=eq.")
                if str(fila.get(col)) != val:
                    continue
            msg = {"topic": "realtime:camello", "event": "postgres_changes", "ref": None,
                   "payload": {"data": {"table": tabla, "type": tipo, "record": fila, "old_record": {}}}}
            try:
                ws.send(json.dumps(msg))
            except Exception:
                pass

    def puede_ver(self, uid, tabla, fila):
        if tabla in ("perfiles", "ubicaciones"):
            return True
        if tabla == "pedidos":
            return uid in (fila["usuario_id"], fila["trabajador_id"])
        if tabla == "mensajes":
            p = next((x for x in self.t["pedidos"] if x["id"] == fila["pedido_id"]), None)
            return p and uid in (p["usuario_id"], p["trabajador_id"])
        return False

    # ---------- HTTP ----------
    async def http(self, route):
        req = route.request
        if req.method == "OPTIONS":
            return await route.fulfill(status=200, headers=CORS, body="")
        try:
            estado, cuerpo = self.atender(req)
        except Exception as e:  # error del simulador: se registra
            self.errores.append(f"{req.method} {req.url}: {e}")
            estado, cuerpo = 500, {"message": str(e)}
        await route.fulfill(status=estado, headers=CORS, body="" if cuerpo is None else json.dumps(cuerpo))

    def sesion(self, u):
        tok = "tok_" + uuid.uuid4().hex
        self.tokens[tok] = u["id"]
        return {"access_token": tok, "refresh_token": "ref_" + tok, "expires_in": 3600,
                "user": {"id": u["id"], "email": u["correo"], "user_metadata": u["meta"]}}

    def atender(self, req):
        url = urlparse(req.url)
        ruta, q = url.path, url.query
        datos = json.loads(req.post_data) if req.post_data else None
        yo = self.uid(req)

        if ruta == "/auth/v1/signup":
            if datos["email"] in self.usuarios:
                return 200, {"id": "x", "identities": []}
            u = {"id": str(uuid.uuid4()), "correo": datos["email"], "clave": datos["password"], "meta": datos.get("data", {})}
            self.usuarios[u["correo"]] = u
            return 200, self.sesion(u)
        if ruta == "/auth/v1/token":
            if "grant_type=password" in q:
                u = self.usuarios.get(datos["email"])
                if not u or u["clave"] != datos["password"]:
                    return 400, {"error_code": "invalid_credentials", "msg": "Invalid login credentials"}
                return 200, self.sesion(u)
            return 400, {"msg": "invalid refresh"}
        if ruta == "/auth/v1/logout":
            return 204, None

        m = re.match(r"/rest/v1/rpc/(\w+)", ruta)
        if m:
            if not yo:
                return 401, {"message": "JWT"}
            return self.rpc(m.group(1), datos, yo)

        m = re.match(r"/rest/v1/(\w+)", ruta)
        if not m:
            return 404, {}
        tabla = m.group(1)
        if not yo:
            return 401, {"message": "JWT"}
        filas = self.t[tabla]
        if req.method == "GET":
            vis = [f for f in filas if self.select_ok(yo, tabla, f)]
            res = self.filtrar(vis, q)
            if tabla == "pedidos" and "select=datos" in q:
                res = [{"datos": f["datos"]} for f in sorted(res, key=lambda x: x["creado"], reverse=True)]
            return 200, res
        if req.method == "POST":
            nueva = dict(datos)
            if tabla == "perfiles":
                assert nueva["id"] == yo
                nueva = {"conectado": False, "calificaciones": 0, "calificacion_suma": 0, "trabajos": 0, "actualizado": iso(), **nueva}
            if tabla == "mensajes":
                p = next(x for x in self.t["pedidos"] if x["id"] == nueva["pedido_id"])
                if not ((p["usuario_id"] == yo and nueva["rol"] == "cliente") or (p["trabajador_id"] == yo and nueva["rol"] == "trabajador")):
                    return 403, {"message": "new row violates row-level security policy"}
                self.seq += 1
                nueva = {**nueva, "id": self.seq, "creado": iso()}
            if tabla == "reportes":
                nueva = {**nueva, "autor": yo, "id": len(filas) + 1}
            clave = "maestro_id" if tabla == "ubicaciones" else "id"
            existente = next((f for f in filas if clave in nueva and f.get(clave) == nueva.get(clave)), None)
            if existente and "merge-duplicates" in req.headers.get("prefer", ""):
                existente.update(nueva)
                fila = existente
            else:
                filas.append(nueva)
                fila = nueva
            self.emitir(tabla, "INSERT", fila)
            return 201, [fila] if "return=representation" in req.headers.get("prefer", "") else None
        if req.method == "PATCH":
            for f in self.filtrar(filas, q):
                if tabla == "perfiles" and f["id"] != yo:
                    continue
                f.update(datos)
                self.emitir(tabla, "UPDATE", f)
            return 204, None
        return 405, {}

    def select_ok(self, yo, tabla, f):
        if tabla in ("perfiles", "ubicaciones"):
            return True
        if tabla in ("privado",):
            return f["id"] == yo
        if tabla == "pines":
            return f["usuario_id"] == yo
        if tabla == "reportes":
            return f["autor"] == yo
        return self.puede_ver(yo, tabla, f)

    def filtrar(self, filas, q):
        res = list(filas)
        for k, v in parse_qs(q).items():
            v = v[0]
            if k in ("select", "order", "limit", "or"):
                continue
            if v.startswith("eq."):
                res = [f for f in res if str(f.get(k)).lower() == v[3:].lower()]
            elif v.startswith("in."):
                vals = [x.strip('"') for x in v[4:-1].split(",")]
                res = [f for f in res if str(f.get(k)) in vals]
            elif v.startswith("gte."):
                res = [f for f in res if str(f.get(k, "")) >= v[4:]]
        o = parse_qs(q).get("or")
        if o:
            ids = re.findall(r'"([0-9a-f-]{36})"', o[0])
            ciudad = re.search(r"ciudad\.eq\.([a-z-]+)", o[0])
            res = [f for f in res if f.get("id") in ids or (f.get("rol") == "trabajador" and f.get("conectado") and ciudad and f.get("ciudad") == ciudad.group(1))]
        return res

    def pedido(self, pid):
        return next((x for x in self.t["pedidos"] if x["id"] == pid), None)

    def rpc(self, nombre, a, yo):
        if nombre == "crear_pedido":
            m = next((p for p in self.t["perfiles"] if p["id"] == a["p_trabajador"]), None)
            if not m or not m["conectado"] or m["actualizado"] < iso(ahora_ms() - 5 * 60000):
                return 400, {"message": "Ese maestro ya no está conectado. Elige otro."}
            d = {k: v for k, v in a["p_datos"].items() if k not in ("pin", "pago", "calificacion", "cancelado")}
            t = ahora_ms()
            d.update({"id": a["p_id"], "usuarioId": yo, "trabajadorId": a["p_trabajador"], "estado": "buscando", "real": True,
                      "creado": t, "inicio": t, "tiempos": {"buscando": t}, "pago": None, "calificacion": None, "cancelado": None})
            fila = {"id": a["p_id"], "usuario_id": yo, "trabajador_id": a["p_trabajador"], "datos": d, "creado": iso(t)}
            self.t["pedidos"].append(fila)
            self.t["pines"].append({"pedido_id": a["p_id"], "usuario_id": yo, "pin": a["p_pin"], "intentos": 0})
            self.emitir("pedidos", "INSERT", fila)
            return 200, d
        if nombre == "avanzar_pedido":
            p = self.pedido(a["p_id"])
            if not p or p["trabajador_id"] != yo:
                return 400, {"message": "Este pedido no es tuyo."}
            d = p["datos"]
            if d.get("cancelado"):
                return 400, {"message": "El cliente canceló este pedido."}
            pasos = {"aceptar": ("buscando", "aceptado"), "rechazar": ("buscando", None), "salir": ("aceptado", "en_camino"),
                     "llegar": ("en_camino", "en_proceso"), "terminar": ("en_proceso", "finalizado")}
            desde, hacia = pasos[a["p_accion"]]
            if d["estado"] != desde:
                return 400, {"message": "El pedido ya cambió. Revisa su estado."}
            if a["p_accion"] == "rechazar":
                d["cancelado"] = {"fecha": ahora_ms(), "motivo": "El maestro no pudo tomar el servicio. Elige otro maestro.", "por": "maestro"}
            else:
                if a["p_accion"] == "llegar":
                    pin = next(x for x in self.t["pines"] if x["pedido_id"] == a["p_id"])
                    if a.get("p_pin") != pin["pin"]:
                        pin["intentos"] += 1
                        return 200, {"error": f"Ese no es el código del cliente. Te quedan {5 - pin['intentos']} intentos."}
                d["estado"] = hacia
                d["tiempos"][hacia] = ahora_ms()
            self.emitir("pedidos", "UPDATE", p)
            return 200, d
        if nombre == "actualizar_pedido":
            p = self.pedido(a["p_id"])
            if not p or p["usuario_id"] != yo:
                return 400, {"message": "Este pedido no es tuyo."}
            d = p["datos"]
            acc = a["p_accion"]
            if acc == "cancelar":
                if d["estado"] not in ("buscando", "aceptado") or d.get("cancelado"):
                    return 400, {"message": "El maestro ya va en camino. Ya no se puede cancelar."}
                d["cancelado"] = {"fecha": ahora_ms(), "motivo": a["p_valor"].get("motivo", ""), "por": "cliente"}
            elif acc == "pagar":
                if d["estado"] != "finalizado" or d.get("pago"):
                    return 400, {"message": "Este pedido no está listo para pagar."}
                d["pago"] = a["p_valor"]
                m = next(x for x in self.t["perfiles"] if x["id"] == p["trabajador_id"])
                m["trabajos"] += 1
            elif acc == "calificar":
                if not d.get("pago") or d.get("calificacion"):
                    return 400, {"message": "Ya calificaste este servicio."}
                e = int(a["p_valor"]["estrellas"])
                d["calificacion"] = {**a["p_valor"], "estrellas": e, "fecha": ahora_ms()}
                m = next(x for x in self.t["perfiles"] if x["id"] == p["trabajador_id"])
                m["calificacion_suma"] += e
                m["calificaciones"] += 1
                self.emitir("perfiles", "UPDATE", m)
            self.emitir("pedidos", "UPDATE", p)
            return 200, d
        if nombre == "eliminar_mi_cuenta":
            return 200, None
        return 404, {"message": "no existe"}

    # ---------- Tiempo real ----------
    def websocket(self, ws):
        def al_mensaje(texto):
            m = json.loads(texto)
            if m["event"] == "phx_join":
                uid = self.tokens.get(m["payload"].get("access_token"))
                filtros = m["payload"]["config"]["postgres_changes"]
                self.sockets.append((ws, uid, filtros))
                ws.send(json.dumps({"topic": m["topic"], "event": "phx_reply", "ref": m["ref"], "payload": {"status": "ok", "response": {}}}))
            elif m["event"] == "heartbeat":
                ws.send(json.dumps({"topic": "phoenix", "event": "phx_reply", "ref": m["ref"], "payload": {"status": "ok"}}))
        ws.on_message(al_mensaje)
        ws.on_close(lambda *a: setattr(self, "sockets", [s for s in self.sockets if s[0] is not ws]))

    async def conectar(self, contexto):
        await contexto.route(HOST + "/**", self.http)
        await contexto.route_web_socket(re.compile(r"wss://sqjjxpxbqtwsejgjfojq\.supabase\.co/.*"), self.websocket)
