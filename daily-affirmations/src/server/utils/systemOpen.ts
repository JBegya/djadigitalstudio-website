import { execFile } from 'node:child_process';

/** Opens a folder in the OS's file manager (Finder/Explorer/whatever the Linux DE provides). */
export function openInFileManager(targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    // execFile with an argv array — never goes through a shell, so the path can't be
    // interpreted as shell syntax no matter what characters it contains.
    execFile(command, [targetPath], (error) => {
      // Windows' `explorer` returns a non-zero exit code on success in some environments —
      // treat it as best-effort rather than a hard failure.
      if (error && process.platform !== 'win32') reject(error);
      else resolve();
    });
  });
}
