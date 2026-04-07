// Reference for audioBufferToWav: https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js
function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferOut = new ArrayBuffer(length);
    const view = new DataView(bufferOut);
    const channels = [];
    let i = 0;
    let sample = 0;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    function setUint16(data: number) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data: number) {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    // write interleaved data
    for (i = 0; i < numOfChan; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            // interleave channels
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true); // write 16-bit sample
            pos += 2;
        }
        offset++; // next source sample
    }

    return new Blob([view], { type: "audio/wav" });
}

// FIX: `createMediaElementSource` does not exist on `OfflineAudioContext`.
// The original implementation tried to use a video element with an OfflineAudioContext, which is not supported.
// The corrected implementation decodes the audio data from the file into an AudioBuffer first,
// then uses an OfflineAudioContext to process and resample it, which is the correct approach.
export const extractAudioFromFile = (videoFile: File): Promise<File> => {
    return new Promise(async (resolve, reject) => {
        try {
            // A regular AudioContext is needed for decoding the audio data from the file.
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            const arrayBuffer = await videoFile.arrayBuffer();
            const decodedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Use OfflineAudioContext to resample to mono and a standard sample rate.
            const sampleRate = 44100;
            const offlineCtx = new OfflineAudioContext(
                1, // Mono channel for transcription
                Math.ceil(decodedAudioBuffer.duration * sampleRate),
                sampleRate
            );

            // Create a buffer source for the decoded audio.
            const source = offlineCtx.createBufferSource();
            source.buffer = decodedAudioBuffer;
            source.connect(offlineCtx.destination);
            source.start(0);

            // Render the audio to an AudioBuffer.
            const renderedBuffer = await offlineCtx.startRendering();
            
            const wavBlob = audioBufferToWav(renderedBuffer);
            
            // Create a new file name with .wav extension.
            const originalName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || videoFile.name;
            const wavFile = new File([wavBlob], `${originalName}.wav`, { type: 'audio/wav' });
            
            resolve(wavFile);
        } catch (err) {
            console.error("Error extracting audio from file:", err);
            reject(new Error('Failed to extract audio from video. The file might be corrupted or in an unsupported format.'));
        }
    });
};
