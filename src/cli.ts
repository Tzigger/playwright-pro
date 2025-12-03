#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { green, cyan, red} from 'kleur';
import kleur from 'kleur';

// Define configuration constants
const E2E_DIR = 'e2e';
const TARGET_DIR = process.cwd();

console.log(kleur.bold().cyan('\n Initializing Playwright Professional Structure (TS Edition)...\n'));

async function init(): Promise<void> {
  try {
    // 1. Check for package.json
    const packageJsonPath = path.join(TARGET_DIR, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.error(red(' No package.json found. Run this inside your frontend project root.'));
      process.exit(1);
    }

    // 2. Install Dependencies
    console.log('📦 Installing Dev Dependencies...');
    try {
      execSync('npm install -D @playwright/test typescript ts-node eslint-plugin-playwright dotenv', { stdio: 'inherit' });
    } catch (e) {
      console.error(red(' Failed to install dependencies. Check your internet or npm config.'));
      process.exit(1);
    }

    // 3. Create Directory Structure
    const dirs: string[] = [
      path.join(E2E_DIR, '.auth'),
      path.join(E2E_DIR, 'fixtures'),
      path.join(E2E_DIR, 'pages'),
      path.join(E2E_DIR, 'tests'),
      path.join(E2E_DIR, 'utils'),
      path.join(E2E_DIR, 'api'),
    ];

    dirs.forEach(dir => fs.ensureDirSync(path.join(TARGET_DIR, dir)));
    console.log(green('✅ Directories created.'));

    // 4. Create Config Files
    
    // A. tsconfig.e2e.json
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

    // B. playwright.config.ts
    const pwConfig = `import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './${E2E_DIR}/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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

    // C. Base Fixture
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

    // D. Auth Setup
    const authSetup = `import { test as setup } from '@playwright/test';
const authFile = '${E2E_DIR}/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Implement auth logic
  // await page.context().storageState({ path: authFile });
});`;
    fs.writeFileSync(path.join(TARGET_DIR, E2E_DIR, 'tests', 'auth.setup.ts'), authSetup);

    // E. Example Test
    const exampleTest = `import { test, expect } from '../fixtures/base';

test('verify page title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.*App/);
});`;
    fs.writeFileSync(path.join(TARGET_DIR, E2E_DIR, 'tests', 'example.spec.ts'), exampleTest);

    // 5. Update Scripts
    const pkgPath = path.join(TARGET_DIR, 'package.json');
    const pkg = fs.readJsonSync(pkgPath);
    pkg.scripts = {
      ...pkg.scripts,
      "test:e2e": "playwright test",
      "test:e2e:ui": "playwright test --ui"
    };
    fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });
    
    // 6. Update .gitignore
    const gitignorePath = path.join(TARGET_DIR, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const currentGitIgnore = fs.readFileSync(gitignorePath, 'utf8');
      if (!currentGitIgnore.includes('test-dist')) {
         fs.appendFileSync(gitignorePath, `\n# Playwright\n/test-dist\n/playwright-report\n/${E2E_DIR}/.auth\n`);
      }
    }

    console.log(green('\n✅ Setup Complete!'));

  } catch (err) {
    console.error(red('Failed to initialize:'), err);
    process.exit(1);
  }
}

init();