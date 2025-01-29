import { NextRequest } from "next/server";
import { AIAgentProgressEvent } from "../../../../../inngest/functions/ai-agent/notify-ui";

// Declare global storage for SSE clients
declare global {
  var sseClients: Map<string, (data: AIAgentProgressEvent['data']) => void>;
}

// Initialize global clients map if it doesn't exist
if (!global.sseClients) {
  global.sseClients = new Map();
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  console.log('SSE connection request received for session:', sessionId);
  
  if (!sessionId) {
    console.log('SSE connection rejected: No sessionId');
    return new Response('Session ID is required', { status: 400 });
  }

  // If there's an existing connection for this session, close it
  if (global.sseClients.has(sessionId)) {
    console.log('Closing existing connection for session:', sessionId);
    global.sseClients.delete(sessionId);
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendMessage = async (data: AIAgentProgressEvent['data']) => {
    try {
      const chunk = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(chunk));
      console.log('Message written to stream for session:', sessionId, 'type:', data.type);
    } catch (err) {
      console.error('Error writing to stream:', err);
      global.sseClients.delete(sessionId);
    }
  };

  console.log('Registering client for session:', sessionId);
  global.sseClients.set(sessionId, sendMessage);
  console.log('Current clients:', Array.from(global.sseClients.keys()));

  // Send initial connection message
  await sendMessage({
    type: 'connection',
    content: 'Connected',
    timestamp: Date.now(),
    sessionId,
    operationResult: null
  });

  // Clean up on disconnect
  req.signal.addEventListener('abort', () => {
    console.log('Client disconnected for session:', sessionId);
    global.sseClients.delete(sessionId);
    console.log('Remaining clients:', Array.from(global.sseClients.keys()));
    writer.close();
  });

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
  console.log("Available clients:", Array.from(global.sseClients.keys()));

  if (!sessionId) {
    return new Response('Session ID is required', { status: 400 });
  }

  const sendMessage = global.sseClients.get(sessionId);
  if (sendMessage) {
    try {
      await sendMessage(data);
      console.log("Message sent to client:", sessionId, "type:", data.type);
      return new Response(JSON.stringify({ success: true, clientFound: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      global.sseClients.delete(sessionId);
      return new Response(JSON.stringify({ success: false, error: 'Failed to send message' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  } else {
    console.log("No client found for session:", sessionId);
    return new Response(JSON.stringify({ success: false, clientFound: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
