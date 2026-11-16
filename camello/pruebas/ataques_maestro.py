import asyncio
from playwright.async_api import async_playwright
B="http://localhost:8765/camello/"
SIM="""const mm=window.matchMedia.bind(window);window.matchMedia=(q)=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);"""
XSS='<img src=x onerror="window.__xss=1">'
async def reg(pg,nombre,correo,maestro=False):
    await pg.goto(B); await pg.wait_for_timeout(400); await pg.click("text=Crear cuenta")
    if maestro:
        await pg.check("[name=rol][value=trabajador]",force=True); await pg.select_option("#f-oficio","cerrajero"); await pg.fill("#f-anios","5")
    await pg.fill("#f-nombre",nombre); await pg.fill("#f-correo",correo); await pg.fill("#f-telefono","3001234567")
    await pg.fill("#f-clave","Sol-desierto7"); await pg.fill("#f-clave2","Sol-desierto7"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1500)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=await b.new_context(viewport={"width":390,"height":844}); await ctx.add_init_script(SIM)
    M=await ctx.new_page(); C=await ctx.new_page(); hall=[]
    await reg(M,"Pedro Ruiz","pedro@m.com",True); await M.click(".conexion .interruptor"); await M.wait_for_timeout(500)
    # oficio inventado por consola
    r=await M.evaluate("""async()=>{const {auth}=await import('./js/services/auth.js');try{await auth.registrar({nombre:'X Y',correo:'z@z.com',telefono:'3001234567',clave:'Sol-desierto7',rol:'admin'});return 'aceptado'}catch(e){return e.message}}""")
    print("rol inventado ->",r); 
    if r=='aceptado': hall.append('rol inventado')
    await C.goto("http://localhost:8765/"); await C.evaluate("localStorage.setItem('camello:sesion','{}')")
    await reg(C,"Ana Gómez","ana@c.com")
    await C.click("[data-cat=cerrajero]"); await C.fill("textarea","Chapa dañada en la puerta"); await C.click("[data-accion=continuar]"); await C.wait_for_timeout(300)
    await C.fill("#f-direccion","Calle 5 # 38-20, San Fernando"); await C.click("[data-accion=continuar]"); await C.wait_for_timeout(300)
    await C.click("[data-accion=continuar]"); await C.wait_for_timeout(1500)
    await C.locator(".trabajador").first.click(); await C.wait_for_timeout(500); await C.click("[data-accion=elegir]"); await C.wait_for_timeout(800)
    await C.click("[data-accion=confirmar]"); await C.wait_for_timeout(2200)
    pid=C.url.split('/')[-1]
    # el cliente intenta aceptar/terminar su propio pedido haciéndose pasar por otro id
    r=await C.evaluate(f"""async()=>{{const {{pedidos}}=await import('./js/services/pedidos.js');try{{await pedidos.avanzar('{pid}','u_falso','aceptar');return 'aceptado'}}catch(e){{return e.message}}}}""")
    print("avanzar con otro maestro ->",r)
    if r=='aceptado': hall.append('avanzar ajeno')
    # cliente entra a pantalla del maestro
    await C.goto(B+f"#/maestro/pedido/{pid}"); await C.wait_for_timeout(500); print("cliente en pantalla maestro ->",C.url.split('#')[1][:12])
    if 'maestro' in C.url: hall.append('cliente ve pantalla maestro')
    # XSS por chat en ambos sentidos
    await M.wait_for_timeout(600); await M.click("[data-aceptar]"); await M.wait_for_timeout(1000)
    await M.goto(B+f"#/chat/{pid}"); await M.wait_for_timeout(400); await M.fill("#texto",XSS); await M.press("#texto","Enter"); await M.wait_for_timeout(300)
    await C.goto(B+f"#/chat/{pid}"); await C.wait_for_timeout(600)
    x=await C.evaluate("!!window.__xss")+await M.evaluate("!!window.__xss"); print("xss chat ->",x)
    if x: hall.append('xss chat')
    largo=await M.evaluate(f"""async()=>{{const {{chat}}=await import('./js/services/chat.js');chat.enviar('{pid}','a'.repeat(5000),{{rol:'trabajador'}});return chat.mensajes('{pid}').at(-1).texto.length}}""")
    print("mensaje gigante guardado con largo",largo)
    if largo>300: hall.append('mensaje sin limite')
    # tercera persona no ve el chat
    await M.evaluate("localStorage.setItem('camello:sesion','{}')")
    T=await ctx.new_page(); await reg(T,"Intruso Malo","malo@x.com")
    await T.goto(B+f"#/chat/{pid}"); await T.wait_for_timeout(500); print("intruso en chat ->",T.url.split('#')[1])
    if 'chat' in T.url: hall.append('intruso ve chat')
    # fuerza bruta del PIN
    await M.goto(B+f"#/maestro/pedido/{pid}"); await M.wait_for_timeout(500); await M.click("[data-paso=salir]"); await M.wait_for_timeout(900)
    for i in range(6):
        await M.fill("#f-pin",f"{1000+i}"); await M.click(".pin-entrada button"); await M.wait_for_timeout(600)
    print("tras 6 PIN malos ->",await M.inner_text("#e-pin"))
    if 'Demasiados' not in await M.inner_text("#e-pin"): hall.append('pin sin bloqueo')
    print("HALLAZGOS:",hall or "ninguno")
    await b.close()
asyncio.run(main())
