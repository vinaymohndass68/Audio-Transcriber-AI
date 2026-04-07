import React, { useState, useEffect, useRef } from 'react';
import { CopyIcon, ShareIcon, CheckIcon, RedoIcon, LanguageIcon, TranslateIcon, AudioFileIcon, DownloadIcon, ChevronDownIcon, UsersIcon, EditIcon } from './icons';

export interface TranscriptionTurn {
  speaker: string;
  text: string;
  startTime?: string;
  endTime?: string;
}

interface TranscriptionResultProps {
  file: File | null;
  originalFileName: string;
  languages: string[];
  transcription: TranscriptionTurn[];
  onReset: () => void;
  translatedText: string | null;
  isTranslating: boolean;
  translationError: string | null;
  onTranslate: () => void;
  onUpdateSpeaker: (oldName: string, newName: string) => void;
}

// Helper to parse "MM:SS" or "HH:MM:SS" to seconds
const parseTime = (timeStr: string | undefined): number => {
    if (!timeStr) return 0;
    const cleanStr = timeStr.replace(/[^0-9:]/g, ''); 
    const parts = cleanStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
};

const SpeakerEditorRow = ({ originalName, onSave }: { originalName: string, onSave: (old: string, newName: string) => void }) => {
    const [name, setName] = useState(originalName);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setName(originalName);
    }, [originalName]);

    const handleSave = () => {
        if (name.trim() && name.trim() !== originalName) {
            onSave(originalName, name.trim());
        }
        setIsEditing(false);
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2 mb-2 animate-fade-in">
                <input 
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="bg-slate-700 text-white px-3 py-1.5 rounded text-sm border border-cyan-500 outline-none flex-1 focus:ring-1 focus:ring-cyan-400"
                />
                <button onMouseDown={handleSave} className="p-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-white transition-colors">
                    <CheckIcon className="w-4 h-4" />
                </button>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between mb-2 group p-2 rounded hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-700">
            <span className="text-sm font-medium text-slate-200">{originalName}</span>
            <button 
                onClick={() => setIsEditing(true)} 
                className="text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                title="Rename speaker"
            >
                <EditIcon className="w-4 h-4" />
            </button>
        </div>
    )
}

