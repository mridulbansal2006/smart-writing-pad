/** Browser download helpers for writing samples and progress exports. */

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function downloadText(text: string, filename: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  // Give the click a moment before the blob URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `smart-writing-pad-A-2026-11-11-1432.png` */
export function sampleFilename(target: string, when = new Date()): string {
  const label = target ? target.replace(/[^A-Za-z0-9]/g, '') || 'writing' : 'free-writing';
  const pad = (n: number) => `${n}`.padStart(2, '0');
  const stamp = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}-${pad(
    when.getHours(),
  )}${pad(when.getMinutes())}`;
  return `smart-writing-pad-${label}-${stamp}.png`;
}
