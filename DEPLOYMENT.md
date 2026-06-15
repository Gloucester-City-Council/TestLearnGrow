# Deployment runbook

Step-by-step guide to deploying a new instance of the Activity Board for your organisation. Estimated time: 30–60 minutes.

---

## What you will need

- An Azure subscription
- Permission to create Azure resources (Storage Account, Static Web Apps)
- Permission to register an application in your Microsoft Entra ID tenant
- A GitHub account and this repository forked/cloned

---

## 1 — Fork and clone the repository

1. Fork `Iain-Stark-GlosCity/SWsidequests` to your own GitHub account or organisation.
2. Clone the fork locally:
   ```
   git clone https://github.com/<your-org>/swsidequests.git
   cd swsidequests
   ```

---

## 2 — Create an Azure Storage Account

1. In the [Azure portal](https://portal.azure.com), create a new **Storage account**.
   - Recommended tier: **Standard LRS** (lowest cost, no redundancy needed for this use case).
   - Choose a region close to your users.
2. Once created, go to **Data storage → Containers** and create a new container:
   - Name: `sw-sidequests` (or your chosen name — you will set this in app settings later).
   - Public access: **Private** (no anonymous access).
3. Go to **Security + networking → Access keys** and copy the **Connection string** for Key 1.
   Keep this value safe — it grants full storage access.

---

## 3 — Create an Azure Static Web Apps resource (Standard plan)

> **Important:** Custom single-tenant Entra ID authentication requires the **Standard** plan (~$9/month). The Free plan only supports pre-configured social providers.

1. In the Azure portal, search for **Static Web Apps** and create a new resource.
2. Select **Standard** pricing tier.
3. Choose **GitHub** as the deployment source and authorise Azure to access your fork.
4. Select your fork, the `main` branch, and set:
   - App location: `/Site`
   - API location: `/api`
   - Output location: *(leave blank)*
5. Azure will add a workflow file to your repository. **Delete it** — the repo already has `.github/workflows/azure-static-web-apps.yml`.

---

## 4 — Register an application in Microsoft Entra ID

1. In the [Entra admin centre](https://entra.microsoft.com), go to **App registrations → New registration**.
2. Name: `Activity Board` (or your org name).
3. Supported account types: **Accounts in this organisational directory only (single tenant)**.
4. Redirect URI:
   - Platform: **Web**
   - URI: `https://<your-swa-hostname>/.auth/login/aad/callback`
   - Replace `<your-swa-hostname>` with the hostname shown in your Static Web Apps resource (e.g. `polite-mud-0d9654803.2.azurestaticapps.net`).
5. Click **Register**.
6. Note the **Application (client) ID** — this is `AAD_CLIENT_ID`.
7. Note the **Directory (tenant) ID** — this is `TENANT_ID` (used in step 5).
8. Go to **Certificates & secrets → New client secret**. Copy the value immediately — it will not be shown again. This is `AAD_CLIENT_SECRET`.

---

## 5 — Set application settings in Static Web Apps

In the Azure portal, open your Static Web Apps resource → **Settings → Configuration** and add:

| Name | Value |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | The connection string from step 2 |
| `AZURE_STORAGE_CONTAINER` | `sw-sidequests` (or your container name) |
| `AAD_CLIENT_ID` | From step 4 |
| `AAD_CLIENT_SECRET` | From step 4 |
| `ADMIN_EMAILS` | Your email address (bootstrap first admin, comma-separated for multiple) |
| `ALLOWED_ORIGINS` | Leave blank for production; set `http://localhost:4280` for local dev only |

---

## 6 — Set your tenant ID in the static config

Edit `Site/staticwebapp.config.json` and replace `<TENANT_ID>` with the Directory (tenant) ID from step 4:

```json
"openIdIssuer": "https://login.microsoftonline.com/YOUR-TENANT-ID-HERE/v2.0"
```

Commit and push this change:

```
git add Site/staticwebapp.config.json
git commit -m "Set Entra tenant ID for <org name>"
git push
```

---

## 7 — Add the deployment secret to GitHub

1. In the Azure portal, go to your Static Web Apps resource → **Overview** and copy the **Deployment token**.
2. In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:
   - Name: the secret name shown in your Azure-generated workflow file (e.g. `AZURE_STATIC_WEB_APPS_API_TOKEN_POLITE_MUD_0D9654803`)
   - Value: the deployment token

---

## 8 — Deploy

Push to `main`. The GitHub Actions workflow will run tests and deploy automatically. Check the **Actions** tab for status.

Once deployed, browse to `https://<your-hostname>/` and sign in with a work account from your tenant. Your ADMIN_EMAILS bootstrap account will have admin access immediately.

---

## 9 — Configure your instance

Sign in as an admin and browse to `/admin.html`. Set:
- **Organisation name** — replaces "Activity Board" throughout the UI
- **Terminology** — rename item types for your context (e.g. Experiments → Tests)
- **Points** — adjust award values or disable the points system entirely
- **Admins** — add colleagues by email or Microsoft OID; your ADMIN_EMAILS bootstrap account will still work even if not listed here

---

## Local development

Install the [Azure Static Web Apps CLI](https://github.com/Azure/static-web-apps-cli):

```
npm install -g @azure/static-web-apps-cli
```

Create a local dev config:

```
cp Site/config.example.js Site/config.js
```

Edit `Site/config.js` and set `AUTH_MODE: 'mock'` for local dev without real Entra auth.

Start the local dev server:

```
swa start Site --api-location api
```

Browse to `http://localhost:4280/`. The mock sign-in page lets you switch between test accounts.

---

## What gets deployed

The Static Web App's `app_location` is `/Site`, so the app is published and served at the site root:

- `https://<site>/` — the app (board, pipeline, members, admin, …)
- `https://<site>/api/*` — the Azure Functions API

Routing, auth, and the 404 page are configured in `Site/staticwebapp.config.json`:

- `/api/*` requires an authenticated session (with `/api/config` and `/api/me` allowing anonymous).
- `/admin.html` requires an authenticated session.
- Unauthenticated requests (401) redirect to `/signin.html`.
- Unmatched paths serve `/404.html`.
