# ClearCut Batch Background Remover

A responsive installable PWA starter for batch background removal. AI runs in the user's browser; there is no photo-upload backend. Cloudflare Pages hosts the static site.

## Important before publishing

- The background-removal library used here, `@imgly/background-removal`, is distributed under AGPL-3.0. Review the license and comply with its terms before hosting a public service, or obtain a commercial license from IMG.LY if your intended use requires one.
- AI model files are downloaded the first time a user processes a photo. The first run needs internet. Browser/device performance varies; 100 full-resolution photos can take a long time or exhaust memory on phones. This starter processes one image at a time and limits each batch to 100 images and 25 MB per file.
- The web app cannot use the existing Python `rembg` installation directly on Cloudflare Pages. This version uses browser-based AI instead. Cloudflare Workers are not suitable for heavy model inference on their free limits; Pages is for hosting the front end.
- The PWA shell can be cached, but this starter does not promise offline AI processing on a first visit because the model assets must first be downloaded and cached by the AI library/browser.
- Keep an eye on the license and package version; check the current upstream docs before production use.

## Run on Windows in VS Code

1. Install Node.js LTS from https://nodejs.org/ (if not already installed).
2. Extract this project and open the `clearcut-batch` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:

   ```powershell
   npm install
   npm run dev
   ```

5. Open the local URL Vite prints, usually `http://localhost:5173`.

To create the production build:

```powershell
npm run build
npm run preview
```

## Deploy to Cloudflare Pages (free static hosting)

1. Create a GitHub repository and upload the contents of this project.
2. In Cloudflare Dashboard, open **Workers & Pages → Create → Pages → Connect to Git**.
3. Choose the repository.
4. Build settings:
   - Framework preset: `Vite` (or `None`)
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Deploy. Cloudflare gives you a `*.pages.dev` HTTPS URL.

Alternative: install Wrangler and run `npx wrangler pages deploy dist` after `npm run build`.

## Install on phone

- Android: open the HTTPS Pages URL in Chrome, then choose **Install app** or **Add to Home screen** from the browser menu.
- iPhone: open the URL in Safari → Share → **Add to Home Screen**.
- A service worker/PWA manifest are included. Browser support and install prompts vary. iOS may not show an automatic install prompt; use Safari's Share menu.

## Usage

1. Select up to 100 images, or drag files into the drop area.
2. Click **Remove backgrounds**. The first run downloads model files.
3. Inspect the previews and retry any failures by clicking **Remove backgrounds** again.
4. Click **Download ZIP** to save the completed transparent PNG files.

## Troubleshooting

- If model downloads fail, retry on a stable internet connection.
- If a phone tab reloads or the browser runs out of memory, process fewer photos at a time or use a desktop.
- If Vite reports a Node version problem, install the current Node.js LTS and reopen VS Code.
- For deployment errors, confirm the output directory is `dist` and the `dist/index.html` file exists after building.
