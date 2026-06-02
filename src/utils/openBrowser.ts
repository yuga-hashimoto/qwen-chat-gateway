import { exec } from 'child_process';
import { isMac, isWindows, isLinux } from './platform';

export function openBrowser(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let cmd = '';
    if (isMac()) {
      cmd = `open "${url}"`;
    } else if (isWindows()) {
      cmd = `start "" "${url}"`;
    } else if (isLinux()) {
      cmd = `xdg-open "${url}"`;
    } else {
      return reject(new Error('Unsupported platform'));
    }

    exec(cmd, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
