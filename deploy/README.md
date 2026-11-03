# Hosting it on a server

Putting the app on the internet, so phones can use it away from home: an
Ubuntu server (written for Hetzner Cloud; any Ubuntu VPS works the same) with
nginx in front, the API as a systemd service, and a release layout that keeps
the last five versions to roll back to.

Below, `<server-ip>` is your server's address and `pokedex.example.com` your
domain: put in your own. `pnpm deploy:server` reads them from `.env` on your
computer:

```bash
DEPLOY_HOST=<server-ip>
DEPLOY_SITE=https://pokedex.example.com
DEPLOY_SSH_KEY=~/.ssh/hetzner_deploy_key   # only if `ssh deploy@<server-ip>` needs a key
```

The lock is the app's own login: one shared username and password, checked by
the API. Every data request needs the session cookie, and wrong passwords
lock an address out for 15 minutes after 5 tries. nginx is the front door:
it serves the app over HTTPS and passes `/api` to the service, which only
listens on the server itself.

```
Phone / tablet ──https──▶ nginx  pokedex.example.com   (Let's Encrypt)
                            ├── /       /var/www/pokedex-tcg/current/dist      (the built app)
                            └── /api/   127.0.0.1:3002  systemd "pokedex-tcg"  (Node 22, app login)
                                          └── /var/www/pokedex-tcg/shared/data/pokedex-tcg.sqlite
```

```
/var/www/pokedex-tcg/
├── releases/<timestamp>/   dist/, dist-server/ (bundled API + db tool), db/ (SQL)
├── current -> releases/<newest>
└── shared/
    ├── .env                API_PORT, DATA_DIR, the app login (AUTH_*)
    └── data/
        ├── pokedex-tcg.sqlite the real data (never inside a release)
        ├── catalog/        the card scans and set images from the catalogue pull (~2.5–3 GB)
        └── backups/        nightly copies + one before every deploy
```

The one-time setup (parts 1–7) takes about 30 minutes. After that, every
update is `pnpm deploy:server` from your computer.

Run the server commands as the `deploy` user (`ssh deploy@<server-ip>`),
with `sudo` only where it's written. The deploy logs in as `deploy`, so it
must own everything under `/var/www/pokedex-tcg`, `shared/.env` included.

---

## 1. DNS

At the domain's registrar, add an A record for `pokedex.example.com`
pointing at `<server-ip>` (TTL 300). Check it (allow 5–30 minutes):

```bash
dig +short pokedex.example.com   # <server-ip>
```

## 2. Node 22

The server guide installs Node 20 for everything. This app needs Node 22.13+
(its database uses Node's built-in `node:sqlite`), so it runs on its own copy
in `/opt/node22`. Another app from the same starter may already have put it
there: if `/opt/node22/bin/node --version` prints v22, skip to part 3.

```bash
ssh deploy@<server-ip>

uname -m   # x86_64 (CX servers); on ARM (CAX) use linux-arm64 below

cd /tmp
NODE_TARBALL=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/ \
  | grep -o 'node-v22[0-9.]*-linux-x64.tar.xz' | head -1)
curl -fsSLO "https://nodejs.org/dist/latest-v22.x/$NODE_TARBALL"
sudo mkdir -p /opt/node22
sudo tar -xJf "$NODE_TARBALL" -C /opt/node22 --strip-components=1
rm "$NODE_TARBALL"

/opt/node22/bin/node --version                                     # v22.x
/opt/node22/bin/node -e "require('node:sqlite'); console.log('sqlite ok')"
node --version                                                     # the system Node, unchanged
```

## 3. Folders and settings

```bash
sudo mkdir -p /var/www/pokedex-tcg/releases /var/www/pokedex-tcg/shared/data
sudo chown -R deploy:deploy /var/www/pokedex-tcg

cat > /var/www/pokedex-tcg/shared/.env <<'EOF'
API_PORT=3002
DATA_DIR=/var/www/pokedex-tcg/shared/data
EOF
```

Port 3002 must be free, and it must match `proxy_pass` in `deploy/nginx.conf`
and `API_PORT` in `deploy/deploy.sh`. Check that nothing else uses it:

```bash
sudo ss -tlnp | grep 3002   # no output = free
```

If it's taken, pick another and change it in all three places.

### The app's login

Choose the username and password. On the Mac, in the project folder:

```bash
pnpm auth:login
```

It asks for a username and the password twice (the password stays hidden
while typed), then prints three lines: the username, a hash of the password
(never the password itself) and a session secret. Add them to the server's
settings:

```bash
nano /var/www/pokedex-tcg/shared/.env   # paste the three AUTH_ lines at the end
chmod 600 /var/www/pokedex-tcg/shared/.env
ls -l /var/www/pokedex-tcg/shared/.env  # -rw------- 1 deploy deploy
```

Without them the API refuses everything, and the deploy says so.

## 4. The service

From the Mac, in the project folder, copy the unit files up:

```bash
scp deploy/pokedex-tcg.service deploy/pokedex-tcg-backup.service deploy/pokedex-tcg-backup.timer \
  deploy@<server-ip>:/tmp/
```

On the server:

```bash
sudo mv /tmp/pokedex-tcg.service /tmp/pokedex-tcg-backup.service /tmp/pokedex-tcg-backup.timer \
  /etc/systemd/system/
sudo chown root:root /etc/systemd/system/pokedex-tcg*
sudo systemctl daemon-reload
sudo systemctl enable pokedex-tcg        # don't start it yet: nothing is deployed
```

Let the deploy script restart the service without a password. Run
`sudo visudo` and add this line at the end:

```
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart pokedex-tcg, /usr/bin/systemctl status pokedex-tcg
```

## 5. nginx and HTTPS (required)

This is what puts the app on the internet. The service from part 4 only
listens on the server itself; nginx serves the app at `pokedex.example.com`
and passes `/api` through to it. Until this is done, the address shows
nginx's welcome page or another site on the server (possibly that site's
password prompt), never the app. HTTPS matters too: the login's password and
session cookie must not travel in plain text.

