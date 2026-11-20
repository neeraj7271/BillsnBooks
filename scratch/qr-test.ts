// Scratch test for QR code matrix generation
function createQrMatrix(text: string): boolean[][] {
  // Let's implement a clean QR generator
  const len = text.length;
  // Size 33x33 for version 4 (fits ~80 bytes)
  const size = 33;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFinder(startR: number, startC: number) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startR + r][startC + c] = isBorder || isCenter;
        isFunction[startR + r][startC + c] = true;
      }
    }
    // Separators
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = startR + r;
        const nc = startC + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          isFunction[nr][nc] = true;
        }
      }
    }
  }

  // 3 Finders
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    isFunction[6][i] = true;
    matrix[i][6] = i % 2 === 0;
    isFunction[i][6] = true;
  }

  // Alignment pattern at (24, 24) for size 33
  const alignR = 24;
  const alignC = 24;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      matrix[alignR + r][alignC + c] = isBorder || isCenter;
      isFunction[alignR + r][alignC + c] = true;
    }
  }

  return matrix;
}

console.log('Matrix size:', createQrMatrix('upi://pay?pa=test@okaxis').length);

