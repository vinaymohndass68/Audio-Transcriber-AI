import React, { useState, useCallback } from 'react';
import { identifyLanguageAndTranscribe, translateText } from './services/geminiService';
import FileUpload from './components/FileUpload';
import TranscriptionResult, { TranscriptionTurn } from './components/TranscriptionResult';
import Loader from './components/Loader';
import { WaveformIcon } from './components/icons';
import { extractAudioFromFile } from './utils/audioUtils';
import { fetchFileFromUrl } from './utils/fileUtils';

interface TranscriptionData {
  languages: string[];
  transcription: TranscriptionTurn[];
}

const App: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Default to Auto-detect, but store user preference
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Auto-detect');
  const [vocabularyHints, setVocabularyHints] = useState<string>('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      await handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = async (file: File) => {
    handleReset();
    setOriginalFile(file);
    await processFile(file);
  };

  const handleUrlUpload = async (url: string) => {
    handleReset();
    setIsConverting(true);
    setConversionError(null);
    try {
      const file = await fetchFileFromUrl(url);
      setOriginalFile(file);
      await processFile(file);
    } catch (err) {
      console.error('URL processing failed:', err);
      setConversionError(err instanceof Error ? err.message : 'Failed to retrieve media from URL.');
      setIsConverting(false); // Only set false here if error, otherwise processFile handles it
    }
  };

  const processFile = async (file: File) => {
      setIsConverting(true);
      setConversionError(null);
      try {
        if (file.type.startsWith('video/')) {
            const extractedAudio = await extractAudioFromFile(file);
            setAudioFile(extractedAudio);
        } else if (file.type.startsWith('audio/')) {
            setAudioFile(file);
        } else {
            setConversionError('Unsupported file type. Please upload an audio or video file.');
        }
      } catch (err) {
          console.error('Audio extraction failed:', err);
          setConversionError('Failed to process file. The file might be corrupted or in an unsupported format.');
      } finally {
          setIsConverting(false);
      }
  };


  const handleTranscribe = useCallback(async () => {
    if (!audioFile) {
      setError('Please select a valid audio or video file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTranscriptionData(null);

    try {
      const data = await identifyLanguageAndTranscribe(audioFile, selectedLanguage, vocabularyHints);
      setTranscriptionData(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [audioFile, selectedLanguage, vocabularyHints]);

  const handleTranslate = useCallback(async () => {
    if (!transcriptionData) return;

    setIsTranslating(true);
    setTranslationError(null);
    setTranslatedText(null);

    try {
      const fullTranscription = transcriptionData.transcription
        .map(turn => turn.text)
        .join('\n');
      
      const sourceLanguages = transcriptionData.languages.join(', ');
      const translation = await translateText(fullTranscription, sourceLanguages);
      setTranslatedText(translation);
    } catch (err) {
      console.error(err);
      setTranslationError(err instanceof Error ? err.message : 'An unknown error occurred during translation.');
    } finally {
      setIsTranslating(false);
    }
  }, [transcriptionData]);

  const handleUpdateSpeaker = useCallback((oldName: string, newName: string) => {
    setTranscriptionData(prev => {
      if (!prev) return null;
      const newTranscription = prev.transcription.map(turn => ({
        ...turn,
        speaker: turn.speaker === oldName ? newName : turn.speaker
      }));
      return {
        ...prev,
        transcription: newTranscription
      };
    });
  }, []);

  const handleReset = () => {
    setOriginalFile(null);
    setAudioFile(null);
    setTranscriptionData(null);
    setError(null);
    setIsLoading(false);
    setTranslatedText(null);
    setIsTranslating(false);
    setTranslationError(null);
    setIsConverting(false);
    setConversionError(null);
    // Note: We deliberately do not reset selectedLanguage or vocabularyHints here
    // as users likely want to keep their settings for the next file
  };

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 font-sans flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-4">
            <WaveformIcon className="h-10 w-10 text-cyan-400" />
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Audio Transcriber AI
            </h1>
          </div>
          <p className="text-lg text-slate-400">
            Upload a file, paste a public link, or record audio to get a complete transcription with speaker labels.
          </p>
        </header>

        <main className="bg-slate-800/60 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700">
          {isLoading ? (
            <Loader />
          ) : transcriptionData ? (
            <TranscriptionResult 
              file={audioFile}
              originalFileName={originalFile?.name || 'Unknown File'}
              languages={transcriptionData.languages} 
              transcription={transcriptionData.transcription}
              onReset={handleReset}
              translatedText={translatedText}
              isTranslating={isTranslating}
              translationError={translationError}
              onTranslate={handleTranslate}
              onUpdateSpeaker={handleUpdateSpeaker}
            />
          ) : (
            <FileUpload 
              file={originalFile}
              audioFileReady={!!audioFile}
              onFileChange={handleFileChange}
              onUrlUpload={handleUrlUpload}
              onFileSelect={handleFileSelect}
              onTranscribe={handleTranscribe}
              isConverting={isConverting}
              conversionError={conversionError}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              vocabularyHints={vocabularyHints}
              onVocabularyHintsChange={setVocabularyHints}
            />
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-lg text-center">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}
        </main>

        <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;