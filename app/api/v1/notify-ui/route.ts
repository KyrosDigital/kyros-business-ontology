import { NextResponse } from 'next/server';

// Create a simple event emitter to handle communication
const eventEmitter = new EventTarget();
const NOTIFICATION_EVENT = 'notification';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Dispatch the notification to all listeners
    const event = new CustomEvent(NOTIFICATION_EVENT, { 
      detail: JSON.stringify(data) 
    });
    eventEmitter.dispatchEvent(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;
  let isStreamClosed = false;

  const customStream = new ReadableStream({
    start(controller) {
      // Handler for notifications
      const handleNotification = (event: Event) => {
        if (isStreamClosed) return;
        
        const customEvent = event as CustomEvent;
        controller.enqueue(encoder.encode(`data: ${customEvent.detail}\n\n`));
      };

      // Add event listener
      eventEmitter.addEventListener(NOTIFICATION_EVENT, handleNotification);

      // Send heartbeat to keep connection alive
      intervalId = setInterval(() => {
        if (isStreamClosed) {
          clearInterval(intervalId);
          return;
        }

        try {
          // Send heartbeat
          const heartbeat = JSON.stringify({
            type: "heartbeat",
            content: "ping",
            timestamp: new Date().toISOString()
          });
          controller.enqueue(encoder.encode(`data: ${heartbeat}\n\n`));
        } catch (error) {
          clearInterval(intervalId);
          controller.close();
        }
      }, 10000);

      // Return cleanup function
      return () => {
        eventEmitter.removeEventListener(NOTIFICATION_EVENT, handleNotification);
        clearInterval(intervalId);
      };
    },
    cancel() {
      isStreamClosed = true;
      clearInterval(intervalId);
    }
  });

  return new NextResponse(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