nginx, certbot and the firewall come with the server setup guide. Check they
are there:

```bash
nginx -v && certbot --version
sudo ufw status            # 80 and 443 allowed (or "Nginx Full")
```

If not: `sudo apt install nginx certbot python3-certbot-nginx -y`, then
`sudo ufw allow 80/tcp && sudo ufw allow 443/tcp`.

From the Mac, copy the site config up:

```bash
scp deploy/nginx.conf deploy@<server-ip>:/tmp/pokedex-tcg.nginx
```

On the server:

```bash
sudo nano /tmp/pokedex-tcg.nginx   # server_name: your domain instead of pokedex.example.com
sudo mv /tmp/pokedex-tcg.nginx /etc/nginx/sites-available/pokedex-tcg
sudo chown root:root /etc/nginx/sites-available/pokedex-tcg
sudo ln -s /etc/nginx/sites-available/pokedex-tcg /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d pokedex.example.com   # also redirects http to https
```

## 6. Nightly backups

```bash
sudo systemctl enable --now pokedex-tcg-backup.timer
systemctl list-timers pokedex-tcg-backup.timer   # next run: 03:30
```

Copies older than 30 days are deleted. To keep copies off the server too,
pull them to the Mac now and then:

```bash
mkdir -p ~/backups/hetzner/pokedex-tcg
rsync -az deploy@<server-ip>:/var/www/pokedex-tcg/shared/data/backups/ ~/backups/hetzner/pokedex-tcg/
```

## 7. First deploy

The build ships the Pokémon artwork, so download it first if you haven't
(`public/pokemon/`, once), and check that `DEPLOY_HOST` and `DEPLOY_SITE` are
in `.env` (top of this page):

```bash
pnpm pokemon:art
pnpm deploy:server
```

The deploy lints and builds, uploads a release, backs up the database,
applies any new migrations, switches `current`, restarts the service and
checks that the API answers. The first deploy creates an empty database.

Already logged real data on the Mac? Move it up once, before the first
deploy:

```bash
# On the Mac: stop `pnpm dev` first, so nothing writes while copying.
pnpm db:backup                    # prints data/backups/pokedex-tcg-<stamp>.sqlite
scp data/backups/pokedex-tcg-<stamp>.sqlite \
  deploy@<server-ip>:/var/www/pokedex-tcg/shared/data/pokedex-tcg.sqlite
```

From now on the server holds the real data. The Mac's `data/` is only a
development copy. Never run `seed` or `reset` on the server.

Then pull the card catalogue onto the server, once. It takes about an hour
and 2.5–3 GB, so run it inside `tmux` (or `screen`) in case the SSH
connection drops; a second run picks up where it stopped:

