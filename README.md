# AIReady VS Code Extension

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/aiready.aiready?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=aiready.aiready)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Real-time AI readiness analysis in VS Code.** Detect issues that confuse AI models before they become problems.

## Features

- 🛡️ **Real-time Analysis** - See your AI readiness score in the status bar
- 📊 **Issue Explorer** - Browse detected issues in the sidebar
- ⚡ **Quick Scan** - Analyze current file with a single command
- 🔬 **9-Metric Methodology** - Deep dive into 9 dimensions of AI-readiness
- 🔧 **Configurable** - Set thresholds, severity levels, and more

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "AIReady"
4. Click Install

### Manual Installation

```bash
# Install from VSIX
code --install-extension aiready-vsix
```

## Usage

### Commands

| Command                              | Description                        |
| ------------------------------------ | ---------------------------------- |
| `AIReady: Scan Workspace`            | Run full AI readiness analysis     |
| `AIReady: Quick Scan (Current File)` | Analyze only the active file       |
| `AIReady: Show Report`               | Open the output panel with details |
| `AIReady: Open Settings`             | Configure AIReady options          |
| `AIReady: Show Methodology`          | Deep dive into the 9 metrics       |

### Configuration

| Setting                 | Default                                       | Description               |
| ----------------------- | --------------------------------------------- | ------------------------- |
| `aiready.threshold`     | `70`                                          | Minimum score to pass     |
| `aiready.failOn`        | `critical`                                    | Severity level to fail on |
| `aiready.tools`         | `["patterns", "context", "consistency", ...]` | Tools to run              |
| `aiready.autoScan`      | `false`                                       | Auto-scan on file save    |
| `aiready.showStatusBar` | `true`                                        | Show score in status bar  |

### Status Bar

The extension shows your AI readiness score in the status bar:

- ✅ **70+** - Good AI readiness
- ⚠️ **50-69** - Needs improvement
- ❌ **<50** - Critical issues detected

## The 9 Dimensions of AI-Readiness

AIReady measures your codebase against 9 critical metrics that determine how well AI agents can understand and maintain your code:

1. **Semantic Duplicates** - Logic repeated in different ways that confuses AI context.
2. **Context Fragmentation** - How scattered related logic is across the codebase.
3. **Naming Consistency** - Unified naming patterns that help AI predict your intent.
4. **Dependency Health** - Stability and freshness of your project dependencies.
5. **Change Amplification** - Ripple effects when a single requirement evolves.
6. **AI Signal Clarity** - Ratio of actual logic (signal) to boilerplate/dead code (noise).
7. **Documentation Health** - Accuracy and freshness of docstrings and READMEs.
8. **Agent Grounding** - Ease of navigation for autonomous AI agents.
9. **Testability Index** - Ability for AI to write and run reliable tests for your code.

## Methodology & Deep Dives

Click on any tool score in the sidebar's **Summary** view to open the **AIReady Methodology** deep dive. This view provides:

- **Technical "How":** The engineering logic behind each metric.
- **Scoring Thresholds:** What constitutes a pass vs. a fail.
- **Refactoring Playbook:** Actionable steps to improve your score.
- **Good vs. Bad Examples:** Visual code comparisons.

## Requirements

- VS Code 1.85.0 or higher
- Node.js 18+ (for CLI execution)

## Release Notes

### 0.3.32

- **New 9-Metric Methodology**: Integrated full deep-dive support for all 9 AI-readiness metrics.
- **Methodology Webview**: Added a detailed view explaining detection logic, thresholds, and examples.
- **Interactive Summary**: Click tool scores to see how they are calculated and how to fix them.
- **Refined UI**: Improved issue grouping and visualization.

## Links

- [Documentation](https://getaiready.dev/docs)
- [GitHub (CLI)](https://github.com/caopengau/aiready-cli)
- [GitHub (Extension)](https://github.com/caopengau/aiready-vscode-extension)
- [Issues](https://github.com/caopengau/aiready-vscode-extension/issues)
- [npm @aiready/cli](https://www.npmjs.com/package/@aiready/cli)

---

**Enjoy coding with AI-ready code!** 🚀
