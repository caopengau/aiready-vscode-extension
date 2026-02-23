import * as vscode from 'vscode';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, basename } from 'path';

export interface ScanReport {
  id: string;
  fileName: string;
  filePath: string;
  timestamp: Date;
  score: number;
  rating: string;
  totalIssues: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  infoIssues: number;
  tools: Array<{
    name: string;
    score: number;
    rating: string;
  }>;
}

/**
 * Find all AIReady report files in the workspace
 */
export function findAllReports(workspacePath: string): ScanReport[] {
  const aireadyDir = join(workspacePath, '.aiready');
  
  if (!existsSync(aireadyDir)) {
    return [];
  }
  
  try {
    const files = readdirSync(aireadyDir)
      .filter((f) => f.startsWith('aiready-report-') && f.endsWith('.json'))
      .map((f) => {
        const filePath = join(aireadyDir, f);
        const stats = statSync(filePath);
        return {
          name: f,
          path: filePath,
          mtime: stats.mtime
        };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    // Parse each report file to extract metadata
    const reports: ScanReport[] = [];
    
    for (const file of files) {
      try {
        const content = readFileSync(file.path, 'utf8');
        const data = JSON.parse(content);
        
        // Extract score
        const score = data.scoring?.overall ?? 0;
        const rating = data.scoring?.rating ?? 'Unknown';
        
        // Extract timestamp from report
        const timestamp = data.scoring?.timestamp 
          ? new Date(data.scoring.timestamp) 
          : file.mtime;
        
        // Count issues
        let totalIssues = 0;
        let criticalIssues = 0;
        let majorIssues = 0;
        let minorIssues = 0;
        let infoIssues = 0;
        
        // Pattern issues
        data.patterns?.forEach((p: any) => {
          p.issues?.forEach((issue: any) => {
            totalIssues++;
            if (issue.severity === 'critical') criticalIssues++;
            else if (issue.severity === 'major') majorIssues++;
            else if (issue.severity === 'minor') minorIssues++;
            else infoIssues++;
          });
        });
        
        // Context issues
        data.context?.forEach((issue: any) => {
          totalIssues++;
          if (issue.severity === 'critical') criticalIssues++;
          else if (issue.severity === 'major') majorIssues++;
          else if (issue.severity === 'minor') minorIssues++;
          else infoIssues++;
        });
        
        // Consistency issues
        data.consistency?.results?.forEach((r: any) => {
          r.issues?.forEach((issue: any) => {
            totalIssues++;
            if (issue.severity === 'critical') criticalIssues++;
            else if (issue.severity === 'major') majorIssues++;
            else if (issue.severity === 'minor') minorIssues++;
            else infoIssues++;
          });
        });
        
        // Extract tool breakdown
        const tools: Array<{ name: string; score: number; rating: string }> = [];
        data.scoring?.breakdown?.forEach((tool: any) => {
          tools.push({
            name: tool.toolName,
            score: tool.score,
            rating: tool.rating ?? getRatingFromScore(tool.score)
          });
        });
        
        reports.push({
          id: file.name.replace('aiready-report-', '').replace('.json', ''),
          fileName: file.name,
          filePath: file.path,
          timestamp,
          score,
          rating,
          totalIssues,
          criticalIssues,
          majorIssues,
          minorIssues,
          infoIssues,
          tools
        });
      } catch (e) {
        // Skip invalid files
        console.error(`Failed to parse report ${file.path}:`, e);
      }
    }
    
    return reports;
  } catch (e) {
    console.error('Error reading .aiready directory:', e);
    return [];
  }
}

function getRatingFromScore(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Needs Work';
  return 'Critical';
}

// Tree item for reports view
export class AIReadyReportsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private reports: ScanReport[] = [];
  private workspacePath: string = '';

  refresh(workspacePath?: string): void {
    if (workspacePath) {
      this.workspacePath = workspacePath;
    }
    this.reports = this.workspacePath ? findAllReports(this.workspacePath) : [];
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
    if (!element) {
      if (this.reports.length === 0) {
        return [
          {
            label: '$(play) Run first scan',
            iconPath: new vscode.ThemeIcon('play'),
            command: {
              command: 'aiready.scan',
              title: 'Run Scan'
            }
          } as vscode.TreeItem,
          {
            label: 'No previous reports found',
            iconPath: new vscode.ThemeIcon('info'),
            description: 'Run a scan to generate your first report'
          } as vscode.TreeItem
        ];
      }
      
      // Show reports (limit to last 20)
      return this.reports.slice(0, 20).map((report) => {
        const item = new vscode.TreeItem(
          this.formatDate(report.timestamp),
          vscode.TreeItemCollapsibleState.None
        );
        
        // Icon based on score
        const iconName = report.score >= 70 ? 'check' : 
                        report.score >= 50 ? 'warning' : 'error';
        item.iconPath = new vscode.ThemeIcon(iconName);
        
        // Description shows score and issue count
        item.description = `Score: ${report.score}/100 • ${report.totalIssues} issues`;
        
        // Store report data in the item
        (item as any).report = report;
        
        // Make it clickable to show details
        item.command = {
          command: 'aiready.showReportDetail',
          title: 'Show Report Details',
          arguments: [report]
        };
        
        return item;
      });
    }
    return [];
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }
}
