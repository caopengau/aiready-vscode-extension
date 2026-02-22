import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AIReadyIssuesProvider, Issue } from '../providers/issuesProvider';
import { AIReadySummaryProvider, Summary } from '../providers/summaryProvider';
import { getMergedConfig } from '../utils/config';

const execAsync = promisify(exec);

// CLI JSON structure based on actual output
interface AIReadyResult {
  summary: {
    totalIssues: number;
    toolsRun: string[];
    executionTime: number;
  };
  scoring?: {
    overallScore: number;
    breakdown?: Array<{
      toolName: string;
      score: number;
      rating: string;
    }>;
  };
  patterns?: Array<{
    fileName: string;
    issues: Array<{
      type: string;
      severity: 'critical' | 'major' | 'minor' | 'info';
      message: string;
      location: {
        file: string;
        line?: number;
      };
      suggestion?: string;
    }>;
    metrics?: {
      tokenCost: number;
      consistencyScore: number;
    };
  }>;
  context?: Array<{
    severity: 'critical' | 'major' | 'minor' | 'info';
    message: string;
    location?: {
      file: string;
      line?: number;
    };
  }>;
  consistency?: {
    summary: {
      totalIssues: number;
      filesAnalyzed: number;
    };
    results?: Array<{
      file: string;
      issues: Array<{
        severity: 'critical' | 'major' | 'minor' | 'info';
        message: string;
        location?: {
          file: string;
          line?: number;
        };
      }>;
    }>;
  };
  duplicates?: any[];
}

/**
 * Find the most recent AIReady report file
 */
function findLatestReport(workspacePath: string): string | null {
  const aireadyDir = join(workspacePath, '.aiready');
  if (!existsSync(aireadyDir)) {
    return null;
  }
  
  const fs = require('fs');
  const files = fs.readdirSync(aireadyDir)
    .filter((f: string) => f.startsWith('aiready-report-') && f.endsWith('.json'))
    .map((f: string) => ({
      name: f,
      path: join(aireadyDir, f),
      mtime: fs.statSync(join(aireadyDir, f)).mtime
    }))
    .sort((a: any, b: any) => b.mtime.getTime() - a.mtime.getTime());
  
  return files.length > 0 ? files[0].path : null;
}

/**
 * Count issues by severity from all tools
 */
function countIssues(result: AIReadyResult): { critical: number; major: number; minor: number; info: number; total: number } {
  const counts = { critical: 0, major: 0, minor: 0, info: 0, total: 0 };
  
  // Count pattern issues
  result.patterns?.forEach(p => {
    p.issues?.forEach(issue => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      counts.total++;
    });
  });
  
  // Count context issues
  result.context?.forEach(issue => {
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
    counts.total++;
  });
  
  // Count consistency issues
  result.consistency?.results?.forEach(r => {
    r.issues?.forEach(issue => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      counts.total++;
    });
  });
  
  return counts;
}

