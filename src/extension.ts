import * as vscode from 'vscode';
import { SMART_DEFAULTS } from './utils/config';
import {
  AIReadyIssuesProvider,
  GroupBy,
  SeverityFilter,
} from './providers/issuesProvider';
import { AIReadySummaryProvider } from './providers/summaryProvider';
import {
  AIReadyReportsProvider,
  ScanReport,
} from './providers/reportsProvider';
import { ReportDetailView } from './providers/reportDetailView';
import { createScanCommands } from './commands/scan';
import { createVisualizeCommand } from './commands/visualize';

let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let reportsProvider: AIReadyReportsProvider;
let reportDetailView: ReportDetailView;

/**
 * Update the status bar item
 */
function updateStatusBar(text: string, isError: boolean): void {
  statusBarItem.text = text;
  statusBarItem.tooltip = 'Click to show AIReady report';
  statusBarItem.color = isError
    ? new vscode.ThemeColor('errorForeground')
    : undefined;
  statusBarItem.show();
}

export function activate(context: vscode.ExtensionContext) {
  try {
    console.log('AIReady extension is now active!');

    // Create output channel
    outputChannel = vscode.window.createOutputChannel('AIReady');

    // Create tree data providers
    const issuesProvider = new AIReadyIssuesProvider();
    const summaryProvider = new AIReadySummaryProvider();

    // Create reports provider and detail view
    reportsProvider = new AIReadyReportsProvider();
    reportDetailView = new ReportDetailView(context);

    // Register tree views
    const issuesView = vscode.window.createTreeView('aiready.issues', {
      treeDataProvider: issuesProvider,
      showCollapseAll: false,
    });

    const summaryView = vscode.window.createTreeView('aiready.summary', {
      treeDataProvider: summaryProvider,
      showCollapseAll: false,
    });

    const reportsView = vscode.window.createTreeView('aiready.reports', {
      treeDataProvider: reportsProvider,
      showCollapseAll: false,
    });

    context.subscriptions.push(issuesView, summaryView, reportsView);

    // Initialize views
    issuesProvider.refresh();
    summaryProvider.refresh();

    // Load existing reports on startup
    const getWorkspacePath = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    reportsProvider.refresh(getWorkspacePath());

    // Refresh when workspace folders change
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        reportsProvider.refresh(getWorkspacePath());
        issuesProvider.refresh([]); // Clear issues when switching workspace
        summaryProvider.refresh(null);
      })
    );

    // Register showReportDetail command
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'aiready.showReportDetail',
        (report: ScanReport) => {
          reportDetailView.showReport(report);
        }
      )
    );

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.command = 'aiready.showReport';
    context.subscriptions.push(statusBarItem);

    // Create visualize command first (needed by scan commands)
    const { runVisualizer, stopVisualizer } = createVisualizeCommand(
      outputChannel,
      updateStatusBar
    );
    _stopVisualizer = stopVisualizer;

    // Create scan commands
    const { scanWorkspace, quickScan } = createScanCommands(
      outputChannel,
      issuesProvider,
      summaryProvider,
      reportsProvider,
      updateStatusBar,
      runVisualizer
    );

    // Register filter commands for Issues panel
    context.subscriptions.push(
      vscode.commands.registerCommand('aiready.issues.groupBySeverity', () => {
        issuesProvider.setGroupBy('severity');
      }),
      vscode.commands.registerCommand('aiready.issues.groupByTool', () => {
        issuesProvider.setGroupBy('tool');
      }),
      vscode.commands.registerCommand('aiready.issues.groupByFile', () => {
        issuesProvider.setGroupBy('file');
      }),
      vscode.commands.registerCommand('aiready.issues.groupByNone', () => {
        issuesProvider.setGroupBy('none');
      }),
      vscode.commands.registerCommand('aiready.issues.filterAll', () => {
        issuesProvider.setSeverityFilter('all');
      }),
      vscode.commands.registerCommand('aiready.issues.filterCritical', () => {
        issuesProvider.setSeverityFilter('critical');
      }),
      vscode.commands.registerCommand('aiready.issues.filterMajor', () => {
        issuesProvider.setSeverityFilter('major');
      }),
      vscode.commands.registerCommand('aiready.issues.filterMinor', () => {
        issuesProvider.setSeverityFilter('minor');
      })
    );

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand('aiready.scan', scanWorkspace),
      vscode.commands.registerCommand('aiready.quickScan', quickScan),
      vscode.commands.registerCommand('aiready.visualize', runVisualizer),
      vscode.commands.registerCommand('aiready.stopVisualizer', stopVisualizer),
      vscode.commands.registerCommand('aiready.showReport', () =>
        outputChannel.show()
      ),
      vscode.commands.registerCommand('aiready.openSettings', () =>
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'aiready'
        )
      )
    );

    // Show initial status bar
    const config = vscode.workspace.getConfiguration('aiready');
    if (config.get<boolean>('showStatusBar', SMART_DEFAULTS.showStatusBar)) {
      updateStatusBar('$(shield) AIReady', false);
    }

    // Auto-scan on save if enabled
    if (config.get<boolean>('autoScan', SMART_DEFAULTS.autoScan)) {
      context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
          if (document.uri.scheme === 'file') {
            quickScan();
          }
        })
      );
    }
  } catch (error) {
    console.error('Failed to activate AIReady extension:', error);
    vscode.window.showErrorMessage(
      `Failed to activate AIReady extension: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Module-level ref so deactivate() can stop the visualizer
let _stopVisualizer: (() => void) | undefined;

export function deactivate() {
  _stopVisualizer?.();
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  if (outputChannel) {
    outputChannel.dispose();
  }
}
