import asyncio, json
from playwright.async_api import async_playwright
B="http://localhost:8765/camello/"
SIM="""const mm=window.matchMedia.bind(window);window.matchMedia=(q)=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);"""
modo={"signup":"confirmar","token":"noconf"}
async def ruta(route):
    u=route.request.url; h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Access-Control-Allow-Methods":"*","Content-Type":"application/json"}
    if route.request.method=="OPTIONS": return await route.fulfill(status=200,headers=h,body="")
    if "/auth/v1/signup" in u:
        body={"id":"x","email":"a@b.com","identities":[] if modo["signup"]=="existe" else [{"id":"1"}]}
        return await route.fulfill(status=200,headers=h,body=json.dumps(body))
    if "/auth/v1/token" in u:
        return await route.fulfill(status=400,headers=h,body=json.dumps({"code":400,"error_code":"email_not_confirmed","msg":"Email not confirmed"}))
    if "/auth/v1/resend" in u: return await route.fulfill(status=200,headers=h,body="{}")
    return await route.fulfill(status=404,headers=h,body="{}")
async def reg(pg,correo):
    await pg.goto(B+"#/registro"); await pg.wait_for_timeout(500)
    await pg.fill("#f-nombre","Ana Gómez"); await pg.fill("#f-correo",correo); await pg.fill("#f-telefono","3001234567")
    await pg.fill("#f-clave","Sol-desierto7"); await pg.fill("#f-clave2","Sol-desierto7"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1200)
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=await b.new_context(viewport={"width":390,"height":844}); await ctx.add_init_script(SIM)
    await ctx.route("https://sqjjxpxbqtwsejgjfojq.supabase.co/**",ruta)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await reg(pg,"ana@correo.com"); print("1 registro nuevo ->", (await pg.inner_text("main"))[:90].replace("\n"," | "))
    await pg.click("[data-accion=reenviar]"); await pg.wait_for_timeout(600); print("  reenviar ->", await pg.locator(".aviso, [role=status]").all_inner_texts())
    await pg.click("[data-accion=ya]"); await pg.wait_for_timeout(500); print("  ya confirmé -> correo puesto:", await pg.input_value("#f-correo"))
    await pg.fill("#f-clave","Sol-desierto7"); await pg.click("button[type=submit]"); await pg.wait_for_timeout(1000)
    print("2 entrar sin confirmar ->", (await pg.inner_text("main"))[:40].replace("\n"," | "))
    modo["signup"]="existe"; await reg(pg,"ana@correo.com"); print("3 correo ya registrado ->", await pg.inner_text("#e-correo"))
    pg=await ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e))); await pg.goto(B+"#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid"); await pg.wait_for_timeout(1500)
    print("4 enlace vencido ->", await pg.locator(".aviso, [role=status], [role=alert]").all_inner_texts(), "| url:", pg.url)
    print("ERRORES:",errs)
    await b.close()
asyncio.run(main())
