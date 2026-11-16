import asyncio, json, re, time
from playwright.async_api import async_playwright
B="http://localhost:8765/camello/"
SIM="""const mm=window.matchMedia.bind(window);window.matchMedia=(q)=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);"""
U="11111111-2222-3333-4444-555555555555"; M="99999999-2222-3333-4444-555555555555"
now=int(time.time()*1000)
ped={"id":"p_test1","numero":"123456","usuarioId":U,"trabajadorId":M,"categoria":"cerrajero","descripcion":"Chapa dañada","direccion":{"texto":"Calle 5 # 38-20","detalle":""},"cuando":{"tipo":"urgente"},"minutosLlegada":12,"precio":{"visita":25000,"manoObra":70000,"recargo":0,"sugerido":95000,"oferta":None,"cupon":None,"descuento":0,"total":95000},"metodoPago":"efectivo","metodoNombre":"Efectivo","metodoTipo":"efectivo","estado":"aceptado","real":True,"creado":now,"inicio":now,"tiempos":{"buscando":now,"aceptado":now},"pago":None,"calificacion":None,"cancelado":None}
db={"perfiles":[{"id":U,"nombre":"Ana Gómez","rol":"cliente","conectado":False,"calificaciones":0,"calificacion_suma":0,"trabajos":0},{"id":M,"nombre":"Carlos Rendón","rol":"trabajador","categoria":"cerrajero","anios":8,"conectado":True,"calificaciones":0,"calificacion_suma":0,"trabajos":0}],"privado":[{"id":U,"telefono":"300","datos":{}}],"pedidos":[{"datos":ped}],"pines":[{"pedido_id":"p_test1","pin":"4821"}]}
async def ruta(route):
    r=route.request; u=r.url; h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Access-Control-Allow-Methods":"*","Content-Type":"application/json"}
    if r.method=="OPTIONS": return await route.fulfill(status=200,headers=h,body="")
    if "/rpc/actualizar_pedido" in u:
        ped["cancelado"]={"fecha":now,"motivo":"Cancelaste este servicio.","por":"cliente"}
        return await route.fulfill(status=200,headers=h,body=json.dumps(ped))
    m=re.search(r"/rest/v1/(\w+)\?(.*)",u)
    if m:
        t,q=m.group(1),m.group(2)
        rows=db.get(t,[])
        idm=re.search(r"id=eq\.([0-9a-f-]+)",q)
        if idm: rows=[x for x in rows if x.get("id")==idm.group(1)]
        return await route.fulfill(status=200,headers=h,body=json.dumps(rows))
    return await route.fulfill(status=200,headers=h,body="[]")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=await b.new_context(viewport={"width":390,"height":844}); await ctx.add_init_script(SIM)
    await ctx.route("https://sqjjxpxbqtwsejgjfojq.supabase.co/**",ruta)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto("http://localhost:8765/")
    await pg.evaluate("s=>localStorage.setItem('camello:nube',s)", json.dumps({"access_token":"a","refresh_token":"r","expires_at":9999999999,"user":{"id":U,"email":"ana@correo.com","meta":{}}}))
    await pg.goto(B+"#/pedido/p_test1"); await pg.wait_for_timeout(2500)
    print("titulo:",await pg.inner_text("#cuerpo h1"))
    btn=pg.locator("#pie [data-accion=cancelar]")
    print("botón en barra fija:",await btn.count(), "| visible sin bajar:", await btn.is_visible(), await btn.bounding_box())
    await pg.screenshot(path="/home/claude/cancelar.png")
    await btn.click(); await pg.wait_for_timeout(400); await pg.click("[data-si]"); await pg.wait_for_timeout(1500)
    print("después:",await pg.inner_text("#cuerpo h1"), "| pie:", await pg.inner_text("#pie"))
    print("ERRORES:",errs)
    await b.close()
asyncio.run(main())
