from playwright.sync_api import sync_playwright
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = os.environ.get('BASE_URL', 'http://localhost:5173/')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROME_PATH', '/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
    page=b.new_page(viewport={'width':1440,'height':1080},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE_URL,wait_until='networkidle')
    page.get_by_role('button',name='Pauzeer').click()
    page.get_by_label('Tijdstip',exact=True).fill('15.5')
    multi=page.locator('.multi')
    multi.scroll_into_view_if_needed()
    page.evaluate('document.querySelector(".demo").scrollTop = document.querySelector(".multi").offsetTop - 16')
    page.screenshot(path=str(ROOT / 'out/dashboard-multi.png'))
    page.get_by_role('button',name='Bekijk Metaalbewerking',exact=True).click()
    assert page.get_by_label('Bedrijf warmte en koude').input_value()=='0'
    before=page.locator('.carrier-grid').inner_text()
    page.get_by_text('Warmtenet actief',exact=True).click()
    after=page.locator('.carrier-grid').inner_text()
    assert before!=after
    assert '0 kWth nuttig geleverd' in after
    page.get_by_text('Warmtenet actief',exact=True).click()
    assert page.locator('.carrier-grid').inner_text()==before
    page.get_by_label('Warmtepomp-COP',exact=True).fill('2')
    assert page.locator('.carrier-grid').inner_text()!=before
    page.get_by_label('Warmtepomp-COP',exact=True).fill('4')
    page.get_by_label('Warmtebuffer',exact=True).fill('0')
    assert '0 / 0 kWhth' in page.locator('.carrier-grid').inner_text()
    page.get_by_label('Warmtebuffer',exact=True).fill('600')
    page.get_by_role('link',name='Facturatie',exact=True).click()
    page.get_by_text('Eén factuur voor het terrein.',exact=False).wait_for(state='visible')
    assert page.locator('table tbody tr').count()==8
    page.get_by_role('link',name='Plattegrond',exact=True).click()
    page.locator('canvas').wait_for(state='visible')
    page.get_by_role('tab',name='Met Energy Hub',exact=True).click()
    marker=page.locator('.marker').filter(has_text='Warmtepomp en warmtebuffer')
    marker.wait_for(state='visible')
    point=marker.evaluate('(el) => ({x: parseFloat(el.style.left), y: parseFloat(el.style.top)})')
    page.mouse.move(point['x'], point['y'])
    page.locator('.card').get_by_text('Illustratieve modeltijd',exact=True).wait_for(state='visible')
    assert 'kWhth' in page.locator('.card').inner_text()
    page.get_by_role('link',name='Demo dashboard',exact=True).click()
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate('document.querySelector(".demo").scrollTop = document.querySelector(".multi").offsetTop - 16')
    page.screenshot(path=str(ROOT / 'out/dashboard-mobile.png'))
    assert page.evaluate('document.querySelector(".demo").scrollWidth <= document.querySelector(".demo").clientWidth')
    print({'warmtenet_toggle':'ok','COP':'ok','buffer':'ok','facturatie':'ok','plattegrond':'ok','mobile':'ok','page_errors':errors})
    assert not errors
    b.close()
