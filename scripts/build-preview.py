"""Gera um HTML único (CSS, JS e fontes embutidos) a partir do build estático.
Uso: PUBLIC_DEMO_MODE=true PUBLIC_APP_ENV=preview npm run build && python3 scripts/build-preview.py <saida.html>
Serve para prévias sem servidor; o cadastro fica em modo demonstração."""
import re, sys, base64

root = '.vercel/output/static'
html = open(root + '/index.html').read()

def font(m):
    return 'url(data:font/woff2;base64,%s)' % base64.b64encode(open(root + m.group(1), 'rb').read()).decode()

def inline_css(m):
    css = open(root + m.group(1)).read()
    css = re.sub(r'@font-face\{[^}]*?(latin-ext|vietnamese)[^}]*\}', '', css)
    css = re.sub(r'url\((/_astro/[^)]+\.woff2)\)', font, css)
    return '<style>%s</style>' % css

html = re.sub(r'<link rel="stylesheet" href="(/_astro/[^"]+\.css)"\s*/?>', inline_css, html)
html = re.sub(r'<script type="module" src="(/_astro/[^"]+\.js)"></script>',
              lambda m: '<script type="module">%s</script>' % open(root + m.group(1)).read(), html)
html = re.sub(r'<link rel="(icon|apple-touch-icon|sitemap|canonical)"[^>]*>', '', html)
head = re.search(r'<head>(.*)</head>', html, re.S).group(1)
body = re.search(r'<body[^>]*>(.*)</body>', html, re.S).group(1)
head = re.sub(r'<meta charset="utf-8"\s*/?>|<meta name="viewport"[^>]*>|<title>.*?</title>', '', head)
open(sys.argv[1], 'w').write('<title>PetVila Club Landing Page</title>\n' + head + '\n' + body)
