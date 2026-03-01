# AIReady VS Code Extension

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/aiready.aiready?label=VS%20Code%20Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=aiready.aiready)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Real-time AI readiness analysis in VS Code.** Detect issues that confuse AI models before they become problems.

## Features

- 🛡️ **Real-time Analysis** - See your AI readiness score in the status bar
- 📊 **Issue Explorer** - Browse detected issues in the sidebar
- ⚡ **Quick Scan** - Analyze current file with a single command
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

### Configuration

| Setting                 | Default                                  | Description               |
| ----------------------- | ---------------------------------------- | ------------------------- |
| `aiready.threshold`     | `70`                                     | Minimum score to pass     |
| `aiready.failOn`        | `critical`                               | Severity level to fail on |
| `aiready.tools`         | `["patterns", "context", "consistency"]` | Tools to run              |
| `aiready.autoScan`      | `false`                                  | Auto-scan on file save    |
| `aiready.showStatusBar` | `true`                                   | Show score in status bar  |

### Status Bar

The extension shows your AI readiness score in the status bar:

- ✅ **70+** - Good AI readiness
- ⚠️ **50-69** - Needs improvement
- ❌ **<50** - Critical issues detected

## What AIReady Detects

### Pattern Detection

- Semantic duplicates (same logic, different code)
- Copy-paste code patterns
- Similar function implementations

### Context Analysis

- Deep import chains
- Context window cost estimation
- Files that fragment AI understanding

### Consistency Check

- Naming convention violations
- Inconsistent patterns across codebase
- Mixed coding styles

## Requirements

- VS Code 1.85.0 or higher
- Node.js 18+ (for CLI execution)

## Known Issues

- Large repositories may take longer to scan
- First scan requires npm to install CLI

## Release Notes

### 0.1.0

Initial release:

- Workspace scanning
- Quick file scan
- Issue explorer
- Status bar integration
- Configurable thresholds

## Links

- [Documentation](https://getaiready.dev/docs)
- [GitHub (CLI)](https://github.com/caopengau/aiready-cli)
- [GitHub (Extension)](https://github.com/caopengau/aiready-vscode-extension)
- [Issues](https://github.com/caopengau/aiready-vscode-extension/issues)
- [npm @aiready/cli](https://www.npmjs.com/package/@aiready/cli)

---

**Enjoy coding with AI-ready code!** 🚀
</task_progress>
</write_to_file>
