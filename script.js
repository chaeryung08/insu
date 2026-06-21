const FILTERS = {
  edge:    { k: [[-1,-1,-1],[-1,8,-1],[-1,-1,-1]], divisor: 1, desc: '경계선을 강조하는 필터입니다. 주변 픽셀과 값이 다른 부분(경계선)에서 큰 값이 나옵니다.' },
  blur:    { k: [[1,1,1],[1,1,1],[1,1,1]],          divisor: 9, desc: '주변 9칸의 평균을 구해 이미지를 부드럽게 흐립니다.' },
  sharpen: { k: [[0,-1,0],[-1,5,-1],[0,-1,0]],      divisor: 1, desc: '중심 픽셀을 강조하여 윤곽을 더 선명하게 만듭니다.' },
};

const srcCanvas = document.getElementById('srcCanvas');
const dstCanvas = document.getElementById('dstCanvas');
const srcCtx = srcCanvas.getContext('2d');
const dstCtx = dstCanvas.getContext('2d');

let srcImageData = null;
let currentKernel = null;
let currentDivisor = 1;

// 이미지 업로드
document.getElementById('upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    srcCtx.clearRect(0, 0, 300, 300);
    srcCtx.drawImage(img, 0, 0, 300, 300);
    srcImageData = srcCtx.getImageData(0, 0, 300, 300);
    dstCtx.clearRect(0, 0, 300, 300);
  };
  img.src = URL.createObjectURL(file);
});

// 필터 버튼 클릭
document.querySelectorAll('.filter-buttons button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-buttons button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectFilter(btn.dataset.name);
  });
});

function selectFilter(name) {
  const f = FILTERS[name];
  currentKernel = f.k.map(row => [...row]);
  currentDivisor = f.divisor;

  document.getElementById('filter-desc').innerHTML = '<b>' + name + ':</b> ' + f.desc;

  buildKernelUI();
  applyConvolution();
}

// 필터 행렬 입력칸 만들기 (3번 문제 해결)
function buildKernelUI() {
  const container = document.getElementById('kernel-inputs');
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'kc';
      input.value = currentKernel[i][j];
      input.dataset.i = i;
      input.dataset.j = j;
      input.addEventListener('input', (e) => {
        const i = +e.target.dataset.i;
        const j = +e.target.dataset.j;
        currentKernel[i][j] = parseFloat(e.target.value) || 0;
        applyConvolution();
      });
      container.appendChild(input);
    }
  }
}

// 합성곱 연산 (2번 문제 해결: divisor로 나눠줌)
function applyConvolution() {
  if (!srcImageData || !currentKernel) return;

  const { width: w, height: h, data: src } = srcImageData;
  const dst = dstCtx.createImageData(w, h);
  dst.data.set(src.data ? src.data : src);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r = 0, g = 0, b = 0;

      for (let m = -1; m <= 1; m++) {
        for (let n = -1; n <= 1; n++) {
          const idx = ((y + m) * w + (x + n)) * 4;
          const kVal = currentKernel[m + 1][n + 1];
          r += src[idx] * kVal;
          g += src[idx + 1] * kVal;
          b += src[idx + 2] * kVal;
        }
      }

      const di = (y * w + x) * 4;
      dst.data[di]     = clamp(r / currentDivisor);
      dst.data[di + 1] = clamp(g / currentDivisor);
      dst.data[di + 2] = clamp(b / currentDivisor);
      dst.data[di + 3] = 255;
    }
  }
  dstCtx.putImageData(dst, 0, 0);
}

function clamp(v) {
  return Math.min(255, Math.max(0, Math.round(v)));
}
