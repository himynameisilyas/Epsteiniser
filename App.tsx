
import React, { useState, useRef } from 'react';
import Header from './components/Header';
import CensorCanvas, { CensorCanvasHandle } from './components/CensorCanvas';
import { detectPeople } from './services/geminiService';
import { BoundingBox } from './types';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<CensorCanvasHandle>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setBoxes([]);
      setError(null);
    }
  };

  const processImage = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await detectPeople(base64);
        setBoxes(result.boxes);
        setLoading(false);
      };
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Verify network connection or try a different file.");
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setBoxes([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-white selection:text-black font-sans">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Controls Panel */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-slate-900/40 p-6 rounded-lg border border-slate-800 backdrop-blur-sm shadow-xl">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-slate-400">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                Epsteiniser Terminal
              </h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="block w-full py-4 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer text-center text-sm font-bold transition-all rounded uppercase tracking-tighter"
                  >
                    {file ? 'Change Input' : 'Ingest Document'}
                  </label>
                </div>

                {file && !loading && boxes.length === 0 && (
                  <button
                    onClick={processImage}
                    className="w-full py-4 px-4 bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-200 transition-all rounded shadow-lg shadow-white/5"
                  >
                    Apply Censorship
                  </button>
                )}

                {loading && (
                  <div className="py-4 space-y-3">
                    <div className="h-1.5 w-full bg-slate-800 overflow-hidden rounded-full">
                      <div className="h-full bg-white animate-[shimmer_1.5s_infinite] w-1/3 shadow-[0_0_10px_white]"></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono text-center tracking-[0.3em] uppercase">
                      Detecting Biometric Targets...
                    </p>
                  </div>
                )}

                {boxes.length > 0 && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => canvasRef.current?.download()}
                      className="flex-1 py-4 px-4 bg-indigo-600 text-white font-bold uppercase text-xs tracking-widest hover:bg-indigo-500 transition-all rounded shadow-lg shadow-indigo-600/20"
                    >
                      Export Results
                    </button>
                    <button
                      onClick={reset}
                      className="py-4 px-4 bg-slate-800 text-slate-400 font-bold uppercase text-xs hover:bg-slate-700 transition-all rounded"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-slate-900/20 p-5 rounded-lg border border-slate-800/50">
              <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.25em] mb-4">Diagnostic Log</h3>
              <div className="font-mono text-[10px] space-y-1.5 text-slate-500 leading-relaxed">
                <p className="flex items-center gap-2"><span className="text-green-500">●</span> Vision Core: Version 2.5-F</p>
                <p className="flex items-center gap-2"><span className="text-green-500">●</span> Identity Masking: Active</p>
                {file && <p className="truncate text-slate-400">» SRC: {file.name}</p>}
                {boxes.length > 0 && <p className="text-white bg-slate-800 px-1 py-0.5 inline-block">» STATUS: {boxes.length} TARGETS CENSORED</p>}
                {error && <p className="text-red-500 bg-red-500/10 p-1">!! ERROR: {error}</p>}
              </div>
            </section>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-8">
            <div className="min-h-[500px] flex items-center justify-center bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden relative shadow-inner">
              {!previewUrl && (
                <div className="text-center opacity-40">
                  <div className="w-12 h-12 border-2 border-slate-700 rounded-sm flex items-center justify-center mx-auto mb-4 rotate-45">
                    <div className="-rotate-45 font-bold text-slate-700">?</div>
                  </div>
                  <p className="text-slate-500 text-[10px] uppercase tracking-widest">Awaiting Case Submission</p>
                </div>
              )}

              {previewUrl && boxes.length === 0 && !loading && (
                <div className="relative">
                  <img src={previewUrl} className="max-w-full h-auto opacity-70" alt="Preview" />
                  <div className="absolute inset-0 bg-slate-950/20 pointer-events-none"></div>
                </div>
              )}

              {loading && previewUrl && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img src={previewUrl} className="max-w-full h-auto opacity-10 grayscale blur-sm" alt="Analyzing" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="text-white font-mono text-xl font-black tracking-[1em] animate-pulse">
                      PROCESSING
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-400/50 shadow-[0_0_20px_#818cf8] animate-[scan_2.5s_linear_infinite]"></div>
                </div>
              )}

              {previewUrl && boxes.length > 0 && (
                <CensorCanvas ref={canvasRef} imageUrl={previewUrl} boxes={boxes} />
              )}
            </div>
            
            <div className="mt-6 flex items-start gap-3 p-4 bg-slate-900/20 border border-slate-800 rounded">
              <span className="text-slate-600 mt-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
              </span>
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                <span className="text-slate-300 font-bold uppercase">Archive Protocol:</span> This tool utilizes selective neural detection to isolate facial features and apply jittered censorship bars. Background details and non-identifying body parts are preserved to maintain the original investigative context of the document.
              </p>
            </div>
          </div>

        </div>
      </main>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

export default App;
