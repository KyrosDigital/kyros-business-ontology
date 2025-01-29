import { NextRequest } from "next/server";
import { AIAgentProgressEvent } from "../../../../../inngest/functions/ai-agent/notify-ui";

// Store active SSE connections
const clients = new Map<string, (data: AIAgentProgressEvent['data']) => void>();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  console.log('SSE connection request received for session:', sessionId);
  
  if (!sessionId) {
    console.log('SSE connection rejected: No sessionId');
    return new Response('Session ID is required', { status: 400 });
  }

  // Create a new response with appropriate headers
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Store the writer function for this session
  const sendMessage = async (data: AIAgentProgressEvent['data']) => {
    try {
      const chunk = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(chunk));
      console.log('Message written to stream for session:', sessionId);
    } catch (err) {
      console.error('Error writing to stream:', err);
    }
  };

  console.log('Registering client for session:', sessionId);
  clients.set(sessionId, sendMessage);

  // Clean up on disconnect
  req.signal.addEventListener('abort', () => {
    console.log('Client disconnected for session:', sessionId);
    clients.delete(sessionId);
    writer.close();
  });

  console.log('SSE connection established for session:', sessionId);
  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { sessionId } = data;
  console.log("Received POST for session:", sessionId);

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  const sendMessage = clients.get(sessionId);
  if (sendMessage) {
    await sendMessage(data);
    console.log("Message sent to client:", sessionId);
    return new Response(JSON.stringify({ success: true, clientFound: true }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } else {
    console.log("No client found for session:", sessionId);
    return new Response(JSON.stringify({ success: false, clientFound: false }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
