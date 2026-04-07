
import React from 'react';
import { WaveformIcon } from './icons';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <div className="relative flex justify-center items-center">
        <div className="absolute h-20 w-20 animate-spin rounded-full border-4 border-dashed border-cyan-400"></div>
        <WaveformIcon className="h-10 w-10 text-cyan-300" />
      </div>
      <p className="text-lg font-medium text-slate-300">Analyzing Audio...</p>
      <p className="text-sm text-slate-400">This may take a moment for larger files.</p>
    </div>
  );
};

export default Loader;
