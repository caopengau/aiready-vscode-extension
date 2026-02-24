import * as vscode from 'vscode';

export interface Summary {
  score: number;
  issues: number;
  warnings: number;
  breakdown?: Array<{
    toolName: string;
    score: number;
    rating: string;
  }>;
  issueBreakdown?: {
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
  // Business metrics (v0.10+)
  estimatedMonthlyCost?: number;
  estimatedDeveloperHours?: number;
  aiAcceptanceRate?: number;
}

// Tree item for summary view
export class AIReadySummaryProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private summary: Summary | null = null;

  refresh(summary: Summary | null = null): void {
    this.summary = summary;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  private getScoreColor(score: number): string {
    if (score >= 70) return '#4caf50'; // green
    if (score >= 50) return '#ff9800'; // orange
    return '#f44336'; // red
  }

  private getScoreIcon(score: number): string {
    if (score >= 70) return 'check';
    if (score >= 50) return 'warning';
    return 'error';
  }

  private createBarChart(score: number, width: number = 20): string {
    const filled = Math.round((score / 100) * width);
    const empty = width - filled;
    const color = this.getScoreColor(score);
    return `█`.repeat(filled) + `░`.repeat(empty);
  }

  private createScoreGauge(score: number): string {
    // Simple ASCII gauge
    if (score >= 90) return `🎉 ${score}`;
    if (score >= 70) return `✅ ${score}`;
    if (score >= 50) return `⚠️ ${score}`;
    return `❌ ${score}`;
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

      const items: vscode.TreeItem[] = [];

      // Header with score gauge
      const scoreGauge = this.createScoreGauge(this.summary.score);
      const statusText = this.summary.score >= 70 ? '✓ Passed' : 
                        this.summary.score >= 50 ? '⚡ Needs Work' : '✗ Failing';
      items.push({
        label: `AI Readiness: ${scoreGauge}/100`,
        iconPath: new vscode.ThemeIcon(this.getScoreIcon(this.summary.score)),
        description: statusText,
        contextValue: 'score'
      } as vscode.TreeItem);

      // Visual bar
      const bar = this.createBarChart(this.summary.score, 15);
      items.push({
        label: `${bar} ${this.summary.score}%`,
        iconPath: new vscode.ThemeIcon('horizontal-line'),
        contextValue: 'bar'
      } as vscode.TreeItem);

      // Separator
      items.push({
        label: '─── Issues ───',
        contextValue: 'separator'
      } as vscode.TreeItem);

      // Issue counts with visual indicators
      const totalIssues = this.summary.issues + this.summary.warnings;
      items.push({
        label: `🔴 Critical: ${this.summary.issueBreakdown?.critical || 0}`,
        iconPath: new vscode.ThemeIcon('error'),
        contextValue: 'critical'
      } as vscode.TreeItem);
      items.push({
        label: `🟡 Major: ${this.summary.issueBreakdown?.major || this.summary.issues}`,
        iconPath: new vscode.ThemeIcon('warning'),
        contextValue: 'major'
      } as vscode.TreeItem);
      items.push({
        label: `🔵 Minor: ${this.summary.issueBreakdown?.minor || this.summary.warnings}`,
        iconPath: new vscode.ThemeIcon('info'),
        contextValue: 'minor'
      } as vscode.TreeItem);

      // Separator
      items.push({
        label: '─── Tool Scores ───',
        contextValue: 'separator'
      } as vscode.TreeItem);

      // Add tool breakdown with bars
      if (this.summary.breakdown && this.summary.breakdown.length > 0) {
        this.summary.breakdown.forEach((tool) => {
          const bar = this.createBarChart(tool.score, 12);
          items.push({
            label: `${bar} ${tool.score}`,
            iconPath: new vscode.ThemeIcon(
              tool.score >= 70 ? 'check' : 
              tool.score >= 50 ? 'warning' : 'error'
            ),
            description: tool.toolName,
            tooltip: `${tool.toolName}: ${tool.score}/100 (${tool.rating})`
          } as vscode.TreeItem);
        });
      } else {
        // Show placeholder if no breakdown
        items.push({
          label: '─── Quick Actions ───',
          contextValue: 'separator'
        } as vscode.TreeItem);
      }

      // Business metrics section (v0.10+)
      if (this.summary.estimatedMonthlyCost || this.summary.estimatedDeveloperHours || this.summary.aiAcceptanceRate) {
        items.push({
          label: '─── Business Impact ───',
          contextValue: 'separator'
        } as vscode.TreeItem);

        // Monthly cost
        if (this.summary.estimatedMonthlyCost) {
          const costFormatted = this.summary.estimatedMonthlyCost >= 1000 
            ? `$${(this.summary.estimatedMonthlyCost / 1000).toFixed(1)}k`
            : `$${this.summary.estimatedMonthlyCost.toFixed(0)}`;
          items.push({
            label: `💰 Monthly Cost: ${costFormatted}`,
            iconPath: new vscode.ThemeIcon('dollar'),
            description: 'AI context waste',
            contextValue: 'metric'
          } as vscode.TreeItem);
        }

        // Developer hours
        if (this.summary.estimatedDeveloperHours) {
          const hoursFormatted = this.summary.estimatedDeveloperHours >= 40 
            ? `${(this.summary.estimatedDeveloperHours / 40).toFixed(1)} weeks`
            : `${this.summary.estimatedDeveloperHours.toFixed(1)}h`;
          items.push({
            label: `⏱️ Fix Time: ${hoursFormatted}`,
            iconPath: new vscode.ThemeIcon('clock'),
            description: 'to resolve issues',
            contextValue: 'metric'
          } as vscode.TreeItem);
        }

        // AI acceptance rate
        if (this.summary.aiAcceptanceRate) {
          const ratePercent = Math.round(this.summary.aiAcceptanceRate * 100);
          items.push({
            label: `🤖 AI Acceptance: ${ratePercent}%`,
            iconPath: new vscode.ThemeIcon('lightbulb'),
            description: 'suggestion acceptance',
            contextValue: 'metric'
          } as vscode.TreeItem);
        }
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
        label: '$(graph) Open Charts',
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
