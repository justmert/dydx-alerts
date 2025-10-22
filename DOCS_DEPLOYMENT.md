# Documentation Deployment Guide

This guide explains how to deploy the documentation website to Netlify.

## Prerequisites

1. Netlify account
2. GitHub repository with the code
3. Netlify CLI installed: `npm install -g netlify-cli`

## Initial Setup

### 1. Create Netlify Site

```bash
cd docs
netlify login
netlify init
```

Follow the prompts:
- Create & configure a new site
- Team: Your team
- Site name: `dydx-alerts-docs` (or your preferred name)
- Build command: `npm run build`
- Publish directory: `dist`

### 2. Configure Custom Domain

In Netlify dashboard:
1. Go to Site settings → Domain management
2. Add custom domain: `docs.alertsdydx.com`
3. Follow DNS configuration instructions
4. Wait for DNS propagation (can take up to 48 hours)

### 3. Setup GitHub Actions Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `NETLIFY_AUTH_TOKEN`: Get from Netlify (User settings → Applications → Personal access tokens)
- `NETLIFY_SITE_ID`: Get from Netlify (Site settings → General → Site information → API ID)

## Automatic Deployment

Once configured, the documentation automatically deploys when:
- You push changes to the `master` branch in the `docs/` directory
- GitHub Actions workflow runs and deploys to Netlify

## Manual Deployment

If you need to deploy manually:

```bash
cd docs
npm run build
netlify deploy --prod --dir=dist
```

## Verifying Deployment

1. Check GitHub Actions: https://github.com/YOUR_USERNAME/dydx-alert-system/actions
2. Check Netlify dashboard for deployment status
3. Visit your site: https://docs.alertsdydx.com

## DNS Configuration

Add these DNS records to your domain provider:

```
Type: CNAME
Name: docs
Value: dydx-alerts-docs.netlify.app (or your Netlify subdomain)
```

## Troubleshooting

### Build Fails
- Check `npm run build` works locally
- Verify Node.js version in GitHub Actions matches local
- Check all dependencies are in package.json

### GitHub Actions Fails
- Verify secrets are set correctly
- Check workflow file syntax
- Ensure branch name matches (master vs main)

### DNS Not Resolving
- Wait 24-48 hours for propagation
- Verify DNS records are correct
- Use `dig docs.alertsdydx.com` to check DNS

### 404 on Routes
- Netlify redirects should be configured in `netlify.toml`
- Verify the redirects configuration is present

## Updating Documentation

1. Edit files in `docs/src/pages/`
2. Test locally: `npm run dev`
3. Commit and push to master branch
4. GitHub Actions automatically deploys

## Local Preview

```bash
cd docs
npm run dev
```

Visit http://localhost:5173
