# GitHub Actions Workflows

This directory contains CI/CD workflow templates for automated testing and deployment.

## 🚀 Quick Setup

To enable CI/CD workflows:

1. **Rename template files** by removing the `.template` extension:
   ```bash
   mv backend-tests.yml.template backend-tests.yml
   mv frontend-tests.yml.template frontend-tests.yml
   mv e2e-tests.yml.template e2e-tests.yml
   ```

2. **Set up Codecov** (optional, for coverage badges):
   - Sign up at https://codecov.io
   - Add your repository
   - Get your `CODECOV_TOKEN`
   - Add it to GitHub repository secrets

3. **Update README badges**:
   Replace the static badges in the main README.md with:
   ```markdown
   [![Backend Tests](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/backend-tests.yml)
   [![Backend Coverage](https://codecov.io/gh/YOUR_ORG/YOUR_REPO/branch/main/graph/badge.svg?flag=backend)](https://codecov.io/gh/YOUR_ORG/YOUR_REPO)
   [![Frontend Tests](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/frontend-tests.yml)
   [![Frontend Coverage](https://codecov.io/gh/YOUR_ORG/YOUR_REPO/branch/main/graph/badge.svg?flag=frontend)](https://codecov.io/gh/YOUR_ORG/YOUR_REPO)
   [![E2E Tests](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/YOUR_ORG/YOUR_REPO/actions/workflows/e2e-tests.yml)
   ```

## 📋 Workflow Descriptions

### `backend-tests.yml`
- Runs on: Push to main/develop, PRs affecting backend code
- Tests: Backend unit and integration tests
- Coverage: Uploads to Codecov
- Database: Spins up PostgreSQL service

### `frontend-tests.yml`
- Runs on: Push to main/develop, PRs affecting frontend code
- Tests: Frontend unit tests (Jest)
- Coverage: Uploads to Codecov
- Fast: Uses npm cache

### `e2e-tests.yml`
- Runs on: All pushes and PRs
- Tests: End-to-end tests (Playwright)
- Coverage: Full stack integration
- Artifacts: Saves test reports for 30 days

## 🔧 Customization

### Adjust trigger paths
Modify the `paths` section to control when workflows run:
```yaml
paths:
  - 'backend/**'
  - 'shared/**'  # Add if you have shared code
```

### Change test commands
Update the test steps to match your needs:
```yaml
- name: Run tests
  run: pytest -v --custom-flag
```

### Add deployment
Create a new workflow for deployment:
```yaml
name: Deploy to Production
on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
```

## 🛡️ Security

- Never commit secrets to workflows
- Use GitHub Secrets for sensitive data
- Review workflow permissions
- Keep actions up to date

## 📊 Coverage Reports

With Codecov enabled, you'll get:
- Coverage trends over time
- PR coverage comparisons
- Coverage per file/folder
- Interactive coverage explorer

Access at: `https://codecov.io/gh/YOUR_ORG/YOUR_REPO`

## 💡 Tips

- **PR checks**: Workflows run on PRs automatically
- **Status checks**: Set as required in branch protection
- **Debug logs**: Re-run with debug logging enabled
- **Artifacts**: Download from workflow run page
- **Matrix builds**: Test multiple Python/Node versions

## 📚 Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Codecov Documentation](https://docs.codecov.com)
- [Playwright CI Guide](https://playwright.dev/docs/ci)
