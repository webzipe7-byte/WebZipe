import asyncio, json
from playwright.async_api import async_playwright
B="http://localhost:8765/camello/"
SIMULAR="""const mm=window.matchMedia.bind(window);window.matchMedia=(q)=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);
window.__xss=0;"""
X='"><img src=x onerror="window.__xss++">'
X2="<svg onload=window.__xss++>"
X3="javascript:window.__xss++"
hallazgos=[]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=await b.new_context(viewport={"width":390,"height":844})
    await ctx.add_init_script(SIMULAR)
    pg=await ctx.new_page(); log=[]
    pg.on("pageerror",lambda e:log.append("PE "+str(e)))
    pg.on("console",lambda m: log.append(m.type+": "+m.text) if m.type in("error",) else None)
    async def xss(etapa):
      v=await pg.evaluate("window.__xss")
      if v: hallazgos.append(f"XSS ejecutado en: {etapa}")
    await pg.goto(B); await pg.wait_for_timeout(600)
    # 1. registro con nombre malicioso (debe rechazar) y nombre largo
    await pg.click("text=Crear cuenta")
    await pg.fill("#f-nombre",X); await pg.click("button[type=submit]")
    print("nombre malicioso ->",await pg.inner_text("#e-nombre"))
    largo="A"*5000
    await pg.fill("#f-nombre","Ana "+largo)
    print("largo nombre aceptado:",len(await pg.input_value("#f-nombre")))
    await pg.fill("#f-nombre","Ana Gómez"); await pg.fill("#f-correo","ana@correo.com"); await pg.fill("#f-telefono","3001234567"); await pg.fill("#f-clave","Sol-desierto7"); await pg.fill("#f-clave2","Sol-desierto7")
    await pg.click("button[type=submit]"); await pg.wait_for_timeout(1500)
    # 2. buscador
    await pg.fill("#q",X2); await pg.wait_for_timeout(300); await xss("buscador")
    # 3. lugares casa
    await pg.goto(B+"#/lugares/casa"); await pg.fill("#f-direccion",X+" Calle 5"); await pg.fill("#f-detalle",X2); await pg.click("button[type=submit]"); await pg.wait_for_timeout(900); await xss("inicio con casa maliciosa")
    await pg.goto(B+"#/lugares"); await pg.wait_for_timeout(300); await xss("lista de lugares")
    # 4. solicitud con descripción y dirección maliciosas
    await pg.evaluate("""()=>{const l=JSON.parse(localStorage.getItem('camello:usuarios'));['cerrajero','plomero','electricista','pintor','carpintero','limpieza','electrodomesticos'].forEach((c,i)=>l.push({id:'u_maestro'+i,nombre:'Maestro Prueba',correo:'m'+i+'@x.com',telefono:'300 000 0000',claveHash:'x',rol:'trabajador',maestro:{categoria:c,anios:5,conectado:true}}));localStorage.setItem('camello:usuarios',JSON.stringify(l))}""")
    await pg.goto(B+"#/inicio"); await pg.wait_for_timeout(500)
    await pg.click("[data-cat=plomero]"); await pg.fill("textarea",X2+X); await pg.click("[data-accion=continuar]"); await pg.wait_for_timeout(300); await xss("paso 2")
    await pg.click("[data-accion=continuar]"); await pg.click("[data-accion=continuar]"); await pg.wait_for_timeout(1300); await xss("lista maestros")
    await pg.click(".trabajador >> nth=0"); await pg.wait_for_timeout(500); await pg.click("[data-accion=elegir]"); await pg.wait_for_timeout(600); await xss("confirmar")
    # doble clic en confirmar
    await pg.dblclick("[data-accion=confirmar]"); await pg.wait_for_timeout(1500)
    n=await pg.evaluate("JSON.parse(localStorage.getItem('camello:pedidos')).length")
    if n!=1: hallazgos.append(f"Doble envío creó {n} pedidos")
    await xss("seguimiento")
    # 5. chat
    # el maestro de prueba acepta el pedido
    await pg.evaluate("""()=>{const l=JSON.parse(localStorage.getItem('camello:pedidos'));l[0].estado='aceptado';localStorage.setItem('camello:pedidos',JSON.stringify(l));dispatchEvent(new CustomEvent('camello:cambio',{detail:'pedidos'}))}""")
    await pg.wait_for_timeout(1500)
    await pg.click("[data-accion=chat]"); await pg.fill("#texto",X); await pg.press("#texto","Enter"); await pg.wait_for_timeout(2500); await xss("chat")
    await pg.fill("#texto","x"*20000); print("chat largo:",len(await pg.input_value("#texto")))
    # 6. contactos
    await pg.goto(B+"#/seguridad"); await pg.fill("#f-nombre",X); await pg.fill("#f-telefono","3001112222"); await pg.click(".agregar-contacto button[type=submit]"); await pg.wait_for_timeout(300)
    print("contacto malicioso ->",await pg.inner_text("[data-campo=nombre] .campo-error"))
    # 7. cupón
    await pg.goto(B+"#/cupones"); await pg.fill("#f-codigo",X2); await pg.click("form button"); await pg.wait_for_timeout(800); await xss("cupón")
    # 8. tarjeta con titular malicioso
    await pg.goto(B+"#/billetera/agregar"); await pg.fill("#f-numero","4242424242424242"); await pg.fill("#f-vence","1230"); await pg.fill("#f-cvv","123"); await pg.fill("#f-titular",X)
    await pg.click("button[type=submit]"); await pg.wait_for_timeout(1500); await xss("billetera")
    cvv=await pg.evaluate("localStorage.getItem('camello:usuarios')")
    if "4242424242424242" in cvv: hallazgos.append("Número completo de tarjeta guardado")
    if '"123"' in cvv: hallazgos.append("Posible CVV guardado")
    # 9. rutas maliciosas
    for r in ["#/pedido/"+X, "#/trabajador/"+X, "#/solicitud/"+X, "#/chat/"+X, "#/recibo/"+X, "#/lugares/"+X, "#/pagar/"+X, "#/calificar/"+X, "#/"+X3]:
      await pg.goto(B+r); await pg.wait_for_timeout(500); await xss("ruta "+r[:20])
    # 10. perfil nombre
    await pg.goto(B+"#/perfil"); await pg.fill("#f-nombre",X); await pg.click("#formDatos button[type=submit]"); await pg.wait_for_timeout(300)
    print("perfil malicioso ->",await pg.inner_text("[data-campo=nombre] .campo-error"))
    # 11. datos manipulados en almacenamiento
    casos={"usuarios no es lista":("camello:usuarios",'{"a":1}'),"pedidos no es lista":("camello:pedidos",'"hola"'),"JSON roto":("camello:pedidos","{roto"),
           "sesion basura":("camello:sesion",'{"usuarioId":"x","vence":99999999999999}'),"borrador raro":("camello:borrador",'{"categoria":"plomero","paso":99,"direccion":5,"cuando":"x"}')}
    for nombre,(k,v) in casos.items():
      respaldo=await pg.evaluate(f"localStorage.getItem('{k}')")
      log.clear()
      await pg.evaluate(f"localStorage.setItem({json.dumps(k)},{json.dumps(v)})")
      for r in ["#/inicio","#/pedidos","#/billetera","#/cuenta","#/solicitud/plomero","#/trabajadores","#/confirmar"]:
        await pg.goto(B+r); await pg.wait_for_timeout(400)
      txt=(await pg.inner_text("body")).strip()
      if [l for l in log if l.startswith("PE")] or not txt: hallazgos.append(f"Se rompe con {nombre}: {[l for l in log if l.startswith('PE')][:2]}")
      if respaldo is None: await pg.evaluate(f"localStorage.removeItem({json.dumps(k)})")
      else: await pg.evaluate(f"localStorage.setItem({json.dumps(k)},{json.dumps(respaldo)})")
    # 12. manipulación del precio desde el almacenamiento
    await pg.goto(B+"#/inicio"); await pg.wait_for_timeout(400)
    await pg.click("[data-cat=cerrajero]"); await pg.fill("textarea","Se dañó la chapa"); await pg.click("[data-accion=continuar]")
    await pg.click("[data-accion=continuar]"); await pg.click("[data-accion=continuar]"); await pg.wait_for_timeout(1300)
    await pg.click(".trabajador >> nth=0"); await pg.wait_for_timeout(500); await pg.click("[data-accion=elegir]"); await pg.wait_for_timeout(600)
    await pg.evaluate("const b=JSON.parse(localStorage.getItem('camello:borrador'));b.oferta=1000;b.cupon='HOGAR5000';localStorage.setItem('camello:borrador',JSON.stringify(b))")
    await pg.reload(); await pg.wait_for_timeout(900)
    total=await pg.inner_text(".desglose .total dd")
    print("total tras manipular oferta y cupón:",total)
    if "1.000" in total or "HOGAR5000" in await pg.inner_text(".desglose"): hallazgos.append("Precio manipulable desde el almacenamiento: "+total)
    # 13. nombre largo debe rechazarse
    await pg.goto(B+"#/perfil"); await pg.fill("#f-nombre","Ana "+"b"*200)
    print("largo en perfil:",len(await pg.input_value("#f-nombre")))
    # 14. manipulación de precio (cliente) — informativo
    await pg.goto(B+"#/inicio"); await pg.wait_for_timeout(400)
    print("CSP meta:", await pg.evaluate("!!document.querySelector('meta[http-equiv=Content-Security-Policy]')"))
    print("\nHALLAZGOS:"); [print(" -",h) for h in hallazgos] or print(" ninguno")
    print("errores finales:",[l for l in log][:5])
    await b.close()
asyncio.run(main())
