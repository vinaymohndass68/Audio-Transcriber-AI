import React, { useState, useEffect } from 'react';
import { UploadIcon, AudioFileIcon, VideoFileIcon, LinkIcon, LanguageIcon, MicrophoneIcon } from './icons';
import AudioRecorder from './AudioRecorder';

interface FileUploadProps {
  file: File | null;
  audioFileReady: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlUpload: (url: string) => void;
  onFileSelect: (file: File) => void;
  onTranscribe: () => void;
  isConverting: boolean;
  conversionError: string | null;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  vocabularyHints: string;
  onVocabularyHintsChange: (hints: string) => void;
}

type TabType = 'upload' | 'link' | 'record';

const FileUpload: React.FC<FileUploadProps> = ({ 
  file, 
  audioFileReady,
  onFileChange, 
  onUrlUpload,
  onFileSelect,
  onTranscribe,
  isConverting,
  conversionError,
  selectedLanguage,
  onLanguageChange,
  vocabularyHints,
  onVocabularyHintsChange
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<string>('');
  const isVideo = file?.type.startsWith('video/');

  const languages = ['Auto-detect', 'English', 'Hindi', 'Sanskrit', 'Maithili', 'Tamil'];

  useEffect(() => {
    if (file && !isVideo && audioFileReady) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);

      return () => {
        URL.revokeObjectURL(url);
        setAudioSrc(null);
      };
    }
  }, [file, isVideo, audioFileReady]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onUrlUpload(urlInput.trim());
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      
      {/* Tabs */}
      <div className="w-full flex p-1 bg-slate-700 rounded-lg">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'upload' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadIcon className="w-4 h-4" />
          Upload
        </button>
        <button
          onClick={() => setActiveTab('link')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'link' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          Link
        </button>
        <button
          onClick={() => setActiveTab('record')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'record' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MicrophoneIcon className="w-4 h-4" />
          Record
        </button>
      </div>

      <div className="w-full">
        {activeTab === 'upload' && (
          <div className="animate-fade-in">
            <label
              htmlFor="media-upload"
              className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-700/50 hover:bg-slate-700/80 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadIcon className="w-8 h-8 mb-3 text-slate-400" />
                <p className="mb-2 text-sm text-slate-400">
                  <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">Audio or Video (MP3, WAV, MP4, etc.)</p>
              </div>
              <input
                id="media-upload"
                type="file"
                className="hidden"
                accept="audio/*,video/*"
                onChange={onFileChange}
              />
            </label>
          </div>
        )}

        {activeTab === 'link' && (
          <form onSubmit={handleUrlSubmit} className="w-full flex flex-col gap-4 animate-fade-in">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <LinkIcon className="w-5 h-5 text-slate-400" />
              </div>
              <input 
                  type="url" 
                  placeholder="Paste public video URL (e.g. Instagram Reel)"
                  className="bg-slate-700 border border-slate-600 text-gray-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 p-3 placeholder-slate-400"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isConverting}
              />
            </div>
            <button 
              type="submit"
              disabled={!urlInput.trim() || isConverting}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Load Media from URL
            </button>
          </form>
        )}

        {activeTab === 'record' && (
          <AudioRecorder onRecordingComplete={onFileSelect} disabled={isConverting} />
        )}
      </div>

      {conversionError && (
          <div className="w-full p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg text-center text-sm">
              <p>{conversionError}</p>
          </div>
      )}

      {file && (
        <div className="w-full p-4 bg-slate-700 rounded-lg flex flex-col gap-4 animate-fade-in border border-slate-600">
          <div className="flex items-center space-x-3">
            {isVideo ? (
              <VideoFileIcon className="h-6 w-6 text-cyan-400 flex-shrink-0" />
            ) : (
              <AudioFileIcon className="h-6 w-6 text-cyan-400 flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-200 truncate">{file.name}</span>
          </div>
          {isConverting && (
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-300">
              <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-cyan-400"></div>
              <span>Processing media file...</span>
            </div>
          )}
          {audioSrc && !isConverting && (
            <audio controls src={audioSrc} className="w-full">
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
           <label htmlFor="language-select" className="block text-sm font-medium text-slate-400 mb-2">
              Spoken Language Priority
           </label>
           <div className="relative">
               <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                   <LanguageIcon className="w-5 h-5 text-slate-400" />
               </div>
               <select
                   id="language-select"
                   value={selectedLanguage}
                   onChange={(e) => onLanguageChange(e.target.value)}
                   disabled={isConverting}
                   className="bg-slate-700 border border-slate-600 text-gray-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 p-2.5 appearance-none"
               >
                   {languages.map((lang) => (
                       <option key={lang} value={lang}>{lang}</option>
                   ))}
               </select>
           </div>
        </div>

        <div>
            <label htmlFor="vocab-hints" className="block text-sm font-medium text-slate-400 mb-2">
                Vocabulary Hints (Optional)
            </label>
            <textarea
                id="vocab-hints"
                rows={1}
                className="bg-slate-700 border border-slate-600 text-gray-200 text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-slate-400 resize-none"
                placeholder="Names, acronyms, specific terms..."
                value={vocabularyHints}
                onChange={(e) => onVocabularyHintsChange(e.target.value)}
                disabled={isConverting}
            />
        </div>
      </div>
      <p className="text-xs text-slate-500 w-full text-center -mt-3">
        Adding vocabulary hints (names, technical terms) helps the AI transcribe difficult words accurately.
      </p>

      <button
        onClick={onTranscribe}
        disabled={!file || !audioFileReady || isConverting}
        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 transition-all transform hover:scale-105 disabled:scale-100"
      >
        Identify & Transcribe
      </button>
    </div>
  );
};

export default FileUpload;