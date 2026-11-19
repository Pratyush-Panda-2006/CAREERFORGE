export async function copyText(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard || typeof clipboard.writeText !== 'function') {
    throw new Error('Clipboard access is unavailable');
  }

  await clipboard.writeText(text);
}

if (typeof document !== 'undefined') {
  const copyButtons = document.querySelectorAll('[data-copy-target]');

  copyButtons.forEach((button) => {
    let feedbackTimer;

    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      const feedback = document.getElementById('sampleApiFeedback');
      if (!target) return;

      button.disabled = true;
      button.textContent = 'Copying...';

      try {
        await copyText(target.textContent);
        button.textContent = 'Copied! ✓';
        if (feedback) feedback.textContent = 'Sample command copied to clipboard.';
      } catch {
        button.textContent = 'Copy failed';
        if (feedback) feedback.textContent = 'Clipboard access failed. Select the command and copy it manually.';
      }

      if (feedbackTimer) clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        button.textContent = '⧉ Copy';
        button.disabled = false;
      }, 2000);
    });
  });
}