export function createScanCommands(
  outputChannel: vscode.OutputChannel,
  issuesProvider: AIReadyIssuesProvider,
  summaryProvider: AIReadySummaryProvider,
  updateStatusBar: (text: string, isError: boolean) => void,
  runVisualizer: () => Promise<void>
): {
  scanWorkspace: () => Promise<void>;
  quickScan: () => Promise<void>;
} {
  async function scanWorkspace(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    await runAIReady(workspaceFolders[0].uri.fsPath);
  }

  async function quickScan(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active file');
      return;
    }

    const filePath = editor.document.uri.fsPath;
    await runAIReady(filePath, true);
  }

  async function runAIReady(path: string, quickScan = false): Promise<void> {
    const mergedConfig = getMergedConfig();
    const { threshold, tools } = mergedConfig;
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

    updateStatusBar('$(sync~spin) Scanning...', false);

    try {
      // Build CLI command - the CLI saves JSON to .aiready/ directory
      const toolsArg = tools.join(',');
      let cmd = `npx @aiready/cli scan --output json --tools ${toolsArg}`;
      
      // Add path argument
      cmd += ` "${path}"`;
      
      outputChannel.clear();
      outputChannel.appendLine('Running AIReady scan...');
      outputChannel.appendLine(`Command: ${cmd}`);
      outputChannel.appendLine('');
      outputChannel.show();
      
      // Run the CLI command - it will save JSON to .aiready/ directory
      const { stdout, stderr } = await execAsync(cmd, {
        maxBuffer: 1024 * 1024 * 10,
        cwd: workspacePath
      });

      // Show CLI output to user
      if (stdout) {
        // Strip ANSI codes for cleaner output
        const cleanOutput = stdout.replace(/\x1b\[[0-9;]*m/g, '');
        outputChannel.appendLine(cleanOutput);
      }
      
      if (stderr) {
        outputChannel.appendLine(`[stderr] ${stderr}`);
      }

      // Find and read the generated report file
      const reportPath = findLatestReport(workspacePath);
      
      if (!reportPath) {
        throw new Error('No report file found. The CLI may have failed to generate output.');
      }
      
      outputChannel.appendLine(`\n📄 Reading report: ${reportPath}`);
      
      const jsonContent = readFileSync(reportPath, 'utf8');
      const result: AIReadyResult = JSON.parse(jsonContent);

      // Determine score - use scoring.overallScore if available
      const score = result.scoring?.overallScore ?? 0;
      
      // Count issues by severity
      const issueCounts = countIssues(result);
      
      // Update status bar
      const passed = score >= threshold;
      updateStatusBar(
        `$(shield) AIReady: ${score}`,
        !passed
      );

      // Update sidebar views
      const allIssues: Issue[] = [
        ...(result.patterns?.flatMap((p: any) => p.issues || []) || []),
        ...(result.context || []),
        ...(result.consistency?.results?.flatMap((r: any) => r.issues || []) || [])
      ];
      
      issuesProvider.refresh(allIssues);
      
      const summary: Summary = {
        score,
        issues: issueCounts.total,
        warnings: issueCounts.major + issueCounts.minor,
        breakdown: result.scoring?.breakdown
      };
      summaryProvider.refresh(summary);

      // Show summary in output channel
      outputChannel.appendLine('');
      outputChannel.appendLine('═══════════════════════════════════════');
      outputChannel.appendLine('       AIReady Analysis Results        ');
      outputChannel.appendLine('═══════════════════════════════════════');
      outputChannel.appendLine('');
      
      // Show AI Readiness Score
      outputChannel.appendLine(`AI Readiness Score: ${score}/100`);
      
      // Show tool breakdown if available
      if (result.scoring?.breakdown && result.scoring.breakdown.length > 0) {
        outputChannel.appendLine('');
        outputChannel.appendLine('Tool Breakdown:');
        result.scoring.breakdown.forEach(tool => {
          outputChannel.appendLine(`  - ${tool.toolName}: ${tool.score}/100 (${tool.rating})`);
        });
      }
      
      outputChannel.appendLine('');
      outputChannel.appendLine(`Issues:   ${issueCounts.total} (critical: ${issueCounts.critical}, major: ${issueCounts.major}, minor: ${issueCounts.minor})`);
      outputChannel.appendLine(`Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      outputChannel.appendLine('');
      
      // Show summary if available
      if (result.summary) {
        outputChannel.appendLine(`Tools run: ${result.summary.toolsRun.join(', ')}`);
        outputChannel.appendLine(`Execution time: ${(result.summary.executionTime / 1000).toFixed(2)}s`);
        outputChannel.appendLine('');
      }

      // Show notification with option to visualize
      const action = await vscode.window.showInformationMessage(
        `AIReady: Score ${score}/100 - ${issueCounts.total} issues`,
        'Visualize',
        'View Report'
      );
      
      if (action === 'Visualize') {
        await runVisualizer();
      } else if (action === 'View Report') {
        outputChannel.show();
      }

    } catch (error) {
      updateStatusBar('$(shield) AIReady: Error', true);
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`AIReady scan failed: ${message}`);
      outputChannel.appendLine(`Error: ${message}`);
      outputChannel.show();
    }
  }

  return { scanWorkspace, quickScan };
}