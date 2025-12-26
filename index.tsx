
import { GoogleGenAI, Type } from "@google/genai";

// --- Состояние приложения ---
let currentFile = null;
let currentImageUrl = null;
let detectedBoxes = [];

// --- Элементы DOM ---
// Fix: Cast element to HTMLInputElement to access .files and .value
const fileInput = document.getElementById('file-upload') as HTMLInputElement;
const uploadLabel = document.getElementById('upload-label');
const processBtn = document.getElementById('process-btn');
const loadingState = document.getElementById('loading-state');
const resultActions = document.getElementById('result-actions');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const logStatus = document.getElementById('log-status');
const placeholder = document.getElementById('placeholder');
// Fix: Cast element to HTMLCanvasElement to access .getContext, .width, .height, and .toDataURL
const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const scanningOverlay = document.getElementById('scanning-overlay');

// --- Логика ИИ ---
async function detectFaces(base64Image) {
  // Инициализация API ключа из переменных окружения
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    // Fix: Use recommended contents structure for multi-part requests
    contents: {
      parts: [
        { text: "Detect every person/face in this image. Return their bounding boxes in normalized [ymin, xmin, ymax, xmax] format (0-1000). Only return valid JSON." },
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    },
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

  // Fix: Property 'text' is accessed directly (not as a function)
  const data = JSON.parse(response.text || '{}');
  return data.boxes;
}

// --- Отрисовка на холсте ---
function renderCensoredImage(img, boxes) {
  // Fix: Property 'getContext' exists on HTMLCanvasElement
  const ctx = mainCanvas.getContext('2d');
  if (!ctx) return;

  // Установка размеров холста в соответствии с изображением
  // Fix: Property 'width' and 'height' exist on HTMLCanvasElement
  mainCanvas.width = img.width;
  mainCanvas.height = img.height;
  mainCanvas.classList.remove('hidden');
  placeholder.classList.add('hidden');

  // Рисуем исходное изображение
  ctx.drawImage(img, 0, 0);

  // Коэффициент расширения: насколько квадрат больше лица
  const expansionFactor = 0.5; 

  boxes.forEach((box) => {
    const [ymin, xmin, ymax, xmax] = box.box_2d;
    
    // Fix: Using width and height from HTMLCanvasElement
    let left = (xmin / 1000) * mainCanvas.width;
    let top = (ymin / 1000) * mainCanvas.height;
    let width = ((xmax - xmin) / 1000) * mainCanvas.width;
    let height = ((ymax - ymin) / 1000) * mainCanvas.height;

    // Центрированное расширение области цензуры
    const padW = width * expansionFactor;
    const padH = height * expansionFactor;
    
    left -= padW / 2;
    top -= padH / 2;
    width += padW;
    height += padH;

    // 1. Сплошной черный прямоугольник
    ctx.fillStyle = 'black';
    ctx.fillRect(left, top, width, height);
    
    // 2. Тонкая белая рамка (стиль документа)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    // Fix: Using width from HTMLCanvasElement
    ctx.lineWidth = Math.max(1, mainCanvas.width / 1000); // Динамическая толщина
    ctx.strokeRect(left, top, width, height);
  });
}

// --- Обработчики событий ---

// Загрузка файла
fileInput.addEventListener('change', (e) => {
  // Fix: Cast e.target to HTMLInputElement to access .files
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  currentFile = file;
  currentImageUrl = URL.createObjectURL(file);
  
  uploadLabel.textContent = 'Change Input';
  processBtn.classList.remove('hidden');
  resultActions.classList.add('hidden');
  placeholder.classList.remove('hidden');
  mainCanvas.classList.add('hidden');
  logStatus.textContent = `» SRC: ${file.name}`;
});

// Запуск обработки
processBtn.addEventListener('click', async () => {
  if (!currentFile || !currentImageUrl) return;

  processBtn.classList.add('hidden');
  loadingState.classList.remove('hidden');
  scanningOverlay.classList.remove('hidden');
  logStatus.textContent = '» STATUS: ANALYZING BIOMETRICS...';

  try {
    const reader = new FileReader();
    reader.readAsDataURL(currentFile);
    reader.onload = async () => {
      // Fix: Check if result is string before calling split
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1];
        detectedBoxes = await detectFaces(base64);
        
        const img = new Image();
        img.src = currentImageUrl;
        img.onload = () => {
          renderCensoredImage(img, detectedBoxes);
          
          loadingState.classList.add('hidden');
          scanningOverlay.classList.add('hidden');
          resultActions.classList.remove('hidden');
          logStatus.textContent = `» STATUS: ${detectedBoxes.length} TARGETS REDACTED`;
        };
      }
    };
  } catch (err) {
    console.error('Processing error:', err);
    alert('Analysis failed. Check console for details.');
    loadingState.classList.add('hidden');
    scanningOverlay.classList.add('hidden');
    processBtn.classList.remove('hidden');
  }
});

// Сброс
resetBtn.addEventListener('click', () => {
  currentFile = null;
  currentImageUrl = null;
  detectedBoxes = [];
  
  // Fix: Property 'value' exists on HTMLInputElement
  fileInput.value = '';
  uploadLabel.textContent = 'Ingest Document';
  processBtn.classList.add('hidden');
  resultActions.classList.add('hidden');
  placeholder.classList.remove('hidden');
  mainCanvas.classList.add('hidden');
  logStatus.textContent = '» STATUS: IDLE';
});

// Скачивание
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `redacted-evidence-${Date.now()}.png`;
  // Fix: Property 'toDataURL' exists on HTMLCanvasElement
  link.href = mainCanvas.toDataURL('image/png');
  link.click();
});
