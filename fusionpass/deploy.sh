#!/usr/bin/env bash
# Build the Fusion Pass web app (Nuvio web + our phone UI) and publish it to
# https://watch.fusionpass.shop/app/ on the bridge (test address while it is being built out).
#   Usage: fusionpass/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=/root/.ssh/srvl_fleet
HOST=root@149.56.140.29
DEST=/var/www/fusionpass-web/app

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

rsync -a --delete -e "ssh -i $KEY" dist/ "$HOST:$DEST/"
ssh -o BatchMode=yes -i "$KEY" "$HOST" "rm -rf /var/www/fusionpass-web/nuvio-test; chown -R www-data:www-data $DEST"

code=$(curl -s -o /dev/null -w '%{http_code}' https://watch.fusionpass.shop/app/)
echo "https://watch.fusionpass.shop/app/ -> $code"
