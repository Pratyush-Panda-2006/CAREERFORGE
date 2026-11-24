export class AgritechPrecisionFarmingCodeBlockWidget {
  constructor(clipboard = null) {
    this.clipboard = clipboard ?? (typeof navigator !== 'undefined' ? navigator.clipboard : null);
  }

  formatLineNumbers(text) {
    if (typeof text !== 'string') {
      throw new TypeError('Code text must be a string');
    }
    const lines = text.split('\n');
    return lines.map((line, idx) => ({
      lineNumber: idx + 1,
      lineContent: line
    }));
  }

  async copySnippet(codeText) {
    if (typeof codeText !== 'string') {
      throw new TypeError('Code snippet must be a string');
    }
    if (!this.clipboard || typeof this.clipboard.writeText !== 'function') {
      return false;
    }
    try {
      await this.clipboard.writeText(codeText);
      return true;
    } catch {
      return false;
    }
  }

  triggerCopyFeedback(buttonElement = null) {
    const feedback = { copied: true, message: 'Copied to clipboard!' };
    if (buttonElement) {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = '✓ Copied!';
      buttonElement.classList.add('btn-copied');
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.classList.remove('btn-copied');
      }, 2000);
    }
    return feedback;
  }
}

function mount() {
  const root = document.querySelector('[data-copy-code-lab]');
  if (!root) return;

  const widget = new AgritechPrecisionFarmingCodeBlockWidget();
  const get = id => root.querySelector(`#${id}`);

  const snippetCode = `# Agritech IoT Microcontroller Firmware (Python MicroPython)
from machine import Pin, ADC
import time, network, urequests

sensor_adc = ADC(Pin(34))
sensor_adc.atten(ADC.ATTN_11DB) # 0 - 3.6V range

def read_soil_moisture():
    raw_val = sensor_adc.read()
    moisture_pct = (4095 - raw_val) / 40.95
    return max(0.0, min(100.0, moisture_pct))

while True:
    pct = read_soil_moisture()
    if pct < 35.0:
        print("[IRRIGATE] Soil critically dry ({:.1f}%), triggering valve".format(pct))
    time.sleep(15)`;

  function renderSnippet() {
    const lines = widget.formatLineNumbers(snippetCode);
    const gutter = get('line-numbers');
    const codeArea = get('code-lines');

    if (gutter) {
      gutter.replaceChildren();
      lines.forEach(l => {
        const num = document.createElement('span');
        num.className = 'gutter-num';
        num.textContent = String(l.lineNumber);
        gutter.appendChild(num);
      });
    }

    if (codeArea) {
      codeArea.replaceChildren();
      lines.forEach(l => {
        const lineElem = document.createElement('div');
        lineElem.className = 'code-line';
        lineElem.textContent = l.lineContent || ' ';
        codeArea.appendChild(lineElem);
      });
    }
  }

  get('copy-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    await widget.copySnippet(snippetCode);
    widget.triggerCopyFeedback(btn);

    const tooltip = get('copy-tooltip');
    if (tooltip) {
      tooltip.classList.add('visible');
      setTimeout(() => tooltip.classList.remove('visible'), 2000);
    }
  });

  renderSnippet();
}

if (typeof document !== 'undefined') mount();
