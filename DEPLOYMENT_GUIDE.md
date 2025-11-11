# Deployment Guide - Step by Step

This guide will help you deploy your Sports Card Text Extraction app so you can share it with your client.

## ⚡ Quick Start (TL;DR)

**Fastest Path to Deployment:**

1. **Push code to GitHub** (if not already done)
2. **Deploy backend to Railway**:
   - Connect GitHub repo
   - Set root directory to `backend`
   - Add environment variables (see Step 3 below)
   - Upload credential files
3. **Deploy frontend to Vercel**:
   - Connect same GitHub repo
   - Set root directory to `web`
   - Add `NEXT_PUBLIC_API_URL` pointing to your Railway backend
4. **Share the Vercel URL with your client!**

**Total time: ~30-45 minutes** (mostly waiting for builds)

---

## 🎯 Recommended Deployment Strategy

**Best Option: Vercel (Frontend) + Railway (Backend)**
- ✅ Free tiers available
- ✅ Easy setup
- ✅ Automatic deployments
- ✅ Great for client demos

**Alternative: Render (Both Frontend & Backend)**
- ✅ Single platform
- ✅ Free tier available
- ✅ Simple configuration

---

## 📋 Prerequisites

Before deploying, make sure you have:
1. ✅ GitHub account (free)
2. ✅ Vercel account (free at vercel.com)
3. ✅ Railway account (free at railway.app) OR Render account (free at render.com)
4. ✅ Google Cloud credentials ready (JSON files)

---

## 🚀 Option 1: Vercel + Railway (Recommended)

### Part A: Prepare Your Code

#### Step 1: Create Environment Variable Files

**Backend `.env.example`** (create in `backend/` folder):
```bash
PORT=3001
NODE_ENV=production
APP_BASE_URL=https://your-backend-url.railway.app

GOOGLE_PROJECT_ID=project-fast-pitch
GEMINI_API_KEY=your-gemini-api-key-here
GOOGLE_VISION_CREDENTIALS=/app/credentials/google-vision-credentials.json
GOOGLE_GEMINI_CREDENTIALS=/app/credentials/google-gemini-credentials.json

GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=/app/credentials/google-sheets-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_SHEET_NAME=Cards

UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760
```

