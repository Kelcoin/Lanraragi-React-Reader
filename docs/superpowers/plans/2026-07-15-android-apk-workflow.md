# Temporary Android APK Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual GitHub Actions build that creates an installable Debug APK with immersive Android system bars and safe status-bar avoidance.

**Architecture:** Persist one workflow. Install exact Capacitor dependencies, generate Android project, patch built Web assets, build APK, and upload it inside ephemeral runner.

**Tech Stack:** GitHub Actions, Node.js 22, Capacitor 8.4.1, Android SDK 36, Java 21, Gradle, Vite 5.

## Global Constraints

- Persist only `.github/workflows/android-apk.yml`; keep Web source, package metadata, Docker workflow, and generated Android project unchanged.
- Use exact Capacitor `8.4.1`; produce Debug APK only.
- Enable runner-only cleartext and mixed content for local HTTP LANraragi.
- Use Capacitor `SystemBars`, edge-to-edge, dark-background icons, and CSS safe-area insets.
- Stage explicit paths only; preserve unrelated working-tree changes.

---

### Task 1: Add Android APK workflow

**Files:**
- Create: `.github/workflows/android-apk.yml`
- Test: inline Node.js contract command

**Interfaces:**
- Consumes: `npm run build`, `dist/`, GitHub Ubuntu Android SDK.
- Produces: artifact `lanraragi-reader-<short-sha>-debug` containing `app-debug.apk`.

- [ ] **Step 1: Verify RED before implementation**

```powershell
node -e "const fs=require('fs');if(!fs.existsSync('.github/workflows/android-apk.yml'))throw new Error('missing Android APK workflow')"
```

Expected: exit 1, `Error: missing Android APK workflow`.

- [ ] **Step 2: Create complete workflow**

Create `.github/workflows/android-apk.yml`:

```yaml
name: Build Android APK

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build-apk:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21

      - name: Install Android SDK 36
        run: sdkmanager "platforms;android-36" "build-tools;36.0.0"

      - name: Install web dependencies
        run: npm install --package-lock=false --no-audit --no-fund

      - name: Install temporary Capacitor dependencies
        run: >-
          npm install --no-save --package-lock=false --no-audit --no-fund
          @capacitor/core@8.4.1 @capacitor/cli@8.4.1 @capacitor/android@8.4.1

      - name: Build web app
        env:
          VITE_GIT_SHA: ${{ github.sha }}
        run: npm run build

      - name: Prepare temporary Android wrapper
        run: |
          node <<'NODE'
          const fs = require('node:fs');
          const path = require('node:path');
          const config = {
            appId: 'com.kelcoin.lanraragireader',
            appName: 'LANraragi Reader',
            webDir: 'dist',
            backgroundColor: '#0f1115',
            android: { backgroundColor: '#0f1115', allowMixedContent: true },
            server: { cleartext: true },
            plugins: { SystemBars: { insetsHandling: 'css', style: 'DARK', hidden: false } }
          };
          fs.writeFileSync('capacitor.config.json', JSON.stringify(config, null, 2) + '\n');

          const indexPath = path.join('dist', 'index.html');
          let html = fs.readFileSync(indexPath, 'utf8');
          const viewport = /(<meta\s+name="viewport"\s+content=")([^"]*)(")/;
          if (!viewport.test(html)) throw new Error('viewport meta anchor missing');
          html = html.replace(viewport, (_, start, value, end) =>
            start + (value.includes('viewport-fit=cover') ? value : value + ', viewport-fit=cover') + end);
          fs.writeFileSync(indexPath, html);

          const assetDir = path.join('dist', 'assets');
          const cssFiles = fs.readdirSync(assetDir).filter((name) => /^index-.*\.css$/.test(name));
          if (cssFiles.length !== 1) throw new Error('expected one Vite CSS asset');
          fs.appendFileSync(path.join(assetDir, cssFiles[0]), `
          :root{--lrr-android-safe-top:var(--safe-area-inset-top,env(safe-area-inset-top,0px))}
          html{background:#0f1115}
          body{box-sizing:border-box;padding-top:var(--lrr-android-safe-top);min-height:100dvh}
          .login-shell{min-height:calc(100dvh - var(--lrr-android-safe-top))!important}
          .reader-root{margin-top:calc(-1 * var(--lrr-android-safe-top))}
          .reader-toolbar{padding-top:calc(14px + var(--lrr-android-safe-top))!important}
          `);

          if (!fs.readFileSync(indexPath, 'utf8').includes('viewport-fit=cover')) throw new Error('viewport patch failed');
          if (!fs.readFileSync(path.join(assetDir, cssFiles[0]), 'utf8').includes('--lrr-android-safe-top')) throw new Error('safe-area patch failed');
          NODE
          npx cap add android
          npx cap sync android

      - name: Verify temporary Android wrapper
        run: |
          node <<'NODE'
          const fs = require('node:fs');
          const config = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
          const checks = [
            ['webDir', config.webDir === 'dist'],
            ['mixed content', config.android?.allowMixedContent === true],
            ['cleartext', config.server?.cleartext === true],
            ['CSS insets', config.plugins?.SystemBars?.insetsHandling === 'css'],
            ['system bar style', config.plugins?.SystemBars?.style === 'DARK']
          ];
          for (const [name, valid] of checks) if (!valid) throw new Error('invalid ' + name);
          const manifest = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
          if (!manifest.includes('android.permission.INTERNET')) throw new Error('INTERNET permission missing');
          NODE

      - name: Build Debug APK
        working-directory: android
        run: ./gradlew --no-daemon assembleDebug

      - name: Resolve artifact name
        id: artifact
        run: echo "short_sha=${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"

      - name: Upload Debug APK
        uses: actions/upload-artifact@v4
        with:
          name: lanraragi-reader-${{ steps.artifact.outputs.short_sha }}-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
          retention-days: 14
```

- [ ] **Step 3: Verify GREEN static contract**

```powershell
@'
const fs = require('node:fs');
const text = fs.readFileSync('.github/workflows/android-apk.yml', 'utf8');
const required = ['workflow_dispatch:', 'node-version: 22', 'java-version: 21',
  '@capacitor/core@8.4.1', '@capacitor/cli@8.4.1', '@capacitor/android@8.4.1',
  "insetsHandling: 'css'", "style: 'DARK'", '--lrr-android-safe-top',
  'allowMixedContent: true', 'cleartext: true', 'assembleDebug', 'actions/upload-artifact@v4'];
for (const token of required) if (!text.includes(token)) throw new Error('missing workflow contract: ' + token);
console.log('Android workflow contract OK');
'@ | node -
```

Expected: exit 0, `Android workflow contract OK`.

- [ ] **Step 4: Verify Web build and isolation**

```powershell
npm run build
git diff --check -- .github/workflows/android-apk.yml
git status --short
git diff -- .github/workflows/docker-publish.yml package.json index.html src public
```

Expected: Vite and diff check exit 0; task created no source/package/Docker changes.

- [ ] **Step 5: Commit only workflow**

```powershell
git add -- .github/workflows/android-apk.yml
git diff --cached --check
git diff --cached --name-only
git commit -m "ci: add temporary Android APK build"
```

Expected: staged list contains only workflow; commit succeeds.

### Task 2: Verify and push dev

**Files:**
- Verify: `.github/workflows/android-apk.yml`
- Verify: `docs/superpowers/specs/2026-07-15-android-apk-workflow-design.md`
- Verify: `docs/superpowers/plans/2026-07-15-android-apk-workflow.md`

**Interfaces:**
- Consumes: workflow commit on local `dev`.
- Produces: matching local and `origin/dev` tips.

- [ ] **Step 1: Fresh verification**

```powershell
npm run build
git diff --check
git diff --cached --check
git status --short
git log -3 --oneline
```

Expected: build and diff checks exit 0; unrelated working changes remain unstaged.

- [ ] **Step 2: Commit plan and push dev**

```powershell
git add -- docs/superpowers/plans/2026-07-15-android-apk-workflow.md
git diff --cached --name-only
git commit -m "docs: plan Android APK workflow"
git push origin dev
```

Expected: explicit plan-only commit succeeds; push reports `dev -> dev`.

- [ ] **Step 3: Confirm remote tip**

```powershell
git rev-parse HEAD
git ls-remote --heads origin dev
```

Expected: both hashes match.