const TranscriptionResult: React.FC<TranscriptionResultProps> = ({ 
  file,
  originalFileName,
  languages, 
  transcription, 
  onReset,
  translatedText,
  isTranslating,
  translationError,
  onTranslate,
  onUpdateSpeaker
}) => {
  const [originalCopied, setOriginalCopied] = useState(false);
  const [translationCopied, setTranslationCopied] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Speaker Management State
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  
  // Audio Sync State
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const transcriptionContainerRef = useRef<HTMLDivElement>(null);
  
  // Derived unique speakers list
  const uniqueSpeakers: string[] = Array.from(new Set(transcription.map(t => t.speaker))).sort();

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
      setActiveSegmentIndex(null); // Reset active segment on new file

      return () => {
        URL.revokeObjectURL(url);
        setAudioSrc(null);
      };
    }
  }, [file]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Audio Time Update Listener
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
        const currentTime = audio.currentTime;
        
        // Find the segment that matches the current time
        // We look for: startTime <= currentTime < nextSegment.startTime
        // This is robust against potential gaps in endTime or slight overlaps.
        const index = transcription.findIndex((turn, i) => {
            const start = parseTime(turn.startTime);
            const nextStart = i < transcription.length - 1 
                ? parseTime(transcription[i + 1].startTime) 
                : Infinity;
            
            // Fallback: If it's the last segment, check if it's within the duration or just started
            return start <= currentTime && currentTime < nextStart;
        });

        if (index !== -1 && index !== activeSegmentIndex) {
            setActiveSegmentIndex(index);
        }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [transcription, activeSegmentIndex, audioSrc]);

  // Auto-scroll Effect
  useEffect(() => {
      if (isAutoScroll && activeSegmentIndex !== null && segmentRefs.current[activeSegmentIndex] && transcriptionContainerRef.current) {
          const element = segmentRefs.current[activeSegmentIndex];
          const container = transcriptionContainerRef.current;

          if (element) {
              const elementTop = element.offsetTop;
              const elementHeight = element.offsetHeight;
              const containerHeight = container.offsetHeight;
              
              // Simple center scrolling logic
              container.scrollTo({
                  top: elementTop - containerHeight / 2 + elementHeight / 2,
                  behavior: 'smooth'
              });
          }
      }
  }, [activeSegmentIndex, isAutoScroll]);

  const handleSeek = (timeStr: string | undefined) => {
      if (audioRef.current && timeStr) {
          const seconds = parseTime(timeStr);
          audioRef.current.currentTime = seconds;
          audioRef.current.play();
      }
  };

  const handleCopy = (type: 'original' | 'translation') => {
    let textToCopy = '';
    if (type === 'original') {
      textToCopy = transcription.map(turn => {
          const time = turn.startTime ? `[${turn.startTime}] ` : '';
          return `${time}${turn.speaker}: ${turn.text}`;
      }).join('\n');
    } else if (translatedText) {
      textToCopy = translatedText;
    }

    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    if (type === 'original') {
      setOriginalCopied(true);
      setTimeout(() => setOriginalCopied(false), 2000);
    } else {
      setTranslationCopied(true);
      setTimeout(() => setTranslationCopied(false), 2000);
    }
  };


  const handleShare = async () => {
    if (navigator.share) {
      try {
        const originalText = transcription.map(turn => `${turn.speaker}: ${turn.text}`).join('\n');
        const langs = languages.join(', ');
        await navigator.share({
          title: 'Audio Transcription',
          text: translatedText ? `Original (${langs}):\n${originalText}\n\nEnglish Translation:\n${translatedText}` : originalText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      alert('Share functionality is not supported in your browser.');
    }
  };

  const normalizeTimeForSRT = (timeStr: string): string => {
      // Input can be "MM:SS", "HH:MM:SS", "M:SS", etc.
      // SRT needs "HH:MM:SS,mmm"
      
      const parts = timeStr.split(':');
      let h = 0, m = 0, s = 0;
      
      if (parts.length === 3) {
          h = parseInt(parts[0]) || 0;
          m = parseInt(parts[1]) || 0;
          s = parseInt(parts[2]) || 0;
      } else if (parts.length === 2) {
          m = parseInt(parts[0]) || 0;
          s = parseInt(parts[1]) || 0;
      } else {
          // Fallback if parsing fails or single number
           s = parseInt(parts[0]) || 0;
      }

      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      const ss = s.toString().padStart(2, '0');
      
      return `${hh}:${mm}:${ss},000`;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
      // Add UTF-8 BOM (\uFEFF) to ensure correct character display for non-Latin scripts (Hindi, Tamil, etc.)
      const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handleExport = (format: 'txt' | 'json' | 'srt') => {
      const baseName = originalFileName.replace(/\.[^/.]+$/, "") || "transcription";
      
      if (format === 'txt') {
          const content = transcription.map(turn => {
             const time = turn.startTime ? `[${turn.startTime}] ` : '';
             return `${time}${turn.speaker}: ${turn.text}`;
          }).join('\n\n');
          downloadFile(content, `${baseName}.txt`, 'text/plain');
      } else if (format === 'json') {
          const content = JSON.stringify({ 
              languages, 
              originalFile: originalFileName,
              transcription 
          }, null, 2);
          downloadFile(content, `${baseName}.json`, 'application/json');
      } else if (format === 'srt') {
          const content = transcription.map((turn, index) => {
              const start = turn.startTime ? normalizeTimeForSRT(turn.startTime) : '00:00:00,000';
              const end = turn.endTime ? normalizeTimeForSRT(turn.endTime) : '00:00:00,000'; // Fallback if end time missing
              return `${index + 1}\n${start} --> ${end}\n${turn.speaker}: ${turn.text}`;
          }).join('\n\n');
          downloadFile(content, `${baseName}.srt`, 'text/plain');
      }
      setShowExportMenu(false);
  };
  
  // Show translate button if any of the detected languages is NOT English.
  const hasForeignLanguage = languages.some(lang => lang.toLowerCase().trim() !== 'english');
  const showTranslateButton = hasForeignLanguage && !isTranslating && !translatedText;

  return (
    <div className="animate-fade-in space-y-6">
       <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <AudioFileIcon className="w-5 h-5" />
            Original File
        </h2>
        <p className="text-lg font-medium text-slate-300 bg-slate-700/50 px-4 py-2 rounded-md truncate">{originalFileName}</p>
      </div>

      {audioSrc && (
        <div>
          <audio 
            ref={audioRef} 
            controls 
            src={audioSrc} 
            className="w-full rounded-lg"
          >
              Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <LanguageIcon className="w-5 h-5" />
            Identified {languages.length > 1 ? 'Languages' : 'Language'}
        </h2>
        <div className="flex flex-wrap gap-2">
            {languages.map((lang, index) => (
                <span key={index} className="text-lg font-bold text-cyan-300 bg-slate-700/50 px-4 py-2 rounded-md">
                    {lang}
                </span>
            ))}
        </div>
      </div>

      {showTranslateButton && (
        <button
            onClick={onTranslate}
            disabled={isTranslating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-slate-900 bg-cyan-400 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-800 transition-all transform hover:scale-105 disabled:scale-100"
        >
            <TranslateIcon className="w-5 h-5" />
            Translate to English
        </button>
      )}

      {isTranslating && (
        <div className="text-center text-slate-400">
            <p>Translating...</p>
        </div>
      )}

      {translationError && (
        <div className="p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-lg text-center text-sm">
            <p>{translationError}</p>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Transcription</h2>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={isAutoScroll} 
                    onChange={(e) => setIsAutoScroll(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-800"
                  />
                  Auto-scroll
              </label>
          </div>
          
          <div className="flex items-center space-x-2">
            
            <button
                onClick={() => setShowSpeakerModal(true)}
                className="flex items-center gap-1 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-medium text-slate-200"
                title="Manage speakers"
            >
                <UsersIcon className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">Speakers</span>
            </button>

             <div className="relative" ref={exportMenuRef}>
                 <button
                     onClick={() => setShowExportMenu(!showExportMenu)}
                     className="flex items-center gap-1 p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-medium text-slate-200"
                     title="Export transcription"
                 >
                     <DownloadIcon className="w-4 h-4 text-cyan-400" />
                     <span>Export</span>
                     <ChevronDownIcon className="w-3 h-3 text-slate-400" />
                 </button>
                 {showExportMenu && (
                     <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
                         <button onClick={() => handleExport('txt')} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                             Text (.txt)
                         </button>
                         <button onClick={() => handleExport('srt')} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                             Subtitles (.srt)
                         </button>
                         <button onClick={() => handleExport('json')} className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                             JSON (.json)
                         </button>
                     </div>
                 )}
             </div>

            <button
              onClick={() => handleCopy('original')}
              className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
              title="Copy to clipboard"
            >
              {originalCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5 text-slate-300" />}
            </button>
            {navigator.share && (
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                title="Share transcription"
              >
                <ShareIcon className="w-5 h-5 text-slate-300" />
              </button>
            )}
          </div>
        </div>
        <div 
            ref={transcriptionContainerRef}
            className="w-full h-80 p-4 bg-slate-900/70 rounded-md border border-slate-700 overflow-y-auto font-mono text-sm scroll-smooth relative"
        >
          {transcription.map((turn, index) => (
            <div 
                key={index} 
                ref={(el) => { segmentRefs.current[index] = el; }}
                className={`mb-4 last:mb-0 p-3 rounded-lg transition-all duration-300 border-l-4 ${
                    index === activeSegmentIndex 
                        ? 'bg-slate-800/80 border-cyan-400 shadow-md transform scale-[1.01]' 
                        : 'border-transparent hover:bg-slate-800/30'
                }`}
            >
              <div className="flex items-baseline mb-1">
                  <span className={`font-bold mr-2 ${index === activeSegmentIndex ? 'text-cyan-300' : 'text-cyan-400'}`}>
                    {turn.speaker}
                  </span>
                  {turn.startTime && (
                      <button 
                        onClick={() => handleSeek(turn.startTime)}
                        className={`text-xs font-medium hover:underline focus:outline-none ${
                            index === activeSegmentIndex ? 'text-cyan-200' : 'text-slate-500 hover:text-cyan-400'
                        }`}
                        title="Click to jump to this timestamp"
                      >
                          {turn.startTime} {turn.endTime ? `- ${turn.endTime}` : ''}
                      </button>
                  )}
              </div>
              <p className={`whitespace-pre-wrap pl-0 leading-relaxed ${index === activeSegmentIndex ? 'text-white' : 'text-gray-300'}`}>
                {turn.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {translatedText && (
          <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">English Translation</h2>
                  <div className="flex items-center space-x-2">
                      <button
                          onClick={() => handleCopy('translation')}
                          className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          title="Copy translation to clipboard"
                      >
                          {translationCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5 text-slate-300" />}
                      </button>
                  </div>
              </div>
              <div className="w-full h-64 p-4 bg-slate-900/70 rounded-md border border-slate-700 overflow-y-auto">
                  <p className="text-gray-300 whitespace-pre-wrap">{translatedText}</p>
              </div>
          </div>
      )}
      
      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-slate-600 text-base font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800 transition-colors"
      >
        <RedoIcon className="w-5 h-5"/>
        Transcribe Another File
      </button>

      {/* Speaker Management Modal */}
      {showSpeakerModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                      <h3 className="font-semibold text-white">Manage Speakers</h3>
                      <button 
                          onClick={() => setShowSpeakerModal(false)}
                          className="text-slate-400 hover:text-white"
                      >
                          ✕
                      </button>
                  </div>
                  <div className="p-4 max-h-[60vh] overflow-y-auto">
                      <p className="text-sm text-slate-400 mb-4">Click the pencil icon to rename a speaker globally.</p>
                      {uniqueSpeakers.map((speaker, idx) => (
                          <SpeakerEditorRow 
                              key={`${speaker}-${idx}`} 
                              originalName={speaker} 
                              onSave={onUpdateSpeaker} 
                          />
                      ))}
                      {uniqueSpeakers.length === 0 && (
                          <p className="text-center text-slate-500 italic">No speakers found.</p>
                      )}
                  </div>
                  <div className="p-4 bg-slate-900/50 text-center">
                      <button 
                          onClick={() => setShowSpeakerModal(false)}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-white transition-colors"
                      >
                          Done
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TranscriptionResult;