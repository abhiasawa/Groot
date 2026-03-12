import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";
import { getTranscriptionProvider } from "@/lib/providers/transcription";

/**
 * POST /api/mobile/transcribe-chunk — Transcribe a short audio chunk in real-time.
 *
 * Used during recording to show live text. Accepts base64 audio,
 * returns transcribed text. Lightweight — no database writes, no AI response.
 */
export async function POST(request: NextRequest) {
  try {
    await getAuthenticatedPortalUser(request);
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  try {
    const { audio_base64, mime_type } = (await request.json()) as {
      audio_base64: string;
      mime_type: string;
    };

    if (!audio_base64 || !mime_type) {
      return NextResponse.json({ error: "audio_base64 and mime_type required" }, { status: 400 });
    }

    const buffer = Buffer.from(audio_base64, "base64");

    // Skip tiny chunks (< 1KB) — likely silence or too short to transcribe
    if (buffer.length < 1024) {
      return NextResponse.json({ text: "" });
    }

    const provider = getTranscriptionProvider();
    const result = await provider.transcribe(buffer, mime_type);

    return NextResponse.json({ text: result.text ?? "" });
  } catch {
    // Transcription failed for this chunk — return empty, don't block recording
    return NextResponse.json({ text: "" });
  }
}
