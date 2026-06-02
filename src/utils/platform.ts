import * as fs from 'fs';
import * as os from 'os';

export function isMac(): boolean {
  return os.platform() === 'darwin';
}

export function isWindows(): boolean {
  return os.platform() === 'win32';
}

export function isLinux(): boolean {
  return os.platform() === 'linux';
}

/**
 * ローカルシステム上の既存の Chrome または Edge 実行可能ファイルを探します。
 */
export function findBrowserExecutable(): string | null {
  const platform = os.platform();
  const paths: string[] = [];

  if (platform === 'darwin') {
    paths.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else if (platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env.LOCALAPPDATA || `${process.env.USERPROFILE}\\AppData\\Local`;

    paths.push(
      `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
      `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
      `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
      `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`
    );
  } else if (platform === 'linux') {
    paths.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/chrome'
    );
  }

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}
