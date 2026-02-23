import * as vscode from 'vscode';
import { spawn, execSync } from 'child_process';

export function createVisualizeCommand(
  outputChannel: vscode.OutputChannel,
  updateStatusBar: (text: string, isError: boolean) => void
): () => Promise<void> {
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
      outputChannel.appendLine('');
      outputChannel.appendLine('Running: npx @aiready/cli visualize --serve');
      outputChannel.appendLine('');
      outputChannel.show();
      
      // Use --serve instead of --dev because:
      // - --dev requires @aiready/visualizer to be installed (runs Vite dev server)
      // - --serve generates static HTML and serves it (works out of the box)
      const child = spawn('npx', ['@aiready/cli', 'visualize', '--serve'], {
        cwd: workspacePath,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '0' }
      });
      
      // Pipe stdout to output channel
      child.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            outputChannel.appendLine(line);
          }
        });
      });
      
      // Pipe stderr to output channel
      child.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            outputChannel.appendLine(`[stderr] ${line}`);
          }
        });
      });
      
      child.on('error', (error: Error) => {
        outputChannel.appendLine(`Error: ${error.message}`);
        updateStatusBar('$(shield) AIReady: Error', true);
        vscode.window.showErrorMessage(`AIReady visualizer failed: ${error.message}`);
      });
      
      child.on('close', (code: number) => {
        if (code !== 0 && code !== null) {
          outputChannel.appendLine(`Process exited with code ${code}`);
          updateStatusBar('$(shield) AIReady: Error', true);
        }
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

  return runVisualizer;
}

/**
 * Install @aiready/visualizer in the workspace
 */
async function installVisualizer(workspacePath: string, outputChannel: vscode.OutputChannel): Promise<void> {
  outputChannel.appendLine('');
  outputChannel.appendLine('📦 Installing @aiready/visualizer...');
  
  try {
    // Check if pnpm or npm is used
    const usesPnpm = require('fs').existsSync(require('path').join(workspacePath, 'pnpm-lock.yaml'));
    const packageManager = usesPnpm ? 'pnpm' : 'npm';
    
    outputChannel.appendLine(`Using ${packageManager} to install...`);
    
    const child = spawn(packageManager, ['add', '-D', '@aiready/visualizer'], {
      cwd: workspacePath,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    child.stdout?.on('data', (data: Buffer) => {
      outputChannel.appendLine(data.toString());
    });
    
    child.stderr?.on('data', (data: Buffer) => {
      outputChannel.appendLine(`[stderr] ${data.toString()}`);
    });
    
    child.on('close', (code: number) => {
      if (code === 0) {
        outputChannel.appendLine('✅ @aiready/visualizer installed successfully!');
        vscode.window.showInformationMessage('AIReady: Visualizer installed! Run the visualizer command again to start.');
      } else {
        outputChannel.appendLine(`❌ Installation failed with code ${code}`);
        vscode.window.showErrorMessage('AIReady: Failed to install visualizer. Please install manually: npm install @aiready/visualizer');
      }
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    outputChannel.appendLine(`❌ Installation error: ${message}`);
    vscode.window.showErrorMessage(`AIReady: Failed to install visualizer: ${message}`);
  }
}