**Note**: Get your `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey)

**Frontend `.env.example`** (create in `web/` folder):
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

#### Step 2: Update CORS Settings (if needed)

The backend already has `cors()` enabled, which should work. If you encounter CORS issues, we'll update it.

#### Step 3: Create `.gitignore` (if not exists)

Make sure these are ignored:
```
.env
.env.local
node_modules/
dist/
uploads/
*.log
credentials/*.json
```

---

### Part B: Deploy Backend to Railway

#### Step 1: Push Code to GitHub

```bash
# In your project root
git init
git add .
git commit -m "Initial commit for deployment"
git branch -M main

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

#### Step 2: Deploy to Railway

1. **Sign up/Login**: Go to [railway.app](https://railway.app) and sign up with GitHub
2. **New Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Select Repository**: Choose your repository
4. **Configure Service**:
   - Railway will auto-detect Node.js
   - **Root Directory**: Set to `backend`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`

#### Step 3: Set Environment Variables in Railway

In Railway dashboard → Your Service → Variables tab, add:

```
PORT=3001
NODE_ENV=production
APP_BASE_URL=https://your-service-name.railway.app
GOOGLE_PROJECT_ID=project-fast-pitch
GEMINI_API_KEY=your-gemini-api-key-here
GOOGLE_VISION_CREDENTIALS=/app/credentials/google-vision-credentials.json
GOOGLE_GEMINI_CREDENTIALS=/app/credentials/google-gemini-credentials.json
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=/app/credentials/google-sheets-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your-actual-spreadsheet-id
GOOGLE_SHEETS_SHEET_NAME=Cards
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760
```

**Important**: 
- Get your `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Replace `your-service-name.railway.app` with your actual Railway URL (you'll get this after first deployment)

#### Step 4: Upload Credentials to Railway

**Option A: Using Railway's File System (Recommended)**
1. In Railway → Your Service → Settings → Volumes
2. Create a volume at `/app/credentials`
3. Upload your JSON credential files:
   - `google-vision-credentials.json`
   - `google-gemini-credentials.json`
   - `google-sheets-credentials.json`

**Option B: Using Environment Variables (Alternative)**

If you can't use volumes, you can convert JSON files to environment variables:

1. **Use the helper script** (recommended):
   ```bash
   node scripts/convert-credentials-to-env.js
   ```
   This will output the credentials in environment variable format.

2. **Or manually convert**:
   - Read each JSON file
   - Convert to single line (remove newlines, escape quotes)
   - Add as environment variables in Railway:
     - `GOOGLE_VISION_CREDENTIALS_JSON` (paste entire JSON as string)
     - `GOOGLE_GEMINI_CREDENTIALS_JSON`
     - `GOOGLE_SHEETS_CREDENTIALS_JSON`

**Note**: Option B requires code changes to read from env vars. For now, use Option A (volumes) if possible.

#### Step 5: Get Your Backend URL

After deployment, Railway will give you a URL like:
`https://your-service-name.railway.app`

**Save this URL** - you'll need it for the frontend!

---

### Part C: Deploy Frontend to Vercel

#### Step 1: Deploy to Vercel

1. **Sign up/Login**: Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. **New Project**: Click "Add New" → "Project"
3. **Import Repository**: Select your GitHub repository
4. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `web`
   - **Build Command**: `pnpm build` (or leave default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `pnpm install`

#### Step 2: Set Environment Variables in Vercel

In Vercel dashboard → Your Project → Settings → Environment Variables:

Add:
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

Replace `your-backend-url.railway.app` with your actual Railway backend URL.

#### Step 3: Deploy

Click "Deploy" and wait for it to complete.

#### Step 4: Get Your Frontend URL

Vercel will give you a URL like:
`https://your-project-name.vercel.app`

**This is your app URL to share with the client!** 🎉

---

## 🚀 Option 2: Render (All-in-One)

### Step 1: Push Code to GitHub

Same as Option 1, Part B, Step 1.

### Step 2: Deploy Backend to Render

1. **Sign up**: Go to [render.com](https://render.com) and sign up with GitHub
2. **New Web Service**: Click "New" → "Web Service"
3. **Connect Repository**: Select your GitHub repo
4. **Configure Backend Service**:
   - **Name**: `cardextract-backend`
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: Free (or paid if needed)

5. **Environment Variables**: Add all the same variables as Railway (see Part B, Step 3), including:
   - `GEMINI_API_KEY` (get from [Google AI Studio](https://aistudio.google.com/app/apikey))
   - All Google credentials paths
   - `GOOGLE_SHEETS_SPREADSHEET_ID`

6. **Upload Credentials**: 
   - Render doesn't support volumes on free tier
   - Use **Option B** from Railway (convert JSON to env vars)

7. **Deploy**: Click "Create Web Service"

### Step 3: Deploy Frontend to Render

1. **New Static Site**: Click "New" → "Static Site"
2. **Connect Repository**: Same repo
3. **Configure**:
   - **Name**: `cardextract-frontend`
   - **Root Directory**: `web`
   - **Build Command**: `cd web && pnpm install && pnpm build`
   - **Publish Directory**: `web/.next`
   - **Environment**: Add `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`

4. **Deploy**: Click "Create Static Site"

**Note**: For Next.js on Render, you might need to use a Web Service instead of Static Site for full Next.js features.

---

## 🔧 Important Configuration Updates

### Update Backend CORS (if needed)

If you get CORS errors, update `backend/src/server.ts`:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://your-frontend.vercel.app",
  credentials: true
}));
```

### Update Frontend API URL

Make sure `web/src/lib/api.ts` uses the environment variable:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
```

This should already be correct!

---

## 📝 Post-Deployment Checklist

- [ ] Backend is accessible at its URL
- [ ] Frontend can connect to backend (check browser console)
- [ ] Health check works: `https://your-backend-url/health`
- [ ] API health check works: `https://your-backend-url/api/health`
- [ ] File uploads work
- [ ] Google APIs are connected (check `/api/health` endpoint)
- [ ] Test the full flow: upload → process → review → export

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Build fails
- **Solution**: Check Railway/Render logs. Ensure `pnpm` is available (may need to install it)

**Problem**: Credentials not found
- **Solution**: Verify file paths in environment variables match where files are stored

**Problem**: Port binding error
- **Solution**: Railway/Render sets PORT automatically. Make sure your code uses `process.env.PORT`

### Frontend Issues

**Problem**: Can't connect to backend
- **Solution**: 
  1. Check `NEXT_PUBLIC_API_URL` is set correctly
  2. Verify backend URL is accessible
  3. Check CORS settings

**Problem**: Build fails
- **Solution**: Check Vercel/Render build logs for specific errors

### CORS Errors

If you see CORS errors in browser console:
1. Update backend CORS to allow your frontend domain
2. Check that backend URL in frontend env var is correct

---

## 🔐 Security Notes

1. **Never commit** `.env` files or credential JSON files to GitHub
2. **Use environment variables** for all secrets
3. **Rotate credentials** if accidentally committed
4. **Use least-privilege** Google Cloud service accounts

---

## 📊 Quick Reference URLs

After deployment, you'll have:
- **Frontend URL**: `https://your-project.vercel.app` (or Render URL)
- **Backend URL**: `https://your-backend.railway.app` (or Render URL)
- **Health Check**: `https://your-backend-url/health`
- **API Health**: `https://your-backend-url/api/health`

---

## 🎉 Sharing with Client

Once deployed:
1. Share the **frontend URL** with your client
2. They can access it from any browser
3. No installation needed on their end
4. All processing happens in the cloud

---

## 💡 Pro Tips

1. **Custom Domain**: Both Vercel and Railway support custom domains (paid feature)
2. **Monitoring**: Set up error tracking (Sentry, LogRocket) for production
3. **Backups**: Regularly backup your Google Sheets data
4. **Scaling**: Upgrade plans if you expect high traffic

---

## 📞 Need Help?

If you encounter issues:
1. Check the deployment platform logs
2. Verify all environment variables are set
3. Test backend endpoints directly (using Postman/curl)
4. Check browser console for frontend errors

Good luck with your deployment! 🚀

