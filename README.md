# Helm Chart Demo

A full-stack demo: a static NGINX front-end + a Node.js/Express back-end, packaged as a Helm chart, with GitHub Actions & local testing via **act**.

---

## 📁 Project Layout

```bash
├── chart
│   ├── Chart.yaml
│   ├── files
│   │   ├── api
│   │   │   └── index.js
│   │   └── html
│   │       ├── favicon.ico
│   │       └── index.html
│   ├── templates
│   │   ├── configmap-backend.yaml
│   │   ├── configmap-frontend.yaml
│   │   ├── deployment-backend.yaml
│   │   ├── deployment-frontend.yaml
│   │   ├── _helpers.tpl
│   │   ├── ingress.yaml
│   │   ├── service-backend.yaml
│   │   └── service-frontend.yaml
│   └── values.yaml
├── config.local
├── LICENSE
├── README.md
├── scripts
│   └── create-secret-env.sh
└── src
    └── dockerfiles
        └── express
            ├── Dockerfile.express
            ├── index.js
            └── package.json
```

---

## 🚀 What the Chart Deploys

1. **ConfigMaps**
   • `configmap-frontend` – embeds `files/html/index.html` & `favicon.ico`
   • `configmap-backend` – embeds `files/api/index.js`

2. **Deployments**
   • **frontend**
     – mounts `configmap-frontend` at `/usr/share/nginx/html`
     – serves a static web page
   • **backend**
     – mounts `configmap-backend` at `/app/index.js`
     – runs Express (image `brakmic/express:latest` by default)

3. **Services**
   • `service-frontend` (port 80 → 80)
   • `service-backend` (port `.Values.api.port` → same)

4. **Ingress**
   • Hosts both `/api/*` → backend service
   • and `/*` → frontend service

---

## 🔄 Template → Values → Runtime Data Flow

```js
┌────────────────────────────────────────────┐
│ values.yaml                                │
│  api.enabled=true                          │
│  api.port=3000                             │
│  api.path="/api"                           │
│  image.repository=nginx                    │
│  image.tag=1.21                            │
│  replicaCount=1                            │
│  ingress.host=myapp.local                  │
└────────────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────┐
│ chart/templates/                               │
│  ├─ deployment-backend.yaml                    │
│  │    env:                                     │
│  │      PORT:    "{{ .Values.api.port }}"      │
│  │      BASE_PATH:"{{ .Values.api.path }}"     │
│  │      MESSAGE: "{{ .Chart.AppVersion }}"     │
│  ├─ configmap-backend.yaml                     │
│  │    data.index.js = index.js                 │
│  ├─ deployment-frontend.yaml                   │
│  │    mounts configmap-frontend                │
│  ├─ configmap-frontend.yaml                    │
│  │    data.index.html = index.html (templated) │
│  └─ ingress.yaml                               │
│       paths: `/api` → backend, `/` → frontend  │
└────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│ Running Pods:                                        │
│  • Backend: Express reads env vars at runtime        │
│    – PORT, BASE_PATH, MESSAGE, APP_VERSION           │
│  • Frontend: static HTML + JS fetches `${BASE_PATH}` │
└──────────────────────────────────────────────────────┘
```

---

## ⚙️ Backend Image & Dockerfile

Under `src/dockerfiles/express/` you’ll find:

```bash
Dockerfile.express      # Builds an image with express, cors, morgan
index.js                # minimal API server
package.json            # depends on express, cors, morgan
```

By default the chart’s `values.yaml` points `api.image.repository: brakmic/express`.
To extend or replace:

- Add NPM packages or tools → modify `Dockerfile.express` & rebuild
- Or point `.Values.api.image.repository/tag` to your own image

---

## 🛠️ Customize the Chart

- Override any value in `values.yaml` via `--set` or custom `values-*.yaml`
- Enable/disable `api`, `html`, `ingress` sections
- Change replica count, image tags, ports, paths, etc.

---

## 📦 GitHub Actions Deployment

Workflow: `.github/workflows/deploy.yaml`

1. Checkout repo
2. Setup `kubectl` & `helm`
3. Decode `KUBE_CONFIG_DATA` → write `$HOME/.kube/config`
4. `helm lint chart`
5. `helm upgrade --install myapp chart --namespace demo-app --create-namespace`

---

## 🔄 Local GitHub Actions with act

- Install `act`

  ```bash
   curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
  ```

- Generate your secrets file:

   ```bash
   ./scripts/create-secret-env.sh
   # writes ~/.secrets.env with:
   # KUBE_CONFIG_DATA=<base64 of ~/.kube/config>
   ```

- Run the deploy job locally:

   ```bash
   act push \
     --secret-file ~/.secrets.env \
     --env-file    ~/.secrets.env \
     --job deploy
   ```

You’ll see each step run in Docker, just like on GitHub Actions.

---

## 📝 Helpers

Templates use `_helpers.tpl` to generate consistent names & labels:

```gotpl
{{ include "myapp.fullname" . }} → <release>-myapp
{{ include "myapp.labels" . }}   → app.kubernetes.io/…
```

Feel free to inspect & extend!
