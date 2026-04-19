import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface LogEntry {
  timestamp: string;
  suite: string;
  test: string;
  status: string;
  durationMs: number;
  failureReason?: string;
  retries: number;
}

class CustomReporter implements Reporter {
  private logs: LogEntry[] = [];
  private outputPath: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputPath = options.outputFile ?? 'e2e/reports/test-results.json';
  }

  onBegin(_config: FullConfig, suite: Suite) {
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    console.log(`\n[QA Reporter] Starting ${suite.allTests().length} tests`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const failureReason = result.errors
      .map((e) => e.message?.split('\n')[0] ?? 'Unknown error')
      .join(' | ');

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      suite: test.parent?.title ?? 'Unknown Suite',
      test: test.title,
      status: result.status,
      durationMs: result.duration,
      retries: result.retry,
      ...(result.status !== 'passed' && { failureReason: failureReason || 'No error message' }),
    };

    this.logs.push(entry);

    const icon =
      result.status === 'passed' ? '✓' : result.status === 'skipped' ? '○' : '✗';
    const retry = result.retry > 0 ? ` (retry ${result.retry})` : '';
    const reason = entry.failureReason ? ` → ${entry.failureReason}` : '';
    console.log(
      `[${entry.timestamp}] ${icon} ${entry.suite} › ${entry.test}${retry} (${result.duration}ms)${reason}`
    );
  }

  onEnd(result: FullResult) {
    const passed = this.logs.filter((l) => l.status === 'passed').length;
    const failed = this.logs.filter((l) => l.status === 'failed').length;
    const skipped = this.logs.filter((l) => l.status === 'skipped').length;

    const report = {
      summary: {
        generatedAt: new Date().toISOString(),
        overallStatus: result.status,
        total: this.logs.length,
        passed,
        failed,
        skipped,
        durationMs: result.duration,
      },
      results: this.logs,
    };

    fs.writeFileSync(this.outputPath, JSON.stringify(report, null, 2));

    console.log(`\n[QA Reporter] Done — ${passed} passed, ${failed} failed, ${skipped} skipped`);
    console.log(`[QA Reporter] Full report: ${this.outputPath}`);
  }
}

export default CustomReporter;
