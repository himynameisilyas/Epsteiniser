
// @google/genai guidelines: always use { apiKey: process.env.API_KEY }
import { GoogleGenAI, Type } from "@google/genai";

/**
 * EPSTEINISER - Archive Visual Processor
 * Vanilla JavaScript Implementation
 */

// --- Global Application State ---
let currentFile: File | null = null;
let currentImageUrl: string | null = null;
let detectedBoxes: any[] = [];

// --- DOM Element References ---
// Fix: Added type assertions to DOM elements to resolve property errors (e.g., getContext, width, height, value, toDataURL)
const elements = {
  fileInput: document.getElementById('file-upload') as HTMLInputElement,
  uploadLabel: document.getElementById('upload-label') as HTMLElement,
  processBtn: document.getElementById('process-btn') as HTMLElement,
  loadingState: document.getElementById('loading-state') as HTMLElement,
  resultActions: document.getElementById('result-actions') as HTMLElement,
  downloadBtn: document.getElementById('download-btn') as HTMLElement,
  resetBtn: document.getElementById('reset-btn') as HTMLElement,
  logStatus: document.getElementById('log-status') as HTMLElement,
  placeholder: document.getElementById('placeholder') as HTMLElement,
  mainCanvas: document.getElementById('main-canvas') as HTMLCanvasElement,
  scanningOverlay: document.getElementById('scanning-overlay') as HTMLElement,
};

/**
 * Detects faces using the Gemini 3 Flash model with a structured JSON schema.
 */
async function detectFaces(base64Image: string) {
  // Fix: Initializing GoogleGenAI with the required named parameter
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { text: "Detect every person's face in this image. Return their bounding boxes in normalized [ymin, xmin, ymax, xmax] format (values from 0 to 1000). Provide valid JSON only." },
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
                box_2d: { 
                  type: Type.ARRAY, 
                  items: { type: Type.NUMBER },
                  description: "[ymin, xmin, ymax, xmax]"
                }
              },
              required: ["box_2d"]
            }
          }
        },
        required: ["boxes"]
      }
    }
  });

  try {
    // Fix: Access response.text directly (it is a property, not a method)
    const data = JSON.parse(response.text || '{"boxes": []}');
    return data.boxes;
  } catch (err) {
    console.error("Failed to parse AI response:", err);
    return [];
  }
}

/**
 * Renders the image on canvas and applies redaction bars.
 */
function processAndRender(img: HTMLImageElement, boxes: any[]) {
  const canvas = elements.mainCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Match canvas dimensions to the original image
  canvas.width = img.width;
  canvas.height = img.height;
  
  // Update visibility
  canvas.classList.remove('hidden');
  elements.placeholder.classList.add('hidden');

  // Draw background
  ctx.drawImage(img, 0, 0);

  // Redaction parameters
  const expansionFactor = 0.55; // Ensure full facial coverage

  boxes.forEach((box) => {
    const [ymin, xmin, ymax, xmax] = box.box_2d;
    
    // Scale normalized coordinates to pixels
    let left = (xmin / 1000) * canvas.width;
    let top = (ymin / 1000) * canvas.height;
    let width = ((xmax - xmin) / 1000) * canvas.width;
    let height = ((ymax - ymin) / 1000) * canvas.height;

    // Expand the box to cover eyes, hair, and jawline more effectively
    const padW = width * expansionFactor;
    const padH = height * expansionFactor;
    
    left -= padW / 2;
    top -= padH / 2;
    width += padW;
    height += padH;

    // Apply the classic "Archive" black bar
    ctx.fillStyle = 'black';
    ctx.fillRect(left, top, width, height);
    
    // Add high-contrast document edges
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = Math.max(1, canvas.width / 1200);
    ctx.strokeRect(left, top, width, height);
  });
}

/**
 * Event Listeners and Orchestration
 */

// 1. File Upload Handler
elements.fileInput.addEventListener('change', (e) => {
  // Fix: Cast EventTarget to HTMLInputElement to access the 'files' property
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  currentFile = file;
  
  // Revoke old object URL to avoid memory leaks
  if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
  currentImageUrl = URL.createObjectURL(file);
  
  // UI Refresh
  elements.uploadLabel.textContent = 'Change Source';
  elements.processBtn.classList.remove('hidden');
  elements.resultActions.classList.add('hidden');
  elements.placeholder.classList.remove('hidden');
  elements.mainCanvas.classList.add('hidden');
  elements.logStatus.textContent = `» SRC: ${file.name.toUpperCase()}`;
});

// 2. Process Button Handler
elements.processBtn.addEventListener('click', async () => {
  if (!currentFile || !currentImageUrl) return;

  // UI Processing State
  elements.processBtn.classList.add('hidden');
  elements.loadingState.classList.remove('hidden');
  elements.scanningOverlay.classList.remove('hidden');
  elements.logStatus.textContent = '» STATUS: ANALYZING BIOMETRICS...';

  try {
    const reader = new FileReader();
    reader.onload = async () => {
      // Fix: Verify result is a string before using .split()
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1];
        
        // Step A: AI Detection
        detectedBoxes = await detectFaces(base64);
        
        // Step B: Image Processing
        const img = new Image();
        img.src = currentImageUrl!;
        img.onload = () => {
          processAndRender(img, detectedBoxes);
          
          // Final UI Updates
          elements.loadingState.classList.add('hidden');
          elements.scanningOverlay.classList.add('hidden');
          elements.resultActions.classList.remove('hidden');
          elements.logStatus.textContent = `» STATUS: ${detectedBoxes.length} BIOMETRIC TARGETS REDACTED`;
        };
      }
    };
    reader.readAsDataURL(currentFile);
  } catch (err) {
    console.error('Terminal error during processing:', err);
    elements.logStatus.textContent = '» STATUS: CRITICAL ERROR';
    elements.loadingState.classList.add('hidden');
    elements.scanningOverlay.classList.add('hidden');
    elements.processBtn.classList.remove('hidden');
    alert('Analysis failed. Protocol interrupted.');
  }
});

// 3. Reset Button Handler
elements.resetBtn.addEventListener('click', () => {
  currentFile = null;
  if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
  currentImageUrl = null;
  detectedBoxes = [];
  
  // Fix: fileInput is now correctly typed as HTMLInputElement allowing access to 'value'
  elements.fileInput.value = '';
  elements.uploadLabel.textContent = 'Ingest Document';
  elements.processBtn.classList.add('hidden');
  elements.resultActions.classList.add('hidden');
  elements.placeholder.classList.remove('hidden');
  elements.mainCanvas.classList.add('hidden');
  elements.logStatus.textContent = '» STATUS: IDLE';
});

// 4. Export / Download Handler
elements.downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `archive-redacted-${Date.now()}.png`;
  // Fix: mainCanvas is now correctly typed as HTMLCanvasElement allowing access to 'toDataURL'
  link.href = elements.mainCanvas.toDataURL('image/png');
  link.click();
});