```bash
ssh deploy@<server-ip>
tmux
cd /var/www/pokedex-tcg/current
set -a; . /var/www/pokedex-tcg/shared/.env; set +a   # not ../: current is a symlink
/opt/node22/bin/node --disable-warning=ExperimentalWarning dist-server/cli.mjs catalog
```

A database copied up from the Mac brings its catalogue rows with it; the
pull then only fetches the scans and logos.

## 8. Check it

1. Open `https://pokedex.example.com` on the phone.
2. The app's login screen: log in with the username and password from
   part 3. The session lasts 30 days and renews while the device is in use.
   Safari offers to save the password.
3. Safari → Share → **Add to Home Screen**.

---

## Everyday

| What                   | How                                                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Deploy a new version   | `pnpm deploy:server` (with `DEPLOY_SSH_KEY` in `.env` if `ssh deploy@<server-ip>` needs a key)                                                                                                                                             |
| Logs                   | `sudo journalctl -u pokedex-tcg -f`                                                                                                                                                                                                        |
| Status                 | `sudo systemctl status pokedex-tcg`                                                                                                                                                                                                        |
| Releases               | `ls -la /var/www/pokedex-tcg/releases/` (the newest 5 are kept)                                                                                                                                                                            |
| Back up now            | `sudo systemctl start pokedex-tcg-backup`                                                                                                                                                                                                  |
| New cards released     | The catalogue pull from part 7 again: it only fetches what's missing                                                                                                                                                                       |
| Change the app's login | `set -a; . /var/www/pokedex-tcg/shared/.env; set +a; /opt/node22/bin/node /var/www/pokedex-tcg/current/dist-server/cli.mjs login /var/www/pokedex-tcg/shared/.env`, then `sudo systemctl restart pokedex-tcg`. Every device logs in again. |

### Roll back a release

```bash
ln -snf /var/www/pokedex-tcg/releases/<older> /var/www/pokedex-tcg/current
sudo systemctl restart pokedex-tcg
```

Migrations only move forward. If the release you're leaving added one,
restore the database copy that deploy made (below) as well.

### Restore a database copy

```bash
sudo systemctl stop pokedex-tcg
cd /var/www/pokedex-tcg/shared/data
cp pokedex-tcg.sqlite pokedex-tcg-before-restore.sqlite
cp backups/pokedex-tcg-<stamp>.sqlite pokedex-tcg.sqlite
rm -f pokedex-tcg.sqlite-wal pokedex-tcg.sqlite-shm
sudo systemctl start pokedex-tcg
```

### Troubleshooting

| What you see                                                    | Why, and what to do                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A browser password prompt, another site, or "Welcome to nginx!" | nginx has no site for this address yet: do part 5. (The app's login is a page in the app, never a browser prompt.)                                                                                                                        |
| 502 Bad Gateway                                                 | nginx is fine, but the API isn't answering on the port in `proxy_pass`: check `sudo systemctl status pokedex-tcg` and that the port matches `API_PORT` in `shared/.env`.                                                                  |
| "Login isn't set up yet"                                        | The `AUTH_` lines are missing from `shared/.env` (part 3); add them and `sudo systemctl restart pokedex-tcg`.                                                                                                                             |
| certbot fails                                                   | DNS doesn't point at this server yet (`dig +short pokedex.example.com`), or port 80 is closed in the firewall.                                                                                                                            |
| `shared/.env: Permission denied` from `pnpm deploy:server`      | The file belongs to another user, usually root (written while logged in as root). Give it to `deploy`: `sudo chown deploy:deploy /var/www/pokedex-tcg/shared/.env && sudo chmod 600 /var/www/pokedex-tcg/shared/.env`, then deploy again. |
| A change to `deploy/nginx.conf`                                 | `pnpm deploy:server` doesn't ship it, and certbot has added HTTPS to the server's copy. Make the same change in `/etc/nginx/sites-available/pokedex-tcg` (`sudo nano`), then `sudo nginx -t && sudo systemctl reload nginx`.              |

### Work on a copy of the real data locally

```bash
# With `pnpm dev` stopped:
scp deploy@<server-ip>:/var/www/pokedex-tcg/shared/data/backups/pokedex-tcg-<stamp>.sqlite data/pokedex-tcg.sqlite
rm -f data/pokedex-tcg.sqlite-wal data/pokedex-tcg.sqlite-shm
```
