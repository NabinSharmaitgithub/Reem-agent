/**
 * Minimal byte helpers for the TTS pipeline.
 *
 * Gemini TTS returns raw 16-bit PCM (`audio/L16`), which neither expo-audio nor
 * Android's media stack can play directly, so the provider wraps it in a WAV
 * container before handing it to the player.
 */

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Decodes standard base64 (with or without padding) into bytes. */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const length = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(length);

  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n0 = ALPHABET.indexOf(clean[i] ?? "A");
    const n1 = ALPHABET.indexOf(clean[i + 1] ?? "A");
    const n2 = ALPHABET.indexOf(clean[i + 2] ?? "A");
    const n3 = ALPHABET.indexOf(clean[i + 3] ?? "A");

    const triple =
      (n0 << 18) | (n1 << 12) | ((n2 & 63) << 6) | (n3 & 63);

    if (byteIndex < length) bytes[byteIndex++] = (triple >> 16) & 0xff;
    if (byteIndex < length) bytes[byteIndex++] = (triple >> 8) & 0xff;
    if (byteIndex < length) bytes[byteIndex++] = triple & 0xff;
  }

  return bytes;
}

/** Drops a WAV/RIFF header (44 bytes) if one is present. */
function stripWaveHeader(bytes: Uint8Array): Uint8Array {
  const isRiff =
    bytes.length > 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46; // F
  return isRiff ? bytes.subarray(44) : bytes;
}

function writeAscii(target: Uint8Array, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    target[offset + i] = text.charCodeAt(i) & 0xff;
  }
}

/**
 * Wraps raw PCM samples in a 44-byte canonical WAV header.
 *
 * @param pcm 16-bit little-endian samples (may already include a RIFF header,
 *   in which case it is returned unchanged).
 * @param sampleRate Sample rate in Hz, e.g. 24000 for Gemini TTS.
 * @param channels Channel count (Gemini returns mono).
 */
export function pcmToWav(
  pcm: Uint8Array,
  sampleRate: number,
  channels = 1,
): Uint8Array {
  const isRiff =
    pcm.length > 12 &&
    pcm[0] === 0x52 && // R
    pcm[1] === 0x49 && // I
    pcm[2] === 0x46 && // F
    pcm[3] === 0x46; // F
  if (isRiff) return pcm;

  const data = stripWaveHeader(pcm);
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  const wav = new Uint8Array(44 + data.length);
  const view = new DataView(wav.buffer);

  writeAscii(wav, 0, "RIFF");
  view.setUint32(4, 36 + data.length, true);
  writeAscii(wav, 8, "WAVE");
  writeAscii(wav, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(wav, 36, "data");
  view.setUint32(40, data.length, true);
  wav.set(data, 44);

  return wav;
}
