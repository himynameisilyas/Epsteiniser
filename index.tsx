
import { GoogleGenAI, Type } from "@google/genai";

// --- State Management ---
let currentFile: File | null = null;
let currentImageUrl: string | null = null;
let detectedBoxes: any[] = [];

// --- DOM Elements ---
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const uploadLabel = document.getElementById('upload-label') as HTMLLabelElement;
const processBtn = document.getElementById('process-btn') as HTMLButtonElement;
const loadingState = document.getElementById('loading-state') as HTMLDivElement;
const resultActions = document.getElementById('result-actions') as HTMLDivElement;
const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const logStatus = document.getElementById('log-status') as HTMLParagraphElement;
const placeholder = document.getElementById('placeholder') as HTMLDivElement;
const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const scanningOverlay = document.getElementById('scanning-overlay') as HTMLDivElement;

// --- AI Logic ---
async function detectFaces(base64Image: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{
      parts: [
        { text: "Detect every face in this image. Return their bounding boxes in normalized [ymin, xmin, ymax, xmax] format (0-1000). Only return valid JSON." },
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          boxes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } }
              },
              required: ["box_2d"]
            }
          }
        },
        required: ["boxes"]
      }
    }
  });

  const data = JSON.parse(response.text);
  return data.boxes;
}

// --- Canvas Rendering ---
function renderCensoredImage(img: HTMLImageElement, boxes: any[]) {
  const ctx = mainCanvas.getContext('2d');
  if (!ctx) return;

  mainCanvas.width = img.width;
  mainCanvas.height = img.height;
  mainCanvas.classList.remove('hidden');
  placeholder.classList.add('hidden');

  ctx.drawImage(img, 0, 0);

  const expansionFactor = 0.45; // Чуть больше лица

  boxes.forEach((box: any) => {
    const [ymin, xmin, ymax, xmax] = box.box_2d;
    
    let left = (xmin / 1000) * mainCanvas.width;
    let top = (ymin / 1000) * mainCanvas.height;
    let width = ((xmax - xmin) / 1000) * mainCanvas.width;
    let height = ((ymax - ymin) / 1000) * mainCanvas.height;

    // Расширяем бокс
    const padW = width * expansionFactor;
    const padH = height * expansionFactor;
    
    left -= padW / 2;
    top -= padH / 2;
    width += padW;
    height += padH;

    // Рисуем сплошной черный квадрат
    ctx.fillStyle = 'black';
    ctx.fillRect(left, top, width, height);
    
    // Белая каемка (архивный стиль)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(left, top, width, height);
  });
}

// --- Event Handlers ---
fileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  currentFile = file;
  currentImageUrl = URL.createObjectURL(file);
  
  // Update UI
  uploadLabel.textContent = 'Change Input';
  processBtn.classList.remove('hidden');
  resultActions.classList.add('hidden');
  placeholder.classList.remove('hidden');
  mainCanvas.classList.add('hidden');
  logStatus.textContent = `» SRC: ${file.name}`;
});

processBtn.addEventListener('click', async () => {
  if (!currentFile || !currentImageUrl) return;

  processBtn.classList.add('hidden');
  loadingState.classList.remove('hidden');
  scanningOverlay.classList.remove('hidden');
  logStatus.textContent = '» STATUS: ANALYZING...';

  try {
    const reader = new FileReader();
    reader.readAsDataURL(currentFile);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      detectedBoxes = await detectFaces(base64);
      
      const img = new Image();
      img.src = currentImageUrl!;
      img.onload = () => {
        renderCensoredImage(img, detectedBoxes);
        
        loadingState.classList.add('hidden');
        scanningOverlay.classList.add('hidden');
        resultActions.classList.remove('hidden');
        logStatus.textContent = `» STATUS: ${detectedBoxes.length} TARGETS CENSORED`;
      };
    };
  } catch (err) {
    console.error(err);
    alert('Analysis failed.');
    loadingState.classList.add('hidden');
    scanningOverlay.classList.add('hidden');
    processBtn.classList.remove('hidden');
  }
});

resetBtn.addEventListener('click', () => {
  currentFile = null;
  currentImageUrl = null;
  detectedBoxes = [];
  
  fileInput.value = '';
  uploadLabel.textContent = 'Ingest Document';
  processBtn.classList.add('hidden');
  resultActions.classList.add('hidden');
  placeholder.classList.remove('hidden');
  mainCanvas.classList.add('hidden');
  logStatus.textContent = '» STATUS: IDLE';
});

downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `epsteiniser-evidence-${Date.now()}.png`;
  link.href = mainCanvas.toDataURL('image/png');
  link.click();
});
