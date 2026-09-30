#!/usr/bin/env bash
# Build the Fusion Pass web app (Nuvio web + our phone UI) and publish it to
# https://watch.fusionpass.shop on the bridge. Also owns that nginx vhost (the earlier
# Stremio-based app that lived there is retired). Old /app/ links redirect to the root.
#   Usage: fusionpass/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=/root/.ssh/srvl_fleet
HOST=root@149.56.140.29
DEST=/var/www/fusionpass-web

# The build reads the backend URL and publishable key from local.properties.
[ -f local.properties ] || cp local.example.properties local.properties
python3 - <<'PY'
import re
props = dict(l.rstrip('\n').split('=', 1) for l in open('fusionpass/app.properties') if '=' in l and not l.startswith('#'))
s = open('local.properties').read()
for k, v in props.items():
    s = re.sub(rf'^{k}=.*$', f'{k}={v}', s, flags=re.M) if re.search(rf'^{k}=', s, re.M) else s + f'\n{k}={v}'
open('local.properties', 'w').write(s)
PY

python3 fusionpass/rebrand.py
[ -d node_modules ] || npm ci --silent --ignore-scripts
npm run build 2>&1 | grep -E "finished|ERROR"

# Cache-bust: Cloudflare and browsers keep js/css for 4 h under an unchanged URL, so stamp every
# local script and stylesheet in index.html with this build's version.
V="$(git rev-parse --short HEAD)-$(date +%s)"
V="$V" python3 - <<'PY'
import os, re
v = os.environ['V']
p = 'dist/index.html'
s = open(p, encoding='utf8').read()
def stamp(m):
    attr, url = m.group(1), m.group(2)
    if re.match(r'^(https?:)?//', url):
        return m.group(0)
    base = url.split('?', 1)[0]
    return f'{attr}="{base}?v={v}"'
s = re.sub(r'\b(src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"', stamp, s)
open(p, 'w', encoding='utf8').write(s)
PY

# Web app manifest, and a service worker that retires the Stremio app's cached worker.
cp fusionpass/manifest.webmanifest fusionpass/service-worker.js dist/

rsync -a --delete -e "ssh -i $KEY" dist/ "$HOST:$DEST/"
scp -q -i "$KEY" fusionpass/nginx-watch.conf "$HOST:/etc/nginx/sites-available/watch.fusionpass.shop"
# Owned by root and read-only to everyone else: www-data is also the dev Paymenter's php-fpm uid,
# and code running there must not be able to rewrite the JS that handles customers' sync logins
# (code review 2026-09-29, 08 L6). nginx only reads.
ssh -o BatchMode=yes -i "$KEY" "$HOST" "chown -R root:root $DEST && chmod -R u=rwX,go=rX $DEST && ln -sf /etc/nginx/sites-available/watch.fusionpass.shop /etc/nginx/sites-enabled/ && nginx -t 2>&1 | grep -v 'protocol options redefined' && systemctl reload nginx"

for u in "" app/ manifest.webmanifest service-worker.js; do
  echo "https://watch.fusionpass.shop/$u -> $(curl -s -o /dev/null -w '%{http_code}' "https://watch.fusionpass.shop/$u")"
done
