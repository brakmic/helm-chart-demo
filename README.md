# Helm Chart Demo

A simple demo that includes:

- a static NGINX frontend
- a Node.js/Express backend
- GitHub Actions CI/CD with local testing via **act**  
- everything packaged as a Helm chart

---

## 📑 Table of Contents

- [Helm Chart Demo](#helm-chart-demo)
  - [📑 Table of Contents](#-table-of-contents)
  - [📁 Project Layout](#-project-layout)
  - [🚀 What the Chart Deploys](#-what-the-chart-deploys)
  - [🔄 Template → Values → Runtime Data Flow](#-template--values--runtime-data-flow)
  - [⚙️ Backend Image \& Dockerfile](#️-backend-image--dockerfile)
  - [🛠️ Customize the Chart](#️-customize-the-chart)
  - [📌 Installing with Helm](#-installing-with-helm)
  - [📦 GitHub Actions Deployment](#-github-actions-deployment)
  - [🔄 Local GitHub Actions with act](#-local-github-actions-with-act)
  - [📝 Helpers](#-helpers)
  - [LICENSE](#license)

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
     – runs Express

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

## 📌 Installing with Helm

You can install or upgrade the chart directly with Helm:

```bash
helm upgrade --install myapp chart --namespace demo-app --create-namespace
```

Example output:

```bash
$ helm upgrade --install myapp chart --namespace demo-app --create-namespace
Release "myapp" does not exist. Installing it now.
NAME: myapp
LAST DEPLOYED: Sun May  4 18:26:48 2025
NAMESPACE: demo-app
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

What this does:

- `upgrade --install`: creates the release if it doesn’t exist, or upgrades it if it does
- `myapp`: the release name
- `chart`: path to your chart
- `--namespace demo-app`: target namespace
- `--create-namespace`: creates `demo-app` if missing

Once deployed, you can:

- `kubectl get all -n demo-app` to see pods, services, etc.
- `kubectl port-forward svc/myapp 8080:80 -n demo-app` and browse `http://localhost:8080`
- Test the API: `curl http://localhost:8080/api/healthz`

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

## LICENSE

[MIT](./LICENSE)
