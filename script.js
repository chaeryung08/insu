const FILTERS = {
  edge:    [[-1,-1,-1],[-1,8,-1],[-1,-1,-1]],
  blur:    [[1,1,1],[1,1,1],[1,1,1]],
  sharpen: [[0,-1,0],[-1,5,-1],[0,-1,0]],
};

const srcCanvas = document.getElementById('srcCanvas');
const dstCanvas = document.getElementById('dstCanvas');
const srcCtx = srcCanvas.getContext('2d');
const dstCtx = dstCanvas.getContext('2d');

let srcImageData = null;

// 1. 이미지 업로드 → 캔버스에 그리기 → 픽셀 데이터 추출
document.getElementById('upload').addEventListener('change', (e) => {
  const img = new Image();
  img.onload = () => {
    srcCtx.drawImage(img, 0, 0, 300, 300);
    srcImageData = srcCtx.getImageData(0, 0, 300, 300);
  };
  img.src = URL.createObjectURL(e.target.files[0]);
});

// 2. 필터 버튼 클릭 → 합성곱 적용
document.querySelectorAll('.filter-buttons button').forEach(btn => {
  btn.addEventListener('click', () => {
    applyConvolution(FILTERS[btn.dataset.name]);
  });
});

// 3. 핵심: 합성곱 연산
function applyConvolution(kernel, divisor = 1) {
  const { width: w, height: h, data: src } = srcImageData;
  const dst = dstCtx.createImageData(w, h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r = 0, g = 0, b = 0;

      // 3x3 영역을 훑으면서 곱하고 더하기
      for (let m = -1; m <= 1; m++) {
        for (let n = -1; n <= 1; n++) {
          const idx = ((y + m) * w + (x + n)) * 4;
          const kVal = kernel[m + 1][n + 1];
          r += src[idx] * kVal;
          g += src[idx + 1] * kVal;
          b += src[idx + 2] * kVal;
        }
      }

      const di = (y * w + x) * 4;
      dst.data[di]     = clamp(r / divisor);
      dst.data[di + 1] = clamp(g / divisor);
      dst.data[di + 2] = clamp(b / divisor);
      dst.data[di + 3] = 255;
    }
  }
  dstCtx.putImageData(dst, 0, 0);
}

function clamp(v) {
  return Math.min(255, Math.max(0, Math.round(v)));
}
