# Railway Deployment Guide

This guide will walk you through deploying the Healthcare Appointment Manager to [Railway.app](https://railway.app/). Railway is a modern hosting platform that makes it incredibly easy to deploy applications directly from GitHub without needing extensive DevOps knowledge.

## Prerequisites
1. **GitHub Account**: Your code must be pushed to a GitHub repository.
2. **Railway Account**: Sign up at [railway.app](https://railway.app/) using your GitHub account.

---

## Step 1: Create a Railway Project
1. Log in to your Railway dashboard.
2. Click the **"New Project"** button.
3. Select **"Deploy from GitHub repo"**.
4. Choose the repository containing this codebase.
5. Railway will automatically detect the code and create a service. However, since we have a monorepo (both frontend and backend in one repository), we will configure this manually in the next steps. Close the default deployment prompt if it asks to deploy immediately.

---

## Step 2: Add a PostgreSQL Database
1. In your new Railway project dashboard, click the **"Create"** button (or `+ New`).
2. Select **"Database"** -> **"Add PostgreSQL"**.
3. Wait a few seconds for the database to provision. 
4. Railway will automatically generate credentials for this database (including a `DATABASE_URL`).

---

## Step 3: Deploy the Backend Service
Since both the backend and frontend are in the same repository, we need to create two separate services in Railway that point to the same GitHub repo but different folders.

1. Click **"New"** -> **"GitHub Repo"** and select your repository again.
2. This creates a new service card. Click on it.
3. Go to the **"Settings"** tab for this service.
4. Scroll down to **"Root Directory"** and type `/backend`. Press Enter to save.
5. Under **"Build Command"**, type `npm install`.
6. Under **"Start Command"**, type `npm start`. *(This will run `init-db.js` followed by `index.js`, automatically creating your database tables!)*
7. Scroll up and rename the service to `Healthcare Backend` for clarity.

---

## Step 4: Deploy the Frontend Service
1. Click **"New"** -> **"GitHub Repo"** and select your repository *again*.
2. Click on the new service card.
3. Go to the **"Settings"** tab.
4. Set the **"Root Directory"** to `/frontend`.
5. Under **"Build Command"**, type `npm install && npm run build`.
6. Under **"Start Command"**, type `npm start`. *(This uses Vite preview to serve your built files).*
7. Rename this service to `Healthcare Frontend`.

---

## Step 5: Generate Public URLs
Your services need public URLs so they can talk to each other and so you can visit the app.

1. Click on the **Healthcare Backend** service -> **"Settings"** tab -> click **"Generate Domain"** under the Domains section.
   - Copy this URL (e.g., `https://backend-xyz.up.railway.app`).
2. Click on the **Healthcare Frontend** service -> **"Settings"** tab -> click **"Generate Domain"**.
   - Copy this URL (e.g., `https://frontend-xyz.up.railway.app`).

---

## Step 6: Configure Environment Variables

Environment variables are secret settings that your application needs to run. You must configure these in the **"Variables"** tab of your services.

### A. Backend Variables
Go to **Healthcare Backend** -> **"Variables"** tab. Click **"New Variable"** for each of the following:

| Variable Name | Value / Explanation | Required? | Example Format |
| --- | --- | --- | --- |
| `PORT` | The port the backend runs on. Railway usually injects this, but you can set it to `5000`. | Yes | `5000` |
| `DATABASE_URL` | The connection string for your database. **How to get it:** Click the "Reference Variable" button (looks like `{ }`) and select the `DATABASE_URL` from your PostgreSQL service. | Yes | `postgresql://postgres:pass@containers.railway.app:7000/railway` |
| `FRONTEND_URL` | The public URL of your frontend. Used for CORS security to allow the frontend to talk to the backend. | Yes | `https://frontend-xyz.up.railway.app` |
| `JWT_SECRET` | A random, secure string used to sign user login tokens. Create a long random password yourself. | Yes | `my_super_secret_jwt_key_992` |
| `GEMINI_API_KEY` | Your Google Gemini API key for AI summaries. Get it from Google AI Studio. | Yes | `AIzaSyD...` |
| `SMTP_HOST` | The hostname of your email provider (e.g., SendGrid, Gmail, Ethereal). | Yes | `smtp.gmail.com` |
| `SMTP_PORT` | The port for your email provider. Usually `587` or `465`. | Yes | `587` |
| `SMTP_USER` | Your email address or API username. | Yes | `my-app@gmail.com` |
| `SMTP_PASS` | Your email password or API key. | Yes | `password123` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID for Calendar sync (From Google Cloud Console). | No | `123-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret for Calendar sync. | No | `GOCSPX-abc123def` |
| `GOOGLE_REDIRECT_URI` | Where Google redirects after login. Use your backend URL + `/api/auth/calendar/callback`. | No | `https://backend-xyz.up.railway.app/api/auth/calendar/callback` |

### B. Frontend Variables
Go to **Healthcare Frontend** -> **"Variables"** tab.

| Variable Name | Value / Explanation | Required? | Example Format |
| --- | --- | --- | --- |
| `VITE_API_URL` | The public URL of your backend, plus `/api`. This tells the frontend where to send requests. | Yes | `https://backend-xyz.up.railway.app/api` |

---

## Step 7: Trigger a Deploy
Whenever you change Environment Variables, Railway automatically redeploys your app. Wait for the build logs to show `SUCCESS`.

### How to view logs:
If a deploy fails or the app isn't working:
1. Click the service (Backend or Frontend).
2. Go to the **"Deployments"** tab.
3. Click on the latest deployment and select **"View Logs"**.
4. Check the **"Build Logs"** to see if `npm install` failed, or **"Deploy Logs"** to see runtime errors (like missing database connections).

---

## Step 8: Test the Deployment
1. Open your **Frontend Domain** (e.g., `https://frontend-xyz.up.railway.app`) in a browser.
2. Register a new Patient account.
3. If it succeeds, the frontend is successfully talking to the backend, and the backend is successfully talking to the PostgreSQL database!

### Common Errors and Fixes:
- **Error:** "Network Error" when registering/logging in.
  **Fix:** Your frontend cannot reach the backend. Ensure `VITE_API_URL` in the frontend variables is exactly your backend public URL + `/api` (no trailing slash).
- **Error:** "CORS Error" in browser console.
  **Fix:** The backend is rejecting the frontend. Ensure `FRONTEND_URL` in the backend variables is exactly your frontend public URL (no trailing slash).
- **Error:** Backend fails to start with "relation 'users' does not exist".
  **Fix:** The auto-migration script failed. Check backend Deploy Logs. Ensure `DATABASE_URL` is correctly linked to the Postgres service.
