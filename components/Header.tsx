
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-6 px-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-black text-white px-3 py-1 font-bold text-xl tracking-tighter uppercase border-2 border-white">
            EPSTEINISER
          </div>
          <h1 className="text-xl font-semibold tracking-tight hidden sm:block">Archive Visual Processor</h1>
        </div>
        <div className="text-xs text-slate-500 font-mono uppercase tracking-widest hidden md:block">
          Classified Information / Digital Forensics
        </div>
      </div>
    </header>
  );
};

export default Header;
