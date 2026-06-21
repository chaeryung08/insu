const FILTERS = {
  ribbon:     { type: 'face', desc: 'CNN 기반 얼굴 인식 모델(TinyFaceDetector)이 얼굴을 찾아서 리본을 달아줍니다' },
  edge:       { type: 'conv', k: [[-1,-1,-1],[-1,8,-1],[-1,-1,-1]], divisor: 1, desc: '경계선을 강조하는 필터입니다' },
  blur:       { type: 'conv', k: [[1,1,1],[1,1,1],[1,1,1]],          divisor: 9, desc: '주변 9칸의 평균을 구해서 이미지를 흐립니다' },
  sharpen:    { type: 'conv', k: [[0,-1,0],[-1,5,-1],[0,-1,0]],      divisor: 1, desc: '윤곽을 선명하게 만듭니다' },
  grayscale:  { type: 'color', desc: 'R,G,B를 가중 평균하여 흑백으로 만듭니다 (회색 = R×0.299 + G×0.587 + B×0.114).' },
  sepia:      { type: 'color', desc: '리락쿠마처럼 갈색 톤을 입히는 필터입니다 ㅎㅎ' },
  invert:     { type: 'color', desc: '모든 색상값을 255에서 뺀 값으로 바꿔 색을 반전시킵니다' },
  brightness: { type: 'color', desc: '슬라이더로 밝기와 대비를 직접 조절해보세여' },
};

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights';
let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  modelsLoaded = true;
}

async function applyRibbonFilter() {
  await loadModels();

  document.getElementById('filter-desc').innerHTML =
    '<b>ribbon:</b> CNN 기반 얼굴 인식 모델(TinyFaceDetector)이 얼굴 위치를 찾는 중입니다...';

  const detections = await faceapi.detectAllFaces(
    srcCanvas,
    new faceapi.TinyFaceDetectorOptions()
  );

  dstCtx.clearRect(0, 0, dstCanvas.width, dstCanvas.height);
  dstCtx.drawImage(srcCanvas, 0, 0);

  if (detections.length === 0) {
    document.getElementById('filter-desc').innerHTML =
      '<b>ribbon:</b> 얼굴을 찾지 못했어요. 얼굴이 잘 보이는 이미지를 올려보세요.';
    return;
  }

  detections.forEach(det => {
    const box = det.box;
    const ribbonX = box.x + box.width / 2;
    const ribbonY = box.y - box.height * 0.05;
    const fontSize = box.width * 0.5;

    dstCtx.font = fontSize + 'px sans-serif';
    dstCtx.textAlign = 'center';
    dstCtx.textBaseline = 'middle';
    dstCtx.fillText('🎀', ribbonX, ribbonY);
  });

  document.getElementById('filter-desc').innerHTML =
    '<b>ribbon:</b> 얼굴 ' + detections.length + '개를 인식해서 리본을 달았어요. (TinyFaceDetector는 MobileNet 기반의 경량 CNN입니다)';
}

const srcCanvas = document.getElementById('srcCanvas');
const dstCanvas = document.getElementById('dstCanvas');
const srcCtx = srcCanvas.getContext('2d');
const dstCtx = dstCanvas.getContext('2d');

let srcImageData = null;
let currentFilter = null;

document.getElementById('upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    srcCtx.clearRect(0, 0, 300, 300);
    srcCtx.drawImage(img, 0, 0, 300, 300);
    srcImageData = srcCtx.getImageData(0, 0, 300, 300);
    dstCtx.clearRect(0, 0, 300, 300);
    if (currentFilter) applyFilter();
  };
  img.src = URL.createObjectURL(file);
});

document.querySelectorAll('.filter-buttons button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-buttons button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectFilter(btn.dataset.name);
  });
});

document.getElementById('brightness-slider').addEventListener('input', applyFilter);
document.getElementById('contrast-slider').addEventListener('input', applyFilter);

function selectFilter(name) {
  currentFilter = name;
  const f = FILTERS[name];
  document.getElementById('filter-desc').innerHTML = '<b>' + name + ':</b> ' + f.desc;

  const kernelSection = document.getElementById('kernel-inputs');
  const brightnessSection = document.getElementById('brightness-control');

  if (f.type === 'face') {
    kernelSection.style.display = 'none';
    brightnessSection.style.display = 'none';
    applyRibbonFilter();
    return;
  }

  if (f.type === 'conv') {
    kernelSection.style.display = 'inline-grid';
    brightnessSection.style.display = 'none';
    buildKernelUI(f.k);
  } else if (name === 'brightness') {
    kernelSection.style.display = 'none';
    brightnessSection.style.display = 'block';
  } else {
    kernelSection.style.display = 'none';
    brightnessSection.style.display = 'none';
  }

  applyFilter();
}

let currentKernel = null;
let currentDivisor = 1;

function buildKernelUI(kernel) {
  currentKernel = kernel.map(row => [...row]);
  const f = FILTERS[currentFilter];
  currentDivisor = f.divisor;

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
        currentKernel[+e.target.dataset.i][+e.target.dataset.j] = parseFloat(e.target.value) || 0;
        applyFilter();
      });
      container.appendChild(input);
    }
  }
}

function applyFilter() {
  if (!srcImageData || !currentFilter) return;

  const f = FILTERS[currentFilter];
  if (f.type === 'conv') {
    applyConvolution();
  } else if (f.type === 'color') {
    applyColorFilter(currentFilter);
  }
}

function applyConvolution() {
  const { width: w, height: h, data: src } = srcImageData;
  const dst = dstCtx.createImageData(w, h);
  dst.data.set(src);

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

function applyColorFilter(name) {
  const { width: w, height: h, data: src } = srcImageData;
  const dst = dstCtx.createImageData(w, h);

  const brightness = +document.getElementById('brightness-slider').value;
  const contrast = +document.getElementById('contrast-slider').value;
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < src.length; i += 4) {
    let r = src[i], g = src[i + 1], b = src[i + 2];

    if (name === 'grayscale') {
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      r = g = b = gray;
    } else if (name === 'sepia') {
      const tr = r * 0.393 + g * 0.769 + b * 0.189;
      const tg = r * 0.349 + g * 0.686 + b * 0.168;
      const tb = r * 0.272 + g * 0.534 + b * 0.131;
      r = tr; g = tg; b = tb;
    } else if (name === 'invert') {
      r = 255 - r; g = 255 - g; b = 255 - b;
    } else if (name === 'brightness') {
      r = contrastFactor * (r - 128) + 128 + brightness;
      g = contrastFactor * (g - 128) + 128 + brightness;
      b = contrastFactor * (b - 128) + 128 + brightness;
    }

    dst.data[i]     = clamp(r);
    dst.data[i + 1] = clamp(g);
    dst.data[i + 2] = clamp(b);
    dst.data[i + 3] = 255;
  }
  dstCtx.putImageData(dst, 0, 0);
}

function clamp(v) {
  return Math.min(255, Math.max(0, Math.round(v)));
}
