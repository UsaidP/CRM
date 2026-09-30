import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export interface CallAiAnalysisResult {
  transcript: string;
  summary: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  callOutcome: 'INTERESTED' | 'CALLBACK_REQUESTED' | 'NOT_INTERESTED' | 'NO_ANSWER' | 'BUSY' | 'WRONG_NUMBER';
  actionItem?: string;
  modelUsed: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key' || apiKey === 'your-google-api-key') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export const CALL_AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const CALL_ANALYSIS_PROMPT = `
You are an expert sales intelligence assistant for a premier real estate brokerage in Navi Mumbai, India.
Analyze the provided telephone call between a real estate broker and a property lead.
The conversation may be conducted in English, Hindi, or conversational Hinglish (mixed Hindi-English).

Your job is to provide clean, structured sales intelligence:
1. "transcript": Complete verbatim transcript of the call, marking speaker turns ("Broker: ...", "Lead: ...").
2. "summary": Concise 2-3 sentence executive summary in English. Focus on buyer intent, localities discussed (e.g. Kharghar, Taloja, Ulwe, Panvel), BHK typology (1 BHK, 2 BHK), budget range in INR, and current stage.
3. "sentiment": Overall lead sentiment: strictly one of "POSITIVE", "NEUTRAL", or "NEGATIVE".
4. "callOutcome": Categorize the outcome: strictly one of "INTERESTED", "CALLBACK_REQUESTED", "NOT_INTERESTED", "NO_ANSWER", "BUSY", "WRONG_NUMBER".
5. "actionItem": Concrete immediate next step recommended for the broker (e.g., "Send brochure for 2BHK in Kharghar Sec 35", "Schedule site visit for Saturday 11 AM").

Return purely valid JSON matching this schema:
{
  "transcript": string,
  "summary": string,
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "callOutcome": "INTERESTED" | "CALLBACK_REQUESTED" | "NOT_INTERESTED" | "NO_ANSWER" | "BUSY" | "WRONG_NUMBER",
  "actionItem": string
}
`;

/**
 * Detect MIME type from audio file extension or URL
 */
function detectAudioMimeType(filenameOrUrl: string): string {
  const lower = filenameOrUrl.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mp3';
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) return 'audio/m4a';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.amr')) return 'audio/amr';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.flac')) return 'audio/flac';
  return 'audio/mp3';
}

/**
 * Resolves local or remote audio files into a Buffer and MIME type
 */
async function resolveAudioBuffer(
  audioUrl: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
      const res = await fetch(audioUrl);
      if (!res.ok) {
        console.warn(`[Call AI] Failed to fetch remote audio: HTTP ${res.status}`);
        return null;
      }
      const arrayBuffer = await res.arrayBuffer();
      const mimeType = res.headers.get('content-type') || detectAudioMimeType(audioUrl);
      return { buffer: Buffer.from(arrayBuffer), mimeType };
    }

    // Local file path (e.g., /uploads/recordings/call_123.mp3)
    let localPath = audioUrl;
    if (audioUrl.startsWith('/')) {
      localPath = path.join(process.cwd(), 'public', audioUrl);
    }
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const mimeType = detectAudioMimeType(localPath);
      return { buffer, mimeType };
    }

    return null;
  } catch (err: any) {
    console.warn('[Call AI] Error resolving audio file:', err.message);
    return null;
  }
}

/**
 * Analyzes call audio and/or notes using Gemini Flash Multimodal AI
 */
export async function analyzeCallWithAI(params: {
  audioUrl?: string | null;
  audioBuffer?: Buffer;
  mimeType?: string;
  callerNumber?: string;
  leadName?: string;
  durationSeconds?: number;
  notes?: string;
}): Promise<CallAiAnalysisResult> {
  const {
    audioUrl,
    audioBuffer,
    mimeType = 'audio/mp3',
    callerNumber = 'Unknown',
    leadName = 'Lead',
    durationSeconds = 0,
    notes = '',
  } = params;

  const ai = getGeminiClient();

  // If call duration was very short with no audio or failed connection:
  if (durationSeconds > 0 && durationSeconds < 25 && !audioUrl && !audioBuffer && !notes) {
    return {
      transcript: '[Call duration too short for dialogue]',
      summary: `Brief unanswered or dropped call (${durationSeconds}s) with ${leadName} (${callerNumber}).`,
      sentiment: 'NEUTRAL',
      callOutcome: 'NO_ANSWER',
      actionItem: 'Attempt follow-up call during peak engagement hours (4 PM - 7 PM).',
      modelUsed: 'rule-engine',
    };
  }

  // Fallback default if Gemini is unavailable
  const fallbackResult: CallAiAnalysisResult = {
    transcript: notes ? `Notes recorded by broker: ${notes}` : '[Audio recording saved to lead timeline]',
    summary: notes
      ? `Broker logged call notes: ${notes}`
      : `Phone call (${durationSeconds}s) with ${leadName} (${callerNumber}).`,
    sentiment: 'NEUTRAL',
    callOutcome: durationSeconds > 60 ? 'INTERESTED' : 'CALLBACK_REQUESTED',
    actionItem: 'Follow up with lead on WhatsApp with verified property options.',
    modelUsed: 'fallback',
  };

  if (!ai) {
    console.warn('[Call AI] Gemini API key not found in environment, returning structured metadata fallback.');
    return fallbackResult;
  }

  try {
    let resolvedBuffer = audioBuffer;
    let resolvedMime = mimeType;

    if (!resolvedBuffer && audioUrl) {
      const resolved = await resolveAudioBuffer(audioUrl);
      if (resolved) {
        resolvedBuffer = resolved.buffer;
        resolvedMime = resolved.mimeType;
      }
    }

    // 1. Multimodal Audio Analysis (if audio buffer exists)
    if (resolvedBuffer && resolvedBuffer.length > 0) {
      const isLargeFile = resolvedBuffer.length > 15 * 1024 * 1024;
      let uploadedFile: any = null;

      try {
        let contentPart: any;

        if (isLargeFile) {
          const blob = new Blob([new Uint8Array(resolvedBuffer)], { type: resolvedMime });
          uploadedFile = await ai.files.upload({
            file: blob,
            config: { mimeType: resolvedMime },
          });
          contentPart = {
            fileData: {
              fileUri: uploadedFile.uri,
              mimeType: uploadedFile.mimeType || resolvedMime,
            },
          };
        } else {
          contentPart = {
            inlineData: {
              mimeType: resolvedMime,
              data: resolvedBuffer.toString('base64'),
            },
          };
        }

        const response = await ai.models.generateContent({
          model: CALL_AI_MODEL,
          contents: [
            contentPart,
            CALL_ANALYSIS_PROMPT,
            `Additional context: Caller: ${leadName} (${callerNumber}), Call Duration: ${durationSeconds} seconds.`,
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const text = response.text || '{}';
        const parsed = JSON.parse(text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));

        return {
          transcript: parsed.transcript || fallbackResult.transcript,
          summary: parsed.summary || fallbackResult.summary,
          sentiment: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(parsed.sentiment)
            ? parsed.sentiment
            : 'NEUTRAL',
          callOutcome: [
            'INTERESTED',
            'CALLBACK_REQUESTED',
            'NOT_INTERESTED',
            'NO_ANSWER',
            'BUSY',
            'WRONG_NUMBER',
          ].includes(parsed.callOutcome)
            ? parsed.callOutcome
            : 'INTERESTED',
          actionItem: parsed.actionItem || fallbackResult.actionItem,
          modelUsed: CALL_AI_MODEL,
        };
      } finally {
        if (uploadedFile?.name) {
          try {
            await ai.files.delete({ name: uploadedFile.name });
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }

    // 2. Text Notes Analysis (if no audio buffer but notes were provided)
    if (notes && notes.trim().length > 0) {
      const textPrompt = `
Analyze these sales call notes between real estate broker and lead ${leadName} (${callerNumber}):
"${notes}"
Call Duration: ${durationSeconds} seconds.

${CALL_ANALYSIS_PROMPT}
`;
      const response = await ai.models.generateContent({
        model: CALL_AI_MODEL,
        contents: textPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, ''));

      return {
        transcript: `Notes: ${notes}`,
        summary: parsed.summary || `Call notes: ${notes}`,
        sentiment: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(parsed.sentiment) ? parsed.sentiment : 'NEUTRAL',
        callOutcome: ['INTERESTED', 'CALLBACK_REQUESTED', 'NOT_INTERESTED', 'NO_ANSWER', 'BUSY', 'WRONG_NUMBER'].includes(parsed.callOutcome) ? parsed.callOutcome : 'INTERESTED',
        actionItem: parsed.actionItem || fallbackResult.actionItem,
        modelUsed: CALL_AI_MODEL,
      };
    }

    return fallbackResult;
  } catch (err: any) {
    console.warn('[Call AI] Gemini analysis failed, returning structured fallback:', err.message);
    return fallbackResult;
  }
}
