import * as vscode from 'vscode';
import { ScanReport, findAllReports } from './reportsProvider';
import { generateReportDetailHTML } from '../utils/chartUtils';

export class ReportDetailView {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Show the report detail view for a given report
   */
  showReport(report: ScanReport): void {
    // Get workspace path
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    let recentScores: number[] = [];
    
    if (workspacePath) {
      const allReports = findAllReports(workspacePath);
      // Get scores from all reports (most recent first)
      recentScores = allReports
        .slice(0, 10)  // Last 10 reports
        .map(r => r.score)
        .reverse();  // Reverse so oldest is first for the chart
    }

    // Create or show existing panel
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'aiready.reportDetail',
        `AIReady Report - ${report.fileName}`,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      // Dispose panel when closed
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });
    }

    // Set the HTML content
    this.panel.webview.html = generateReportDetailHTML(report, recentScores);
  }

  /**
   * Close the current panel
   */
  close(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }
}
