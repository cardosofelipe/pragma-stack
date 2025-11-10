#!/usr/bin/env tsx
/**
 * Merge Coverage Script
 *
 * Combines Jest unit test coverage with Playwright E2E test coverage
 * to generate a comprehensive combined coverage report.
 *
 * Usage:
 *   npm run coverage:merge
 *   # or directly:
 *   tsx scripts/merge-coverage.ts
 *
 * Prerequisites:
 *   - Jest coverage must exist at: ./coverage/coverage-final.json
 *   - E2E coverage must exist at: ./coverage-e2e/.nyc_output/*.json
 *
 * Output:
 *   - Combined coverage report in: ./coverage-combined/
 *   - Formats: HTML, text, JSON, LCOV
 */

import { createCoverageMap } from 'istanbul-lib-coverage';
import { createContext } from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import fs from 'fs';
import path from 'path';

interface CoverageData {
  [key: string]: any;
}

interface MergeStats {
  jestFiles: number;
  e2eFiles: number;
  combinedFiles: number;
  jestOnlyFiles: string[];
  e2eOnlyFiles: string[];
  sharedFiles: string[];
}

async function mergeCoverage() {
  console.log('\n🔄 Merging Coverage Data...\n');

  const map = createCoverageMap();
  const stats: MergeStats = {
    jestFiles: 0,
    e2eFiles: 0,
    combinedFiles: 0,
    jestOnlyFiles: [],
    e2eOnlyFiles: [],
    sharedFiles: [],
  };

  const jestFiles = new Set<string>();
  const e2eFiles = new Set<string>();

  // Step 1: Load Jest coverage
  console.log('📊 Loading Jest unit test coverage...');
  const jestCoveragePath = path.join(process.cwd(), 'coverage/coverage-final.json');

  if (fs.existsSync(jestCoveragePath)) {
    const jestCoverage: CoverageData = JSON.parse(fs.readFileSync(jestCoveragePath, 'utf-8'));

    Object.keys(jestCoverage).forEach((file) => jestFiles.add(file));
    stats.jestFiles = jestFiles.size;

    console.log(`   ✅ Loaded ${stats.jestFiles} files from Jest coverage`);
    map.merge(jestCoverage);
  } else {
    console.log('   ⚠️  No Jest coverage found at:', jestCoveragePath);
    console.log('   Run: npm run test:coverage');
  }

  // Step 2: Load E2E coverage
  console.log('\n🎭 Loading Playwright E2E test coverage...');
  const e2eDir = path.join(process.cwd(), 'coverage-e2e/.nyc_output');

  if (fs.existsSync(e2eDir)) {
    const files = fs.readdirSync(e2eDir).filter((f) => f.endsWith('.json'));

    if (files.length === 0) {
      console.log('   ⚠️  No E2E coverage files found in:', e2eDir);
      console.log('   Run: E2E_COVERAGE=true npm run test:e2e');
    } else {
      for (const file of files) {
        const coverage: CoverageData = JSON.parse(
          fs.readFileSync(path.join(e2eDir, file), 'utf-8')
        );

        Object.keys(coverage).forEach((f) => e2eFiles.add(f));
        map.merge(coverage);
        console.log(`   ✅ Loaded E2E coverage from: ${file}`);
      }
      stats.e2eFiles = e2eFiles.size;
      console.log(`   📁 Total unique files in E2E coverage: ${stats.e2eFiles}`);
    }
  } else {
    console.log('   ⚠️  No E2E coverage directory found at:', e2eDir);
    console.log('   Run: E2E_COVERAGE=true npm run test:e2e');
  }

  // Step 3: Calculate statistics
  stats.combinedFiles = map.files().length;

  map.files().forEach((file) => {
    const inJest = jestFiles.has(file);
    const inE2E = e2eFiles.has(file);

    if (inJest && inE2E) {
      stats.sharedFiles.push(file);
    } else if (inJest) {
      stats.jestOnlyFiles.push(file);
    } else if (inE2E) {
      stats.e2eOnlyFiles.push(file);
    }
  });

  // Step 4: Generate reports
  console.log('\n📝 Generating combined coverage reports...');

  const reportDir = path.join(process.cwd(), 'coverage-combined');
  fs.mkdirSync(reportDir, { recursive: true });

  const context = createContext({
    dir: reportDir,
    coverageMap: map,
  });

  const reportTypes = ['text', 'text-summary', 'html', 'json', 'lcov'];

  reportTypes.forEach((reportType) => {
    try {
      const report = reports.create(reportType as any, {});
      report.execute(context);
      console.log(`   ✅ Generated ${reportType} report`);
    } catch (error) {
      console.error(`   ❌ Failed to generate ${reportType} report:`, error);
    }
  });

  // Step 5: Print summary
  const summary = map.getCoverageSummary();

  console.log('\n' + '='.repeat(70));
  console.log('📊 COMBINED COVERAGE SUMMARY');
  console.log('='.repeat(70));
  console.log(
    `\n  Statements: ${summary.statements.pct.toFixed(2)}% (${summary.statements.covered}/${summary.statements.total})`
  );
  console.log(
    `  Branches:   ${summary.branches.pct.toFixed(2)}% (${summary.branches.covered}/${summary.branches.total})`
  );
  console.log(
    `  Functions:  ${summary.functions.pct.toFixed(2)}% (${summary.functions.covered}/${summary.functions.total})`
  );
  console.log(
    `  Lines:      ${summary.lines.pct.toFixed(2)}% (${summary.lines.covered}/${summary.lines.total})`
  );

  console.log('\n' + '-'.repeat(70));
  console.log('📁 FILE COVERAGE BREAKDOWN');
  console.log('-'.repeat(70));
  console.log(`\n  Total files:           ${stats.combinedFiles}`);
  console.log(`  Jest only:             ${stats.jestOnlyFiles.length}`);
  console.log(`  E2E only:              ${stats.e2eOnlyFiles.length}`);
  console.log(`  Covered by both:       ${stats.sharedFiles.length}`);

  // Show E2E-only files (these were excluded from Jest)
  if (stats.e2eOnlyFiles.length > 0) {
    console.log('\n  📋 Files covered ONLY by E2E tests (excluded from unit tests):');
    stats.e2eOnlyFiles.slice(0, 10).forEach((file) => {
      const fileCoverage = map.fileCoverageFor(file);
      const fileSummary = fileCoverage.toSummary();
      console.log(
        `     • ${path.relative(process.cwd(), file)} (${fileSummary.statements.pct.toFixed(1)}%)`
      );
    });
    if (stats.e2eOnlyFiles.length > 10) {
      console.log(`     ... and ${stats.e2eOnlyFiles.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ Combined coverage report available at:\n   ${reportDir}/index.html\n`);

  // Step 6: Check thresholds (from .nycrc.json)
  const thresholds = {
    statements: 90,
    branches: 85,
    functions: 85,
    lines: 90,
  };

  let thresholdsFailed = false;
  console.log('🎯 Checking Coverage Thresholds:\n');

  Object.entries(thresholds).forEach(([metric, threshold]) => {
    const actual = (summary as any)[metric].pct;
    const passed = actual >= threshold;
    const icon = passed ? '✅' : '❌';
    console.log(
      `   ${icon} ${metric.padEnd(12)}: ${actual.toFixed(2)}% (threshold: ${threshold}%)`
    );
    if (!passed) thresholdsFailed = true;
  });

  if (thresholdsFailed) {
    console.log('\n❌ Coverage thresholds not met!\n');
    process.exit(1);
  } else {
    console.log('\n✅ All coverage thresholds met!\n');
  }
}

// Run the merge
mergeCoverage().catch((error) => {
  console.error('\n❌ Error merging coverage:', error);
  process.exit(1);
});
