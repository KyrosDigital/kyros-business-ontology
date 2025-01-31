import { NextRequest } from "next/server";
import { AIAgentProgressEvent } from "../../../../../inngest/functions/ai-agent/notify-ui";

export const config = {
  runtime: "edge", // Enables Vercel Edge Runtime
};
// Use a regular Map since we're in the Edge runtime
const clients = new Map<string, (data: AIAgentProgressEvent['data']) => void>();

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  console.log('SSE connection request received for user:', userId);
  
  if (!userId) {
    console.log('SSE connection rejected: No userId');
    return new Response('User ID is required', { status: 400 });
  }

  // If there's an existing connection for this user, close it
  if (clients.has(userId)) {
    console.log('Closing existing connection for user:', userId);
    clients.delete(userId);
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendMessage = async (data: AIAgentProgressEvent['data']) => {
    try {
      const chunk = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(chunk));
      console.log('Message written to stream for user:', userId, 'type:', data.type);
    } catch (err) {
      console.error('Error writing to stream:', err);
      clients.delete(userId);
    }
  };

  console.log('Registering client for user:', userId);
  clients.set(userId, sendMessage);
  console.log('Current clients:', Array.from(clients.keys()));

  // Send initial connection message
  await sendMessage({
    type: 'connection',
    content: 'Connected',
    timestamp: Date.now(),
    userId,
    operationResult: null
  });

  // Clean up on disconnect
  req.signal.addEventListener('abort', () => {
    console.log('Client disconnected for user:', userId);
    clients.delete(userId);
    console.log('Remaining clients:', Array.from(clients.keys()));
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
  const payload = await req.json();
  // The payload is the data itself, not nested under a 'data' property
  const userId = payload.userId;
  
  console.log("Received POST for user:", userId);
  console.log("Payload:", payload);
  console.log("Available clients:", Array.from(clients.keys()));

  if (!userId) {
    return new Response('User ID is required', { status: 400 });
  }

  const sendMessage = clients.get(userId);
  console.log("Found sendMessage function:", !!sendMessage);
  
  if (sendMessage) {
    try {
      await sendMessage(payload); // Pass the entire payload to sendMessage
      console.log("Message sent to client:", userId, "type:", payload.type);
      return new Response(JSON.stringify({ success: true, clientFound: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      clients.delete(userId);
      return new Response(JSON.stringify({ success: false, error: 'Failed to send message' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  } else {
    console.log("No client found for user:", userId);
    return new Response(JSON.stringify({ success: false, clientFound: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
