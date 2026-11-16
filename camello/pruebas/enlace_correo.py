import asyncio, json, re
from playwright.async_api import async_playwright
B="http://localhost:8765/camello/"
SIM="""const mm=window.matchMedia.bind(window);window.matchMedia=(q)=>q.includes('display-mode: standalone')?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:mm(q);"""
UID="11111111-2222-3333-4444-555555555555"
db={"perfiles":[],"privado":[]}
log=[]
async def ruta(route):
    r=route.request; u=r.url; h={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Access-Control-Allow-Methods":"*","Content-Type":"application/json"}
    if r.method=="OPTIONS": return await route.fulfill(status=200,headers=h,body="")
    log.append(r.method+" "+u.split(".co")[1][:70])
    if "/auth/v1/user" in u:
        return await route.fulfill(status=200,headers=h,body=json.dumps({"id":UID,"email":"ana@correo.com","user_metadata":{"nombre":"Ana Gómez","telefono":"300 123 4567","rol":"cliente"}}))
    m=re.search(r"/rest/v1/(\w+)",u)
    if m:
        t=m.group(1)
        if r.method=="GET": return await route.fulfill(status=200,headers=h,body=json.dumps(db.get(t,[])))
        if r.method=="POST":
            fila=json.loads(r.post_data); fila={**{"calificaciones":0,"calificacion_suma":0,"trabajos":0,"conectado":False},**fila} if t=="perfiles" else fila
            db.setdefault(t,[]).append(fila); return await route.fulfill(status=201,headers=h,body=json.dumps([fila]))
    return await route.fulfill(status=404,headers=h,body="{}")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=await b.new_context(viewport={"width":390,"height":844}); await ctx.add_init_script(SIM)
    await ctx.route("https://sqjjxpxbqtwsejgjfojq.supabase.co/**",ruta)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto(B+"#access_token=aaa.bbb.ccc&expires_at=9999999999&expires_in=3600&refresh_token=rrr&token_type=bearer&type=signup"); await pg.wait_for_timeout(2500)
    print("url:",pg.url)
    print("pantalla:",(await pg.inner_text("main"))[:80].replace("\n"," | "))
    print("aviso:",await pg.locator(".aviso").all_inner_texts())
    print("perfil creado:",db["perfiles"]); print("privado:",[{k:v for k,v in x.items() if k!='datos'} for x in db["privado"]])
    print("peticiones:",log)
    print("ERRORES:",errs)
    await b.close()
asyncio.run(main())
