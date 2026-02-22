import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

interface AIReadyResult {
  passed: boolean;
  score: number;
  issues: number;
  warnings: number;
  report: string;
}

// Smart defaults matching CLI behavior
const SMART_DEFAULTS = {
  threshold: 70,
  tools: ['patterns', 'context', 'consistency'] as const,
  failOn: 'critical' as const,
  autoScan: false,
  showStatusBar: true,
  excludePatterns: ['node_modules/**', 'dist/**', '.git/**', '**/*.min.js', '**/build/**'],
};

export function activate(context: vscode.ExtensionContext) {
  console.log('AIReady extension is now active!');

  outputChannel = vscode.window.createOutputChannel('AIReady');

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'aiready.showReport';
  context.subscriptions.push(statusBarItem);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('aiready.scan', scanWorkspace),
    vscode.commands.registerCommand('aiready.quickScan', quickScan),
    vscode.commands.registerCommand('aiready.showReport', showReport),
    vscode.commands.registerCommand('aiready.openSettings', openSettings)
  );

  // Show initial status
  updateStatusBar('AIReady', false);

  // Auto-scan on save if enabled
  const config = vscode.workspace.getConfiguration('aiready');
  if (config.get<boolean>('autoScan', SMART_DEFAULTS.autoScan)) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        if (document.uri.scheme === 'file') {
          quickScan();
        }
      })
    );
  }
}

/**
 * Get merged configuration with smart defaults (matching CLI behavior)
 */
function getMergedConfig(): {
  threshold: number;
  tools: string[];
  failOn: string;
  autoScan: boolean;
  showStatusBar: boolean;
  excludePatterns: string[];
} {
  const config = vscode.workspace.getConfiguration('aiready');
  
  return {
    threshold: config.get<number>('threshold', SMART_DEFAULTS.threshold),
    tools: config.get<string[]>('tools', [...SMART_DEFAULTS.tools]),
    failOn: config.get<string>('failOn', SMART_DEFAULTS.failOn),
    autoScan: config.get<boolean>('autoScan', SMART_DEFAULTS.autoScan),
    showStatusBar: config.get<boolean>('showStatusBar', SMART_DEFAULTS.showStatusBar),
    excludePatterns: config.get<string[]>('excludePatterns', [...SMART_DEFAULTS.excludePatterns]),
  };
}

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

  updateStatusBar('$(sync~spin) Scanning...', false);

  try {
    // Build CLI command matching CLI defaults
    // Use --output json for structured results, and include --score for AI readiness
    const toolsArg = tools.join(',');
    let cmd = `npx @aiready/cli scan --output json --tools ${toolsArg} --score`;
    
    // Add path argument
    cmd += ` "${path}"`;
    
    const { stdout } = await execAsync(cmd, {
      maxBuffer: 1024 * 1024 * 10,
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()
    });

    const result: AIReadyResult & { 
      summary?: { 
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
    } = JSON.parse(stdout);

    // Determine score - use scoring.overallScore if available, else result.score
    const score = result.scoring?.overallScore ?? result.score ?? 0;
    
    // Update status bar
    const passed = score >= threshold;
    updateStatusBar(
      `${passed ? '✓' : '✗'} AIReady: ${score}`,
      !passed
    );

    // Show summary
    outputChannel.clear();
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
    outputChannel.appendLine(`Issues:   ${result.issues}`);
    outputChannel.appendLine(`Warnings: ${result.warnings}`);
    outputChannel.appendLine(`Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    outputChannel.appendLine('');
    
    // Show summary if available
    if (result.summary) {
      outputChannel.appendLine(`Tools run: ${result.summary.toolsRun.join(', ')}`);
      outputChannel.appendLine(`Execution time: ${(result.summary.executionTime / 1000).toFixed(2)}s`);
      outputChannel.appendLine('');
    }
    
    outputChannel.appendLine(result.report);
    outputChannel.show(true);

    // Show notification
    if (!passed) {
      vscode.window.showWarningMessage(
        `AIReady: Score ${score} below threshold ${threshold}`
      );
    } else {
      vscode.window.showInformationMessage(
        `AIReady: Score ${score}/100 - ${result.issues} issues`
      );
    }

  } catch (error) {
    updateStatusBar('AIReady: Error', true);
    const message = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`AIReady scan failed: ${message}`);
    outputChannel.appendLine(`Error: ${message}`);
    outputChannel.show();
  }
}

function showReport(): void {
  outputChannel.show();
}

function openSettings(): void {
  vscode.commands.executeCommand('workbench.action.openSettings', 'aiready');
}

function updateStatusBar(text: string, isError: boolean): void {
  statusBarItem.text = text;
  statusBarItem.tooltip = 'Click to show AIReady report';
  statusBarItem.color = isError ? new vscode.ThemeColor('errorForeground') : undefined;
  statusBarItem.show();
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  if (outputChannel) {
    outputChannel.dispose();
  }
}