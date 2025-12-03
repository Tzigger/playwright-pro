## Project Title
create-playwright-pro -> Scaffolding Tool for Playwright Projects

## Description
`create-playwright-pro` is a powerful command-line interface (CLI) tool designed to streamline the setup and development of Playwright test automation projects. Its primary objective is to eliminate tedious setup time and enforce a unified, best-practice architecture across all your Playwright projects. This ensures consistency, maintainability, and scalability from day one, allowing teams to focus on writing effective tests rather than configuring environments.

## Goal
The objective of `create-playwright-pro` is to:
- **Eliminate Setup Time:** Quickly scaffold new Playwright projects with pre-configured settings, dependencies, and file structures.
- **Enforce Unified Architecture:** Promote consistency across projects by providing a standardized, opinionated project structure that follows best practices.
- **Boost Productivity:** Allow developers and QA engineers to immediately start writing tests without spending time on initial project configuration.
- **Improve Maintainability:** Ensure projects are easy to understand, navigate, and maintain due to a predictable and well-organized codebase.
- **Facilitate Collaboration:** Enable seamless collaboration among team members by working within a familiar and consistent project layout.

## Installation
To use `create-playwright-pro`, you typically install it globally or use `npx`.

### Global Installation (Recommended for development)
```bash
npm install -g create-playwright-pro
```

### Using npx (For one-off project creation)
```bash
npx create-playwright-pro my-new-project
```

## Usage
After installation, you can create a new Playwright project by running:

```bash
create-playwright-pro <project-name>
```

Replace `<project-name>` with the desired name for your new project. The CLI will then guide you through any necessary configurations and set up your project structure.

Example:
```bash
create-playwright-pro my-e2e-tests
```

This will create a new directory named `my-e2e-tests` with a pre-configured Playwright project inside.

## Contribution
We welcome contributions to `create-playwright-pro`! If you'd like to contribute, please follow these steps:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature-name`).
3. Make your changes and ensure tests pass.
4. Commit your changes (`git commit -m 'feat: Add new feature'`).
5. Push to the branch (`git push origin feature/your-feature-name`).
6. Open a Pull Request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## How to use with `npm link` (for local development)
If you are developing `create-playwright-pro` itself, you can use `npm link` to test your changes locally without publishing to npm.

1. **In the `create-playwright-pro` project directory (this repository):**
   ```bash
   npm link
   ```
   This command creates a global symlink from your local `create-playwright-pro` package to the global `node_modules` directory.

2. **In a separate directory where you want to create a new Playwright project:**
   ```bash
   npm link create-playwright-pro
   ```
   This command links the global `create-playwright-pro` package (which points to your local development version) into your new project's `node_modules`. Now you can use `create-playwright-pro` command as if it were globally installed, but it will execute your local development version.

   Alternatively, you can just run `create-playwright-pro <project-name>` directly in your terminal after the first `npm link` step, and it will use your globally linked development version.

To unlink:
- In the `create-playwright-pro` project directory: `npm unlink`
- In the test project directory: `npm unlink create-playwright-pro`
