import * as vscode from 'vscode';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let issuesProvider: AIReadyIssuesProvider;
let summaryProvider: AIReadySummaryProvider;

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

// Tree item for issues view
class AIReadyIssuesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private issues: any[] = [];

  refresh(issues: any[] = []): void {
    this.issues = issues;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!element) {
      if (this.issues.length === 0) {
        return [
          {
            label: 'Run a scan to see issues',
            iconPath: new vscode.ThemeIcon('info'),
            command: {
              command: 'aiready.scan',
              title: 'Run Scan'
            }
          } as vscode.TreeItem
        ];
      }
      return this.issues.map(issue => {
        const item = new vscode.TreeItem(
          issue.message || 'Issue',
          vscode.TreeItemCollapsibleState.None
        );
        item.iconPath = new vscode.ThemeIcon(
          issue.severity === 'critical' ? 'error' :
          issue.severity === 'major' ? 'warning' : 'info'
        );
        item.description = issue.location?.file || '';
        return item;
      });
    }
    return [];
  }
}

// Tree item for summary view
class AIReadySummaryProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private summary: any = null;

  refresh(summary: any = null): void {
    this.summary = summary;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!element) {
      if (!this.summary) {
        return [
          {
            label: '$(play) Run Scan',
            iconPath: new vscode.ThemeIcon('play'),
            command: {
              command: 'aiready.scan',
              title: 'Run Scan'
            }
          } as vscode.TreeItem,
          {
            label: '$(graph) Run Visualizer',
            iconPath: new vscode.ThemeIcon('graph'),
            command: {
              command: 'aiready.visualize',
              title: 'Run Visualizer'
            }
          } as vscode.TreeItem,
          {
            label: '$(gear) Open Settings',
            iconPath: new vscode.ThemeIcon('gear'),
            command: {
              command: 'aiready.openSettings',
              title: 'Open Settings'
            }
          } as vscode.TreeItem
        ];
      }
      
      const items: vscode.TreeItem[] = [
        {
          label: `Score: ${this.summary.score}/100`,
          iconPath: new vscode.ThemeIcon(
            this.summary.score >= 70 ? 'check' : 
            this.summary.score >= 50 ? 'warning' : 'error'
          ),
          description: this.summary.score >= 70 ? 'Passed' : 
                       this.summary.score >= 50 ? 'Needs work' : 'Failing'
        } as vscode.TreeItem,
        {
          label: `Issues: ${this.summary.issues}`,
          iconPath: new vscode.ThemeIcon('error')
        } as vscode.TreeItem,
        {
          label: `Warnings: ${this.summary.warnings}`,
          iconPath: new vscode.ThemeIcon('warning')
        } as vscode.TreeItem,
      ];

      // Add tool breakdown
      if (this.summary.breakdown) {
        this.summary.breakdown.forEach((tool: any) => {
          items.push({
            label: `${tool.toolName}: ${tool.score}/100`,
            iconPath: new vscode.ThemeIcon(
              tool.score >= 70 ? 'check' : 
              tool.score >= 50 ? 'warning' : 'error'
            ),
            description: tool.rating
          } as vscode.TreeItem);
        });
      }

      // Add action buttons
      items.push({
        label: '',
        contextValue: 'separator'
      } as vscode.TreeItem);
      items.push({
        label: '$(play) Run Scan Again',
        iconPath: new vscode.ThemeIcon('play'),
        command: {
          command: 'aiready.scan',
          title: 'Run Scan'
        }
      } as vscode.TreeItem);
      items.push({
        label: '$(graph) Run Visualizer',
        iconPath: new vscode.ThemeIcon('graph'),
        command: {
          command: 'aiready.visualize',
          title: 'Run Visualizer'
        }
      } as vscode.TreeItem);

      return items;
    }
    return [];
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('AIReady extension is now active!');

  outputChannel = vscode.window.createOutputChannel('AIReady');

  // Create tree data providers
  issuesProvider = new AIReadyIssuesProvider();
  summaryProvider = new AIReadySummaryProvider();

  // Register tree views
  const issuesView = vscode.window.createTreeView('aiready.issues', {
    treeDataProvider: issuesProvider,
    showCollapseAll: false
  });

  const summaryView = vscode.window.createTreeView('aiready.summary', {
    treeDataProvider: summaryProvider,
    showCollapseAll: false
  });

  context.subscriptions.push(issuesView, summaryView);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'aiready.showReport';
  context.subscriptions.push(statusBarItem);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('aiready.scan', scanWorkspace),
    vscode.commands.registerCommand('aiready.quickScan', quickScan),
    vscode.commands.registerCommand('aiready.visualize', runVisualizer),
    vscode.commands.registerCommand('aiready.showReport', showReport),
    vscode.commands.registerCommand('aiready.openSettings', openSettings)
  );

  // Show initial status bar
  const config = vscode.workspace.getConfiguration('aiready');
  if (config.get<boolean>('showStatusBar', SMART_DEFAULTS.showStatusBar)) {
    updateStatusBar('$(shield) AIReady', false);
  }

  // Auto-scan on save if enabled
  if (config.get<boolean>('autoScan', SMART_DEFAULTS.autoScan)) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        if (document.uri.scheme === 'file') {
          quickScan();
        }
      })
    );
  }

  // Initial refresh of views
  issuesProvider.refresh();
  summaryProvider.refresh();
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
      patterns?: any[];
      context?: any[];
      consistency?: any;
    } = JSON.parse(stdout);

    // Determine score - use scoring.overallScore if available, else result.score
    const score = result.scoring?.overallScore ?? result.score ?? 0;
    
    // Update status bar
    const passed = score >= threshold;
    updateStatusBar(
      `$(shield) AIReady: ${score}`,
      !passed
    );

    // Update sidebar views
    const allIssues = [
      ...(result.patterns?.flatMap((p: any) => p.issues || []) || []),
      ...(result.context || []),
      ...(result.consistency?.results?.flatMap((r: any) => r.issues || []) || [])
    ];
    
    issuesProvider.refresh(allIssues);
    summaryProvider.refresh({
      score,
      issues: result.issues,
      warnings: result.warnings,
      breakdown: result.scoring?.breakdown
    });

    // Show summary in output channel
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

    // Show notification with option to visualize
    const action = await vscode.window.showInformationMessage(
      `AIReady: Score ${score}/100 - ${result.issues} issues`,
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

async function runVisualizer(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  
  updateStatusBar('$(sync~spin) Starting visualizer...', false);
  
  try {
    outputChannel.clear();
    outputChannel.appendLine('═══════════════════════════════════════');
    outputChannel.appendLine('    AIReady Visualization Generator    ');
    outputChannel.appendLine('═══════════════════════════════════════');
    outputChannel.appendLine('');
    outputChannel.appendLine('Starting interactive visualization...');
    outputChannel.show();
    
    // Run the visualizer command with --dev flag to start dev server
    outputChannel.appendLine('Running: npx @aiready/cli visualize --dev');
    outputChannel.appendLine('');
    
    // Use spawn for long-running process
    const child = spawn('npx', ['@aiready/cli', 'visualize', '--dev'], {
      cwd: workspacePath,
      shell: true,
      stdio: 'inherit'
    });
    
    child.on('error', (error: Error) => {
      outputChannel.appendLine(`Error: ${error.message}`);
      updateStatusBar('$(shield) AIReady: Error', true);
    });
    
    updateStatusBar('$(graph) AIReady: Visualizer', false);
    
    vscode.window.showInformationMessage(
      'AIReady: Visualizer started. Check the output panel for the URL (usually http://localhost:5173)'
    );
    
  } catch (error) {
    updateStatusBar('$(shield) AIReady: Error', true);
    const message = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`AIReady visualizer failed: ${message}`);
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