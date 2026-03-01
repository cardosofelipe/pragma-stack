# Performance Benchmarks Guide

Automated performance benchmarking infrastructure using **pytest-benchmark** to detect latency regressions in critical API endpoints.

## Table of Contents

- [Why Benchmark?](#why-benchmark)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Understanding Results](#understanding-results)
- [Test Organization](#test-organization)
- [Writing Benchmark Tests](#writing-benchmark-tests)
- [Baseline Management](#baseline-management)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Why Benchmark?

Performance regressions are silent bugs — they don't break tests or cause errors, but they degrade the user experience over time. Common causes include:

- **Unintended N+1 queries** after adding a relationship
- **Heavier serialization** after adding new fields to a response model
- **Middleware overhead** from new security headers or logging
- **Dependency upgrades** that introduce slower code paths

Without automated benchmarks, these regressions go unnoticed until users complain. Performance benchmarks serve as an **early warning system** — they measure endpoint latency on every run and flag significant deviations from an established baseline.

### What benchmarks give you

| Benefit | Description |
|---------|-------------|
| **Regression detection** | Automatically flags when an endpoint becomes significantly slower |
| **Baseline tracking** | Stores known-good performance numbers for comparison |
| **Confidence in refactors** | Verify that code changes don't degrade response times |
| **Visibility** | Makes performance a first-class, measurable quality attribute |

---

## Quick Start

```bash
# Run benchmarks (no comparison, just see current numbers)
make benchmark

# Save current results as the baseline
make benchmark-save

# Run benchmarks and compare against the saved baseline
make benchmark-check
```

---

## How It Works

The benchmarking system has three layers:

### 1. pytest-benchmark integration

[pytest-benchmark](https://pytest-benchmark.readthedocs.io/) is a pytest plugin that provides a `benchmark` fixture. It handles:

- **Calibration**: Automatically determines how many iterations to run for statistical significance
- **Timing**: Uses `time.perf_counter` for high-resolution measurements
- **Statistics**: Computes min, max, mean, median, standard deviation, IQR, and outlier detection
- **Comparison**: Compares current results against saved baselines and flags regressions

### 2. Benchmark types

The test suite includes two categories of performance tests:

| Type | How it works | Examples |
|------|-------------|----------|
| **pytest-benchmark tests** | Uses the `benchmark` fixture for precise, multi-round timing | `test_health_endpoint_performance`, `test_openapi_schema_performance` |
| **Manual latency tests** | Uses `time.perf_counter` with explicit thresholds (for async endpoints that pytest-benchmark doesn't support natively) | `test_login_latency`, `test_get_current_user_latency` |

### 3. Regression detection

When running `make benchmark-check`, the system:

1. Runs all benchmark tests
2. Compares results against the saved baseline (`.benchmarks/` directory)
3. **Fails the build** if any test's mean time exceeds **200%** of the baseline (i.e., 3× slower)

The `200%` threshold in `--benchmark-compare-fail=mean:200%` means "fail if the mean increased by more than 200% relative to the baseline." This is deliberately generous to avoid false positives from normal run-to-run variance while still catching real regressions.

---

## Understanding Results

A typical benchmark output looks like this:

```
--------------------------------------------------------------------------------------- benchmark: 2 tests --------------------------------------------------------------------------------------
Name (time in ms)                       Min               Max              Mean            StdDev            Median               IQR            Outliers       OPS            Rounds  Iterations
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test_health_endpoint_performance     0.9841 (1.0)      1.5513 (1.0)      1.1390 (1.0)      0.1098 (1.0)      1.1151 (1.0)      0.1672 (1.0)          39;2  877.9666 (1.0)         133           1
test_openapi_schema_performance      1.6523 (1.68)     2.0892 (1.35)     1.7843 (1.57)     0.1553 (1.41)     1.7200 (1.54)     0.1727 (1.03)          2;0  560.4471 (0.64)         10           1
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
```

### Column reference

| Column | Meaning |
|--------|---------|
| **Min** | Fastest single execution |
| **Max** | Slowest single execution |
| **Mean** | Average across all rounds — the primary metric for regression detection |
| **StdDev** | How much results vary between rounds (lower = more stable) |
| **Median** | Middle value, less sensitive to outliers than mean |
| **IQR** | Interquartile range — spread of the middle 50% of results |
| **Outliers** | Format `A;B` — A = within 1 StdDev, B = within 1.5 IQR from quartiles |
| **OPS** | Operations per second (`1 / Mean`) |
| **Rounds** | How many times the test was executed (auto-calibrated) |
| **Iterations** | Iterations per round (usually 1 for ms-scale tests) |

### The ratio numbers `(1.0)`, `(1.68)`, etc.

These show how each test compares **to the best result in that column**. The fastest test is always `(1.0)`, and others show their relative factor. For example, `(1.68)` means "1.68× slower than the fastest."

### Color coding

- **Green**: The fastest (best) value in each column
- **Red**: The slowest (worst) value in each column

This is a **relative ranking within the current run** — red does NOT mean the test failed or that performance is bad. It simply highlights which endpoint is the slower one in the group.

### What's "normal"?

For this project's current endpoints:

| Endpoint | Expected range | Why |
|----------|---------------|-----|
| `GET /health` | ~1–1.5ms | Minimal logic, mocked DB check |
| `GET /api/v1/openapi.json` | ~1.5–2.5ms | Serializes entire API schema |
| `POST /api/v1/auth/login` | < 500ms threshold | Includes bcrypt password hashing |
| `GET /api/v1/users/me` | < 200ms threshold | DB lookup + token validation |

---

## Test Organization

```
backend/tests/
├── benchmarks/
│   └── test_endpoint_performance.py   # All performance benchmark tests
│
backend/.benchmarks/                    # Saved baselines (auto-generated)
└── Linux-CPython-3.12-64bit/
    └── 0001_baseline.json             # Platform-specific baseline file
```

### Test markers

All benchmark tests use the `@pytest.mark.benchmark` marker. The `--benchmark-only` flag ensures that only tests using the `benchmark` fixture are executed during benchmark runs, while manual latency tests (async) are skipped.

---

## Writing Benchmark Tests

### Stateless endpoint (using pytest-benchmark fixture)

```python
import pytest
from fastapi.testclient import TestClient

def test_my_endpoint_performance(sync_client, benchmark):
    """Benchmark: GET /my-endpoint should respond within acceptable latency."""
    result = benchmark(sync_client.get, "/my-endpoint")
    assert result.status_code == 200
```

The `benchmark` fixture handles all timing, calibration, and statistics automatically. Just pass it the callable and arguments.

### Async / DB-dependent endpoint (manual timing)

For async endpoints that require database access, use manual timing with an explicit threshold:

```python
import time
import pytest

MAX_RESPONSE_MS = 300

@pytest.mark.asyncio
async def test_my_async_endpoint_latency(client, setup_fixture):
    """Performance: endpoint must respond under threshold."""
    iterations = 5
    total_ms = 0.0

    for _ in range(iterations):
        start = time.perf_counter()
        response = await client.get("/api/v1/my-endpoint")
        elapsed_ms = (time.perf_counter() - start) * 1000
        total_ms += elapsed_ms
        assert response.status_code == 200

    mean_ms = total_ms / iterations
    assert mean_ms < MAX_RESPONSE_MS, (
        f"Latency regression: {mean_ms:.1f}ms exceeds {MAX_RESPONSE_MS}ms threshold"
    )
```

### Guidelines for new benchmarks

1. **Benchmark critical paths** — endpoints users hit frequently or where latency matters most
2. **Mock external dependencies** for stateless tests to isolate endpoint overhead
3. **Set generous thresholds** for manual tests — account for CI variability
4. **Keep benchmarks fast** — they run on every check, so avoid heavy setup

---

## Baseline Management

### Saving a baseline

```bash
make benchmark-save
```

This runs all benchmarks and saves results to `.benchmarks/<platform>/0001_baseline.json`. The baseline captures:
- Mean, min, max, median, stddev for each test
- Machine info (CPU, OS, Python version)
- Timestamp

### Comparing against baseline

```bash
make benchmark-check
```

If no baseline exists, this command automatically creates one and prints a warning. On subsequent runs, it compares current results against the saved baseline.

### When to update the baseline

- **After intentional performance changes** (e.g., you optimized an endpoint — save the new, faster baseline)
- **After infrastructure changes** (e.g., new CI runner, different hardware)
- **After adding new benchmark tests** (the new tests need a baseline entry)

```bash
# Update the baseline after intentional changes
make benchmark-save
```

### Version control

The `.benchmarks/` directory can be committed to version control so that CI pipelines can compare against a known-good baseline. However, since benchmark results are machine-specific, you may prefer to generate baselines in CI rather than committing local results.

---

## CI/CD Integration

Add benchmark checking to your CI pipeline to catch regressions on every PR:

```yaml
# Example GitHub Actions step
- name: Performance regression check
  run: |
    cd backend
    make benchmark-save   # Create baseline from main branch
    # ... apply PR changes ...
    make benchmark-check  # Compare PR against baseline
```

A more robust approach:
1. Save the baseline on the `main` branch after each merge
2. On PR branches, run `make benchmark-check` against the `main` baseline
3. The pipeline fails if any endpoint regresses beyond the 200% threshold

---

## Troubleshooting

### "No benchmark baseline found" warning

```
⚠️  No benchmark baseline found. Run 'make benchmark-save' first to create one.
```

This means no baseline file exists yet. The command will auto-create one. Future runs of `make benchmark-check` will compare against it.

### Machine info mismatch warning

```
WARNING: benchmark machine_info is different
```

This is expected when comparing baselines generated on a different machine or OS. The comparison still works, but absolute numbers may differ. Re-save the baseline on the current machine if needed.

### High variance (large StdDev)

If StdDev is high relative to the Mean, results may be unreliable. Common causes:
- System under load during benchmark run
- Garbage collection interference
- Thermal throttling

Try running benchmarks on an idle system or increasing `min_rounds` in `pyproject.toml`.

### Only 2 of 4 tests run

The async tests (`test_login_latency`, `test_get_current_user_latency`) are skipped during `--benchmark-only` runs because they don't use the `benchmark` fixture. They run as part of the normal test suite (`make test`) with manual threshold assertions.
