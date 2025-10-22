# dYdX Alert System - Documentation

This is the documentation website for the dYdX v4 Alert System.

## Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:5173

## Build

```bash
npm run build
```

Built files will be in the `dist/` directory.

## Deployment

The documentation is automatically deployed to Netlify when changes are pushed to the `master` branch.

### Manual Deployment

```bash
npm run build
netlify deploy --prod --dir=dist
```

## Technology Stack

- **Vite** - Build tool
- **React** - UI framework
- **CSS** - Styling with CSS variables for theming

## Features

- Dark/Light theme support
- Responsive design
- Real-time search and navigation
- Comprehensive user-focused documentation
