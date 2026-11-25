/**
 * Nonprofit Impact - QR Code & Deep-Link Matrix Generator
 */

export class NonprofitImpactQrGenerator {
  constructor(options = {}) {
    this.size = options.size || 21;
    this.moduleColor = options.moduleColor || '#38bdf8';
    this.bgColor = options.bgColor || '#070d18';
  }

  generateQrMatrix(data = 'https://showcase.internal', ecLevel = 'M') {
    const size = this.size;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));

    const placeFinder = (r, c) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
            if (r + i < size && c + j < size) matrix[r + i][c + j] = 1;
          }
        }
      }
    };

    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    let seed = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 31 + data.charCodeAt(i)) >>> 0;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder = (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
        if (!inFinder) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          matrix[r][c] = (seed % 3 === 0 || seed % 5 === 0) ? 1 : 0;
        }
      }
    }

    return { size, matrix, data, ecLevel };
  }

  renderSVG(matrixData) {
    const { size, matrix } = matrixData;
    const cellSize = 12;
    const svgSize = size * cellSize;
    let rects = '';

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] === 1) {
          rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="${this.moduleColor}" />`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}"><rect width="100%" height="100%" fill="${this.bgColor}"/>${rects}</svg>`;
  }

  downloadAsset(svgString, filename = 'nonprofit-impact-qr.svg') {
    if (typeof window === 'undefined') return svgString;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }
}
