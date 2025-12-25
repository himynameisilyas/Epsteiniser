
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { BoundingBox } from '../types';

interface Props {
  imageUrl: string;
  boxes: BoundingBox[];
}

export interface CensorCanvasHandle {
  download: () => void;
}

const CensorCanvas = forwardRef<CensorCanvasHandle, Props>(({ imageUrl, boxes }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    download: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `epsteiniser-evidence-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original background image (unmodified)
      ctx.drawImage(img, 0, 0);

      // Expansion factor: how much larger the box should be than the detected face
      // 0.4 ensures it comfortably covers the entire head area
      const expansionFactor = 0.4;

      // Apply Selective Black Bars as clean rectangles
      boxes.forEach((box) => {
        const [ymin, xmin, ymax, xmax] = box.box_2d;
        
        let left = (xmin / 1000) * canvas.width;
        let top = (ymin / 1000) * canvas.height;
        let width = ((xmax - xmin) / 1000) * canvas.width;
        let height = ((ymax - ymin) / 1000) * canvas.height;

        // Expand the box to cover more than just the tight facial bounds
        const padW = width * expansionFactor;
        const padH = height * expansionFactor;
        
        left -= padW / 2;
        top -= padH / 2;
        width += padW;
        height += padH;

        // Solid Black Rect (No perspective distortion)
        ctx.fillStyle = 'black';
        ctx.fillRect(left, top, width, height);
        
        // High-contrast clean edge
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(left, top, width, height);
      });
    };
  }, [imageUrl, boxes]);

  return (
    <div className="relative group w-full flex justify-center">
      <canvas 
        ref={canvasRef} 
        className="max-w-full h-auto rounded shadow-2xl ring-4 ring-black/50 bg-slate-900"
      />
    </div>
  );
});

export default CensorCanvas;
