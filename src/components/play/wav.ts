function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
}

/** 16-bit mono PCM WAV. No transcription library — the browser encodes the recording. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function concatFloat32(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export type WavCapture = {
  stop: () => Promise<Blob>;
};

const WORKLET = `class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("wonderland-capture", CaptureProcessor);`;

/** Push-to-talk. Resolves to a WAV blob. Throws if the microphone cannot be opened. */
export async function startWavCapture(): Promise<WavCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  await ctx.resume();
  const source = ctx.createMediaStreamSource(stream);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  const chunks: Float32Array[] = [];
  let closed = false;

  const tapScript = () => {
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(mute);
  };

  if (ctx.audioWorklet) {
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
    try {
      await ctx.audioWorklet.addModule(url);
      const node = new AudioWorkletNode(ctx, "wonderland-capture");
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (event.data) chunks.push(event.data);
      };
      source.connect(node);
      node.connect(mute);
    } catch {
      tapScript();
    } finally {
      URL.revokeObjectURL(url);
    }
  } else {
    tapScript();
  }
  mute.connect(ctx.destination);

  return {
    stop: async () => {
      if (closed) return encodeWav(new Float32Array(), ctx.sampleRate || 48000);
      closed = true;
      const samples = concatFloat32(chunks);
      const rate = ctx.sampleRate || 48000;
      stream.getTracks().forEach((track) => track.stop());
      await ctx.close();
      return encodeWav(samples, rate);
    },
  };
}
