import { GoogleGenAI, Type } from "@google/genai";
import { fileToBase64 } from "../utils/fileUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        languages: {
            type: Type.ARRAY,
            description: "List of all spoken languages detected in the audio (e.g., ['English', 'Hindi']).",
            items: { type: Type.STRING }
        },
        transcription: {
            type: Type.ARRAY,
            description: "An array of objects, where each object represents a segment of speech from a specific speaker.",
            items: {
                type: Type.OBJECT,
                properties: {
                    speaker: {
                        type: Type.STRING,
                        description: "A label for the speaker, e.g., 'Speaker 1', 'Speaker 2'."
                    },
                    startTime: {
                        type: Type.STRING,
                        description: "The start time of the segment in 'MM:SS' or 'HH:MM:SS' format (e.g. '00:05', '01:23')."
                    },
                    endTime: {
                        type: Type.STRING,
                        description: "The end time of the segment in 'MM:SS' or 'HH:MM:SS' format."
                    },
                    text: {
                        type: Type.STRING,
                        description: "The transcribed text for this speaker's segment in its original language/script."
                    }
                },
                required: ["speaker", "text", "startTime", "endTime"]
            }
        }
    }
};

export const identifyLanguageAndTranscribe = async (file: File, languageHint: string = 'Auto-detect', vocabularyHints: string = '') => {
    if (!file) {
        throw new Error('No file provided for transcription.');
    }

    try {
        const base64Audio = await fileToBase64(file);
        
        const audioPart = {
            inlineData: {
                mimeType: file.type,
                data: base64Audio,
            },
        };

        let prompt = "Analyze the following audio. ";
        if (languageHint && languageHint !== 'Auto-detect') {
            prompt += `Note that the speech may contain ${languageHint}, but check for other languages as well. `;
        }
        
        if (vocabularyHints && vocabularyHints.trim() !== '') {
            prompt += `\n\nContext/Vocabulary Hints: The following words, names, or phrases may appear in the audio. Use this list to improve transcription accuracy for these specific terms: "${vocabularyHints}".`;
        }

        prompt += "\n\nFirst, identify ALL spoken languages present in the audio. Second, provide a full and accurate transcription including Start and End timestamps for every segment. If the audio contains multiple languages, transcribe each part in its original language and script.";

        const textPart = {
            text: prompt,
        };

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, audioPart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema
            }
        });

        const jsonString = result.text.trim();
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult.languages || !Array.isArray(parsedResult.transcription)) {
            // Handle edge case where model might return single string for transcription
            if (typeof parsedResult.transcription === 'string') {
                 return {
                    languages: Array.isArray(parsedResult.languages) ? parsedResult.languages : [parsedResult.languages || 'Unknown'],
                    transcription: [{ speaker: 'Speaker 1', text: parsedResult.transcription, startTime: '00:00', endTime: 'End' }],
                };
            }
            throw new Error('Invalid response format from API.');
        }

        // Handle case where Gemini might return an empty transcription array for silent audio
        if (parsedResult.transcription.length === 0) {
            return {
                languages: parsedResult.languages,
                transcription: [{ speaker: 'Narrator', text: '[No speech detected]', startTime: '00:00', endTime: '00:00' }],
            };
        }

        return {
            languages: parsedResult.languages,
            transcription: parsedResult.transcription,
        };

    } catch (error) {
        console.error("Error in Gemini API call:", error);
        throw new Error("Failed to process audio. The model may not have been able to understand the file.");
    }
};

export const translateText = async (textToTranslate: string, sourceLanguages: string): Promise<string> => {
    if (!textToTranslate) {
        throw new Error('No text provided for translation.');
    }

    try {
        const textPart = {
            text: `Translate the following text from [${sourceLanguages}] to English. Provide only the translated text, without any additional explanation, introductions, or formatting.\n\nText to translate:\n"""\n${textToTranslate}\n"""`,
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart] },
        });

        return response.text.trim();

    } catch (error) {
        console.error("Error in Gemini translation call:", error);
        throw new Error("Failed to translate text. The model may not have been able to process the request.");
    }
};