import * as vscode from 'vscode';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

let visualizerProcess: ChildProcess | null = null;

export function createVisualizeCommand(
  outputChannel: vscode.OutputChannel,
  updateStatusBar: (text: string, isError: boolean) => void
): { runVisualizer: () => Promise<void>; stopVisualizer: () => void } {
  function stopVisualizer(): void {
    if (visualizerProcess) {
      outputChannel.appendLine('');
      outputChannel.appendLine('🛑 Stopping visualizer...');
      visualizerProcess.kill('SIGTERM');
      visualizerProcess = null;
      updateStatusBar('$(shield) AIReady', false);
      outputChannel.appendLine('✅ Visualizer stopped.');
    } else {
      vscode.window.showInformationMessage(
        'AIReady: No visualizer is currently running.'
      );
    }
  }

  async function runVisualizer(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    // If already running, offer to restart
    if (visualizerProcess) {
      const choice = await vscode.window.showWarningMessage(
        'AIReady: Visualizer is already running. Restart it?',
        'Restart',
        'Stop',
        'Cancel'
      );
      if (choice === 'Cancel' || choice === undefined) {
        return;
      }
      stopVisualizer();
      if (choice === 'Stop') {
        return;
      }
      // Small delay to let the port free up before restarting
      await new Promise((resolve) => setTimeout(resolve, 600));
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
      outputChannel.appendLine('Running: npx @aiready/cli visualise');
      outputChannel.appendLine('');
      outputChannel.show();

      const child = spawn('npx', ['@aiready/cli', 'visualise'], {
        cwd: workspacePath,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      visualizerProcess = child;
      let urlNotified = false;

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        text.split('\n').forEach((line: string) => {
          if (line.trim()) {
            outputChannel.appendLine(line);
          }
        });

        // Detect the local server URL once and offer to open it
        if (!urlNotified) {
          const match = text.match(/https?:\/\/localhost:\d+[^\s]*/);
          if (match) {
            urlNotified = true;
            const url = match[0];
            vscode.window
              .showInformationMessage(
                `AIReady: Visualizer running at ${url}`,
                'Open in Browser',
                'Stop Visualizer'
              )
              .then((action) => {
                if (action === 'Open in Browser') {
                  vscode.env.openExternal(vscode.Uri.parse(url));
                } else if (action === 'Stop Visualizer') {
                  stopVisualizer();
                }
              });
          }
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        data
          .toString()
          .split('\n')
          .forEach((line: string) => {
            if (line.trim()) {
              outputChannel.appendLine(`[stderr] ${line}`);
            }
          });
      });

      child.on('error', (error: Error) => {
        outputChannel.appendLine(`Error: ${error.message}`);
        updateStatusBar('$(shield) AIReady: Error', true);
        vscode.window.showErrorMessage(
          `AIReady visualizer failed: ${error.message}`
        );
        visualizerProcess = null;
      });

      child.on('close', (code: number | null) => {
        visualizerProcess = null;
        updateStatusBar('$(shield) AIReady', false);
        if (code !== 0 && code !== null) {
          outputChannel.appendLine(
            `Visualizer process exited with code ${code}`
          );
        } else {
          outputChannel.appendLine('Visualizer stopped.');
        }
      });

      updateStatusBar('$(graph) AIReady: Visualizer running', false);
    } catch (error) {
      updateStatusBar('$(shield) AIReady: Error', true);
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`AIReady visualizer failed: ${message}`);
      outputChannel.appendLine(`Error: ${message}`);
      outputChannel.show();
      visualizerProcess = null;
    }
  }

  return { runVisualizer, stopVisualizer };
}

/**
 * Install @aiready/visualizer in the workspace
 */
async function installVisualizer(
  workspacePath: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  outputChannel.appendLine('');
  outputChannel.appendLine('📦 Installing @aiready/visualizer...');

  try {
    // Check if pnpm or npm is used
    const usesPnpm = existsSync(join(workspacePath, 'pnpm-lock.yaml'));
    const packageManager = usesPnpm ? 'pnpm' : 'npm';

    outputChannel.appendLine(`Using ${packageManager} to install...`);

    const child = spawn(packageManager, ['add', '-D', '@aiready/visualizer'], {
      cwd: workspacePath,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    child.stdout?.on('data', (data: Buffer) => {
      outputChannel.appendLine(data.toString());
    });

    child.stderr?.on('data', (data: Buffer) => {
      outputChannel.appendLine(`[stderr] ${data.toString()}`);
    });

    child.on('close', (code: number) => {
      if (code === 0) {
        outputChannel.appendLine(
          '✅ @aiready/visualizer installed successfully!'
        );
        vscode.window.showInformationMessage(
          'AIReady: Visualizer installed! Run the visualizer command again to start.'
        );
      } else {
        outputChannel.appendLine(`❌ Installation failed with code ${code}`);
        vscode.window.showErrorMessage(
          'AIReady: Failed to install visualizer. Please install manually: npm install @aiready/visualizer'
        );
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    outputChannel.appendLine(`❌ Installation error: ${message}`);
    vscode.window.showErrorMessage(
      `AIReady: Failed to install visualizer: ${message}`
    );
  }
}

// Reference the helper to avoid unused-function lint warnings in some configs
void installVisualizer;
