import * as vscode from 'vscode';

// Smart defaults matching CLI behavior (all scoring spokes)
export const SMART_DEFAULTS = {
  threshold: 70,
  tools: [
    'patterns',
    'context',
    'consistency',
    'aiSignalClarity',
    'grounding',
    'testability',
    'doc-drift',
    'deps-health',
  ] as const,
  failOn: 'critical' as const,
  autoScan: false,
  showStatusBar: true,
  excludePatterns: ['node_modules/**', 'dist/**', '.git/**', '**/*.min.js', '**/build/**'],
};


export interface AIReadyConfig {
  threshold: number;
  tools: string[];
  failOn: string;
  autoScan: boolean;
  showStatusBar: boolean;
  excludePatterns: string[];
}

/**
 * Get merged configuration with smart defaults (matching CLI behavior)
 */
export function getMergedConfig(): AIReadyConfig {
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