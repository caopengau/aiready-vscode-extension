import * as vscode from 'vscode';

export class MetricsViewProvider {
  public static readonly viewType = 'aiready.metricsDetail';

  public static show(context: vscode.ExtensionContext, metricId?: string) {
    const panel = vscode.window.createWebviewPanel(
      this.viewType,
      'AIReady Methodology',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = this.getHtmlContent(panel.webview, metricId);
  }

  private static getHtmlContent(
    webview: vscode.Webview,
    targetMetricId?: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg: #0a0a0f;
      --card-bg: #111118;
      --border: #1e1e26;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --cyan: #06b6d4;
      --emerald: #10b981;
      --rose: #f43f5e;
      --indigo: #6366f1;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 40px 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; text-align: center; }
    .subtitle { text-align: center; color: var(--text-muted); margin-bottom: 40px; font-size: 18px; }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      scroll-margin-top: 20px;
    }
    .metric-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .metric-name { font-size: 24px; font-weight: 700; margin: 0; }
    .tag {
      font-size: 10px;
      font-bold: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      background: rgba(6, 182, 212, 0.1);
      color: var(--cyan);
      padding: 4px 12px;
      border-radius: 100px;
      border: 1px solid rgba(6, 182, 212, 0.2);
    }
    .section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-muted);
      margin: 24px 0 8px 0;
    }
    .grid { display: grid; grid-cols: 1; gap: 24px; }
    @media (min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }
    .code-container {
      background: #000;
      border-radius: 8px;
      padding: 16px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
      overflow-x: auto;
      margin-top: 8px;
    }
    .bad-code { border-left: 4px solid var(--rose); }
    .good-code { border-left: 4px solid var(--emerald); }
    .threshold-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .threshold-score { font-weight: 900; color: var(--cyan); width: 40px; }
    .threshold-label { font-weight: 700; }
    .threshold-detail { color: var(--text-muted); }
    ul { padding-left: 20px; margin: 0; }
    li { margin-bottom: 4px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>AI Readiness Methodology</h1>
  <p class="subtitle">Deep dive into the 9 metrics that define AI-friendly code.</p>

  <div id="semantic-duplicates" class="metric-card">
    <div class="metric-header">
      <h2 class="metric-name">Semantic Duplicates</h2>
      <span class="tag">Efficiency</span>
    </div>
    <p>${metrics[0].description}</p>
    
    <div class="section-title">The "How"</div>
    <p style="font-size: 14px;">${metrics[0].how}</p>

    <div class="grid">
      <div>
        <div class="section-title">Thresholds</div>
        <div class="threshold-row"><span class="threshold-score">90+</span> <div><span class="threshold-label">Excellent</span><br/><span class="threshold-detail">&lt; 1% duplication across domain logic.</span></div></div>
        <div class="threshold-row"><span class="threshold-score">&lt; 50</span> <div><span class="threshold-label">Critical</span><br/><span class="threshold-detail">Core business logic repeated in multiple places.</span></div></div>
      </div>
      <div>
        <div class="section-title">Refactoring Playbook</div>
        <ul style="font-size: 13px;">
          <li>Identify "Hidden Singletons"</li>
          <li>Use Higher-Order Functions</li>
          <li>Consolidate API handlers</li>
        </ul>
      </div>
    </div>

    <div class="grid" style="margin-top: 24px;">
      <div>
        <div class="section-title" style="color: var(--rose);">Before (The Debt)</div>
        <div class="code-container bad-code">
          <pre>function validate(u) {\n  return u.id && u.email.includes('@');\n}\n\nconst isValid = (user) => {\n  return user.id && user.email.indexOf('@') !== -1;\n}</pre>
        </div>
      </div>
      <div>
        <div class="section-title" style="color: var(--emerald);">After (AI-Ready)</div>
        <div class="code-container good-code">
          <pre>export const isUserValid = (user: User) => {\n  return !!(user.id && user.email.includes('@'));\n};</pre>
        </div>
      </div>
    </div>
  </div>

  <!-- Repeat for other 8 metrics -->
  <div id="context-fragmentation" class="metric-card">
    <div class="metric-header">
      <h2 class="metric-name">Context Fragmentation</h2>
      <span class="tag">Context</span>
    </div>
    <p>${metrics[1].description}</p>
    <div class="section-title">The "How"</div>
    <p style="font-size: 14px;">${metrics[1].how}</p>
    <div class="grid" style="margin-top: 24px;">
      <div>
        <div class="section-title" style="color: var(--rose);">Before (Debt)</div>
        <div class="code-container bad-code"><pre>import { UserType } from '../../types/user';\nimport { saveUser } from '../../api/user';\nimport { validateUser } from '../../utils/validation';</pre></div>
      </div>
      <div>
        <div class="section-title" style="color: var(--emerald);">After (AI-Ready)</div>
        <div class="code-container good-code"><pre>import { UserType, saveUser, validateUser } from '../features/user';</pre></div>
      </div>
    </div>
  </div>

  <div id="naming-consistency" class="metric-card">
    <div class="metric-header">
      <h2 class="metric-name">Naming Consistency</h2>
      <span class="tag">Clarity</span>
    </div>
    <p>${metrics[2].description}</p>
    <div class="section-title">The "How"</div>
    <p style="font-size: 14px;">${metrics[2].how}</p>
  </div>

  <div id="dependency-health" class="metric-card">
    <div class="metric-header">
      <h2 class="metric-name">Dependency Health</h2>
      <span class="tag">Security</span>
    </div>
    <p>${metrics[3].description}</p>
    <div class="section-title">The "How"</div>
    <p style="font-size: 14px;">${metrics[3].how}</p>
  </div>

  <div id="change-amplification" class="metric-card">
    <div class="metric-header">
      <h2 class="metric-name">Change Amplification</h2>
      <span class="tag">Coupling</span>
    </div>
    <p>${metrics[4].description}</p>
    <div class="section-title">The "How"</div>
    <p style="font-size: 14px;">${metrics[4].how}</p>
  </div>

  <div id="ai-signal-clarity" class="metric-card">
    <div class="metric-header">
      <h2 class="metric-name">AI Signal Clarity</h2>
      <span class="tag">Context</span>
    </div>
    <p>${metrics[5].description}</p>
    <div class="section-title">The "How"</div>
    <p style="font-size: 14px;">${metrics[5].how}</p>
  </div>

  <div id="documentation-health" class="metric-card">
    <div class="metric-header">
      <h2 class="metric-name">Documentation Health</h2>
      <span class="tag">Clarity</span>
    </div>
    <p>${metrics[6].description}</p>
    <div class="section-title">The "How"</div>
    <p style="font-size: 14px;">${metrics[6].how}</p>
  </div>

  <div id="agent-grounding" class="metric-card">
    <div class="metric-header">
      <h2 class="metric-name">Agent Grounding</h2>
      <span class="tag">Navigation</span>
    </div>
    <p>${metrics[7].description}</p>
    <div class="section-title">The "How"</div>
    <p style="font-size: 14px;">${metrics[7].how}</p>
  </div>

  <div id="testability-index" class="metric-card">
    <div class="metric-header">
      <h2 class="metric-name">Testability Index</h2>
      <span class="tag">Verification</span>
    </div>
    <p>${metrics[8].description}</p>
    <div class="section-title">The "How"</div>
    <p style="font-size: 14px;">${metrics[8].how}</p>
  </div>

  <script>
    if ("${targetMetricId || ''}") {
      const el = document.getElementById("${targetMetricId}");
      if (el) el.scrollIntoView();
    }
  </script>
</body>
</html>
    `;
  }
}

const metrics = [
  {
    id: 'semantic-duplicates',
    name: 'Semantic Duplicates',
    description:
      'Detects logic that is repeated but written in different ways.',
    how: 'Uses Jaccard similarity on AST (Abstract Syntax Tree) tokens to identify structurally identical logic.',
  },
  {
    id: 'context-fragmentation',
    name: 'Context Fragmentation',
    description: 'Analyzes how scattered related logic is across the codebase.',
    how: 'Calculates the "Token Distance" between a file and its dependencies by recursively traversing the import graph.',
  },
  {
    id: 'naming-consistency',
    name: 'Naming Consistency',
    description:
      'Measures how consistently variables, functions, and classes are named.',
    how: 'Uses token entropy and lexical pattern matching to detect naming drift.',
  },
  {
    id: 'dependency-health',
    name: 'Dependency Health',
    description:
      'Measures the stability, security, and freshness of your project dependencies.',
    how: 'Cross-references your dependency graph with CVE databases and ecosystem staleness metrics.',
  },
  {
    id: 'change-amplification',
    name: 'Change Amplification',
    description:
      'Tracks how many places need to change when a single requirement evolves.',
    how: 'Measures "Coupling Density" by analyzing co-change frequency and shared constant usage.',
  },
  {
    id: 'ai-signal-clarity',
    name: 'AI Signal Clarity',
    description:
      'Measures the ratio of "signal" (actual logic) to "noise" (boilerplate, dead code).',
    how: 'Uses a signal-to-noise algorithm that weights domain-specific logic against framework boilerplate.',
  },
  {
    id: 'documentation-health',
    name: 'Documentation Health',
    description: 'Checks for missing, outdated, or misleading documentation.',
    how: 'Analyzes the semantic alignment between docstrings and implementation using a "Drift Detection" algorithm.',
  },
  {
    id: 'agent-grounding',
    name: 'Agent Grounding',
    description:
      'Assesses how easily an AI agent can navigate your project structure.',
    how: 'Evaluates project topology against "Discovery Benchmarks" for common frameworks.',
  },
  {
    id: 'testability-index',
    name: 'Testability Index',
    description:
      'Quantifies how easy it is for an AI to write and run tests for your code.',
    how: 'Analyzes cyclomatic complexity, side-effect density, and external dependency mocking requirements.',
  },
];
