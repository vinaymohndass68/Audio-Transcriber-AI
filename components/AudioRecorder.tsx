import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from './icons';

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recorded_audio.webm', { type: 'audio/webm' });
        onRecordingComplete(file);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please ensure permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-slate-600 border-dashed rounded-lg bg-slate-700/50 min-h-[160px]">
      {isRecording ? (
        <div className="flex flex-col items-center animate-fade-in">
           <div className="relative mb-4">
             <span className="absolute -top-1 -right-1 flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
             </span>
             <MicrophoneIcon className="w-12 h-12 text-red-500" />
           </div>
           <div className="text-2xl font-mono text-white mb-4">{formatTime(recordingTime)}</div>
           <button
             onClick={stopRecording}
             className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-800"
           >
             <StopIcon className="w-5 h-5" />
             Stop Recording
           </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <button
            onClick={startRecording}
            disabled={disabled}
            className="group flex flex-col items-center justify-center"
          >
             <div className="p-4 bg-slate-700 group-hover:bg-slate-600 rounded-full transition-all mb-3 border border-slate-600 group-hover:border-cyan-500/50 shadow-lg">
                <MicrophoneIcon className="w-8 h-8 text-cyan-400" />
             </div>
             <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Click to Record Audio</p>
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;