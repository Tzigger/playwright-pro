#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { green, cyan, red, bold, yellow } from 'kleur/colors';
import prompts from 'prompts';

// --- CONFIGURATION ---
const E2E_DIR = 'e2e';
const TARGET_DIR = process.cwd();

console.log(cyan(bold('\n🚀 Initializing Playwright Professional Scaffold...\n')));

async function init(): Promise<void> {
  try {
    // 1. PRE-CHECK: Verificăm dacă suntem într-un proiect valid
    if (!fs.existsSync(path.join(TARGET_DIR, 'package.json'))) {
      console.error(red('❌ No package.json found. Please run this command inside your project root.'));
      process.exit(1);
    }

    // 2. INTERVIEW: Configurare interactivă
    const response = await prompts([
      {
        type: 'confirm',
        name: 'visualRegression',
        message: 'Include Visual Regression Setup (optimized config & example)?',
        initial: true
      },
      {
        type: 'confirm',
        name: 'apiClient',
        message: 'Include API Client Base (for easy data seeding)?',
        initial: true
      },
      {
        type: 'select',
        name: 'ciProvider',
        message: 'Generate CI/CD Pipeline?',
        choices: [
          { title: 'None', value: 'none' },
          { title: 'GitHub Actions', value: 'github' },
        ],
        initial: 1
      }
    ]);

    // 3. INSTALL: Dependențe de bază
    console.log('📦 Installing Dependencies...');
    try {
        execSync('npm install -D @playwright/test typescript ts-node eslint-plugin-playwright dotenv', { stdio: 'inherit' });
    } catch (e) {
        console.error(red('❌ Installation failed. Check your network or permissions.'));
        process.exit(1);
    }

    // 4. SCAFFOLD: Creare directoare
    const dirs = [
      `${E2E_DIR}/.auth`,
      `${E2E_DIR}/fixtures`,
      `${E2E_DIR}/pages`,
      `${E2E_DIR}/tests`,
      `${E2E_DIR}/utils`,
    ];
    if (response.apiClient) dirs.push(`${E2E_DIR}/api`);
    if (response.visualRegression) dirs.push(`${E2E_DIR}/tests/__snapshots__`);
    
    dirs.forEach(dir => fs.ensureDirSync(path.join(TARGET_DIR, dir)));
// 5. CONFIG: Generare playwright.config.ts (Fix pentru ESM)
    const visualConfig = response.visualRegression 
      ? `
    /* Visual Regression Configuration */
    expect: {
      toHaveScreenshot: { 
        maxDiffPixelRatio: 0.05, 
        threshold: 0.2,
        animations: 'disabled',
      },
    },
    snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',` 
      : '';

    // AICI ESTE SCHIMBAREA CRITICĂ:
    const pwConfig = `import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// 1. Definim __dirname pentru ESM (ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Încărcăm .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './${E2E_DIR}/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  ${visualConfig}
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: '${E2E_DIR}/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});`;
    fs.writeFileSync(path.join(TARGET_DIR, 'playwright.config.ts'), pwConfig);

    // 6. STANDARD FILES: Generăm fișierele de bază
    generateStandardFiles();

    // 7. MODULE AVANSATE

    // --- A. API CLIENT ---
    if (response.apiClient) {
        const apiClientContent = `import { APIRequestContext } from '@playwright/test';

export class ApiClient {
  constructor(private request: APIRequestContext) {}

  // Helper generic: Adaugă automat token-uri/cookies din context dacă e nevoie
  async post(endpoint: string, data: any) {
    const response = await this.request.post(endpoint, { data });
    if (!response.ok()) {
      throw new Error(\`API Error: \${response.status()} \${response.statusText()} - \${await response.text()}\`);
    }
    return response.json();
  }

  // Exemplu de metodă de business
  async createUser(user: any) {
    return this.post('/api/users', user);
  }
}`;
        fs.writeFileSync(path.join(TARGET_DIR, E2E_DIR, 'api', 'ApiClient.ts'), apiClientContent);
        
        // Suprascriem Base Fixture pentru a include API
        updateFixtureForApi();
    }

    // --- B. CI/CD (GitHub Actions) ---
    if (response.ciProvider === 'github') {
        const githubDir = path.join(TARGET_DIR, '.github', 'workflows');
        fs.ensureDirSync(githubDir);
        
        const yamlContent = `name: Playwright Tests
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 18
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npm run test:e2e
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30`;
        fs.writeFileSync(path.join(githubDir, 'playwright.yml'), yamlContent);
        console.log(green('✅ Created .github/workflows/playwright.yml'));
    }

    // --- C. VISUAL REGRESSION ---
    if (response.visualRegression) {
        const visualTestContent = `import { test, expect } from '../fixtures/base';

test.describe('Visual Regression', () => {
  
  test('landing page visual check', async ({ page }) => {
    await page.goto('/');
    
    // 1. Așteptăm stabilitatea vizuală
    await expect(page).toHaveTitle(/./); 
    
    // 2. Snapshot (Full Page)
    await expect(page).toHaveScreenshot('landing-page.png', { 
      fullPage: true,
      // mask: [page.getByTestId('dynamic-content')] 
    });
  });

  test('component visual check', async ({ page }) => {
    await page.goto('/');
    // Snapshot doar la un element
    const header = page.locator('header').first();
    if(await header.isVisible()) {
        await expect(header).toHaveScreenshot('header-component.png');
    }
  });
});`;
        fs.writeFileSync(path.join(TARGET_DIR, E2E_DIR, 'tests', 'visual.spec.ts'), visualTestContent);
        console.log(green('✅ Created example visual test in e2e/tests/visual.spec.ts'));
    }

    // 8. FINALIZARE
    updatePackageJson(response);
    updateGitIgnore();

    console.log(green('\n✅ Setup Complete!'));
    console.log(cyan('👉 Run "npm run test:e2e" to start testing.'));
    
    if (response.visualRegression) {
       console.log(yellow('📸 Note: Use "npm run test:e2e:update-snapshots" when design changes.'));
    }

  } catch (err) {
    console.error(red('Failed to initialize:'), err);
    process.exit(1);
  }
}

// --- HELPER FUNCTIONS ---

function generateStandardFiles() {
    // 1. TSConfig
    const tsConfigContent = {
        "extends": "./tsconfig.json",
        "compilerOptions": {
          "baseUrl": ".",
          "outDir": "test-dist",
          "target": "ESNext",
          "module": "commonjs",
          "moduleResolution": "node",
          "types": ["node", "playwright"]
        },
        "include": [`${E2E_DIR}/**/*`, "playwright.config.ts"],
        "exclude": ["src/**/*"]
      };
    fs.writeJsonSync(path.join(TARGET_DIR, 'tsconfig.e2e.json'), tsConfigContent, { spaces: 2 });

    // 2. Base Fixture (Simple)
    const fixtureContent = `import { test as base } from '@playwright/test';
// import { LoginPage } from '../pages/LoginPage';

type MyFixtures = {
  // loginPage: LoginPage;
};

export const test = base.extend<MyFixtures>({
  // loginPage: async ({ page }, use) => {
  //   await use(new LoginPage(page));
  // },
});

export { expect } from '@playwright/test';`;
    fs.writeFileSync(path.join(TARGET_DIR, E2E_DIR, 'fixtures', 'base.ts'), fixtureContent);
    
    // 3. Auth Setup
    const authSetup = `import { test as setup } from '@playwright/test';
const authFile = '${E2E_DIR}/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Implement auth logic here
  // await page.goto('/login');
  // await page.context().storageState({ path: authFile });
});`;
    fs.writeFileSync(path.join(TARGET_DIR, E2E_DIR, 'tests', 'auth.setup.ts'), authSetup);

    // 4. Example Test
    const exampleTest = `import { test, expect } from '../fixtures/base';

test('basic infrastructure test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/./);
});`;
    fs.writeFileSync(path.join(TARGET_DIR, E2E_DIR, 'tests', 'example.spec.ts'), exampleTest);
}

function updateFixtureForApi() {
    // Rescrie base.ts pentru a include ApiClient
    const content = `import { test as base } from '@playwright/test';
import { ApiClient } from '../api/ApiClient';

type MyFixtures = {
  api: ApiClient;
};

export const test = base.extend<MyFixtures>({
  api: async ({ request }, use) => {
    const apiClient = new ApiClient(request);
    await use(apiClient);
  },
});

export { expect } from '@playwright/test';`;
    fs.writeFileSync(path.join(TARGET_DIR, E2E_DIR, 'fixtures', 'base.ts'), content);
}

function updatePackageJson(options: any) {
    const pkgPath = path.join(TARGET_DIR, 'package.json');
    const pkg = fs.readJsonSync(pkgPath);
    
    // Base Scripts
    pkg.scripts = { 
        ...pkg.scripts, 
        "test:e2e": "playwright test",
        "test:e2e:ui": "playwright test --ui",
        "test:e2e:debug": "playwright test --debug",
        "test:e2e:codegen": "playwright codegen"
    };

    // Visual Regression specific script
    if (options.visualRegression) {
        pkg.scripts["test:e2e:update-snapshots"] = "playwright test --update-snapshots";
    }

    fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });
    console.log(green('✅ Updated package.json scripts'));
}

function updateGitIgnore() {
    const gitignorePath = path.join(TARGET_DIR, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
        const currentContent = fs.readFileSync(gitignorePath, 'utf8');
        if (!currentContent.includes('playwright-report')) {
            fs.appendFileSync(gitignorePath, `\n# Playwright\n/test-dist\n/playwright-report\n/${E2E_DIR}/.auth\n/${E2E_DIR}/__screenshots__\n`);
        }
    }
}

// Run the script
init();