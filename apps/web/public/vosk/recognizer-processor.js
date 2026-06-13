// AudioWorklet processor for the offline (Vosk) voice-search engine.
//
// Runs on the audio rendering thread. It receives raw mono PCM from the mic
// (128-sample render quanta), buffers it into larger chunks, and posts each
// chunk to the main thread, which feeds it to the Vosk recognizer via
// `KaldiRecognizer.acceptWaveformFloat`. Output is left silent so the node can
// be connected to the destination (which keeps the graph pulling) without
// echoing the mic back to the speakers.

const CHUNK_SIZE = 4096;
// Cap the backlog so a stalled/dead main thread can't grow the buffer without
// bound (~8s of audio at 16kHz). Past this we drop the oldest samples.
const MAX_BUFFER = CHUNK_SIZE * 32;

class VoskRecognizerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(0);
  }

  process(inputs) {
    const input = inputs[0];
    const channel = input && input[0];
    if (channel && channel.length > 0) {
      const merged = new Float32Array(this._buffer.length + channel.length);
      merged.set(this._buffer);
      merged.set(channel, this._buffer.length);
      this._buffer = merged;

      // Bound the backlog: if the main thread isn't draining, keep only the
      // most recent MAX_BUFFER samples and discard the stale prefix.
      if (this._buffer.length > MAX_BUFFER) {
        this._buffer = this._buffer.slice(this._buffer.length - MAX_BUFFER);
      }

      while (this._buffer.length >= CHUNK_SIZE) {
        const chunk = this._buffer.slice(0, CHUNK_SIZE);
        try {
          this.port.postMessage(chunk, [chunk.buffer]);
        } catch {
          // Port closed / main thread gone — nothing to do on the audio thread.
        }
        this._buffer = this._buffer.slice(CHUNK_SIZE);
      }
    }
    // Keep the processor alive; outputs stay silent (no mic passthrough).
    return true;
  }
}

registerProcessor("vosk-recognizer-processor", VoskRecognizerProcessor);
