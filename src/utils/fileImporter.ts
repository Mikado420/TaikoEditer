import JSZip from 'jszip';
import { TaikoChart } from '../types/chart';
import { parseTja } from '../parser/tjaParser';

export interface ImportResult {
  chart?: TaikoChart;
  audioFile?: File;
  error?: string;
}

/**
 * Reads a text file using Encoding API (supports Shift_JIS / UTF-8)
 */
export async function readTextWithEncoding(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Try decoding as UTF-8 first
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: fontDetectUtf8(uint8) });
    return utf8Decoder.decode(uint8);
  } catch (e) {
    // Fallback to Shift_JIS
    const sjisDecoder = new TextDecoder('shift-jis');
    return sjisDecoder.decode(uint8);
  }
}

/**
 * Simple heuristic to check if UTF-8 is valid or likely Shift_JIS
 */
function fontDetectUtf8(bytes: Uint8Array): boolean {
  let i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7f) {
      i++;
      continue;
    }
    if (bytes[i] >= 0xc0 && bytes[i] <= 0xdf) {
      if (i + 1 >= bytes.length || (bytes[i + 1] & 0xc0) !== 0x80) return true;
      i += 2;
    } else if (bytes[i] >= 0xe0 && bytes[i] <= 0xef) {
      if (
        i + 2 >= bytes.length ||
        (bytes[i + 1] & 0xc0) !== 0x80 ||
        (bytes[i + 2] & 0xc0) !== 0x80
      )
        return true;
      i += 3;
    } else {
      return true; // Likely non-utf8
    }
  }
  return false;
}

/**
 * Handle import of .tja, .txt, .zip or audio files
 */
export async function processImportedFile(file: File): Promise<ImportResult> {
  const fileName = file.name.toLowerCase();

  // 1. ZIP File Processing
  if (fileName.endsWith('.zip')) {
    try {
      const zip = new JSZip();
      const archive = await zip.loadAsync(file);

      let foundChartText: string | null = null;
      let chartFileName = '';
      let foundAudioFile: File | null = null;

      const entries = Object.keys(archive.files);

      // Search for .tja/.txt and audio files inside ZIP
      for (const entryPath of entries) {
        const entry = archive.files[entryPath];
        if (entry.dir) continue;

        const lowerPath = entryPath.toLowerCase();

        // Check for TJA/TXT chart
        if ((lowerPath.endsWith('.tja') || lowerPath.endsWith('.txt')) && !foundChartText) {
          const blob = await entry.async('blob');
          foundChartText = await readTextWithEncoding(blob);
          chartFileName = entryPath.split('/').pop()?.replace(/\.(tja|txt)$/i, '') || 'Chart';
        }

        // Check for audio file (.ogg, .mp3, .wav, .m4a)
        if (
          (lowerPath.endsWith('.ogg') ||
            lowerPath.endsWith('.mp3') ||
            lowerPath.endsWith('.wav') ||
            lowerPath.endsWith('.m4a')) &&
          !foundAudioFile
        ) {
          const blob = await entry.async('blob');
          const audioName = entryPath.split('/').pop() || 'audio.ogg';
          const mimeType = lowerPath.endsWith('.ogg')
            ? 'audio/ogg'
            : lowerPath.endsWith('.mp3')
            ? 'audio/mpeg'
            : 'audio/wav';
          foundAudioFile = new File([blob], audioName, { type: mimeType });
        }
      }

      let parsedChart: TaikoChart | undefined;
      if (foundChartText) {
        parsedChart = parseTja(foundChartText);
        parsedChart.header.title = chartFileName;
      }

      if (!parsedChart && !foundAudioFile) {
        return { error: 'ZIP内に有効な .tja または 音声ファイルが見つかりませんでした。' };
      }

      return {
        chart: parsedChart,
        audioFile: foundAudioFile || undefined,
      };
    } catch (e: any) {
      console.error('ZIP extraction error:', e);
      return { error: `ZIPの読み込みに失敗しました: ${e?.message || e}` };
    }
  }

  // 2. TJA / TXT Chart File Processing
  if (fileName.endsWith('.tja') || fileName.endsWith('.txt')) {
    try {
      const text = await readTextWithEncoding(file);
      const chart = parseTja(text);
      chart.header.title = file.name.replace(/\.(tja|txt)$/i, '');
      return { chart };
    } catch (e: any) {
      return { error: `TJAファイルの解析に失敗しました: ${e?.message || e}` };
    }
  }

  // 3. Audio File Processing
  if (
    fileName.endsWith('.ogg') ||
    fileName.endsWith('.mp3') ||
    fileName.endsWith('.wav') ||
    fileName.endsWith('.m4a') ||
    file.type.startsWith('audio/')
  ) {
    return { audioFile: file };
  }

  return { error: '対応していないファイル形式です (.tja, .txt, .zip, .ogg, .mp3, .wav)' };
}
