"use client"

import { useState, useRef, useEffect, MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Paperclip, Loader2 } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useGraph } from "@/contexts/GraphContext"
import { useOrganization } from "@/contexts/OrganizationContext"
import { useUser } from "@/contexts/UserContext"
import Ably from 'ably'

interface ChatMessage {
  role: "user" | "assistant" | "progress"
  content: string
}

interface FileAttachment {
  name: string;
  text: string;
}

interface MarkdownComponentProps {
  children?: React.ReactNode;
  className?: string;
  inline?: boolean;
  node?: unknown;
}

interface Position {
  x: number
  y: number
}

interface Size {
  width: number;
  height: number;
}

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
}

// New component for progress messages
const ProgressMessage = ({ message }: { message: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [previousMessage, setPreviousMessage] = useState(message);

  useEffect(() => {
    if (message !== previousMessage) {
      // Start fade out
      setIsVisible(false);
      
      // After fade out, update message and start fade in
      const timer = setTimeout(() => {
        setPreviousMessage(message);
        setIsVisible(true);
      }, 300); // Match the animation duration

      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [message, previousMessage]);

  return (
    <div 
      className={`flex items-center gap-2 p-3 text-muted-foreground text-sm ${
        isVisible ? 'fade-enter' : 'fade-exit'
      }`}
    >
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{previousMessage}</span>
    </div>
  );
};

export function AiChat({ isOpen, onClose }: AiChatProps) {
  const { ontologyId, refreshGraph } = useGraph();
  const { organization } = useOrganization();
  const { user } = useUser();
  const ablyClientRef = useRef<Ably.Realtime | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Position>({ x: 27, y: 21.5 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<Size>({ width: 800, height: 500 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<string>('')
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 })
  const [attachment, setAttachment] = useState<FileAttachment | null>(null)
  const [isProcessingFile, setIsProcessingFile] = useState(false)

  useEffect(() => {
    if (!user?.clerkId || !isOpen) return;

    // Initialize Ably client
    ablyClientRef.current = new Ably.Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
      clientId: user.clerkId
    });

    // Subscribe to AI chat updates channel
    const channel = ablyClientRef.current.channels.get(`ai-chat:${user.clerkId}`);

    // Handle incoming messages
    channel.subscribe('message', (message) => {
      try {
        const { type, message: content } = message.data;

        if (type === 'progress') {
          // For progress messages, replace the last progress message if it exists
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessageIndex = newMessages.length - 1;
            
            // If the last message was a progress message, replace it
            if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].role === 'progress') {
              newMessages[lastMessageIndex] = {
                role: 'progress',
                content
              };
            } else {
              // Otherwise add new progress message
              newMessages.push({
                role: 'progress',
                content
              });
            }
            
            return newMessages;
          });
        } else {
          // For regular messages, remove any progress messages and append the new message
          setMessages(prev => {
            // Filter out progress messages
            const messagesWithoutProgress = prev.filter(msg => msg.role !== 'progress');
            
            // Add the new message
            return [...messagesWithoutProgress, {
              role: 'assistant',
              content
            }];
          });
        }
      } catch (error) {
        console.error('Error handling Ably message:', error);
      }
    });

    // Cleanup function
    return () => {
      if (ablyClientRef.current) {
        channel.unsubscribe();
        ablyClientRef.current.close();
        ablyClientRef.current = null;
      }
    };
  }, [user?.clerkId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !attachment) return
    if (isLoading || !organization?.id || !ontologyId || !user?.clerkId) return

    setIsLoading(true)
    const userMessage: ChatMessage = { 
      role: "user", 
      content: attachment 
        ? `I have provided text from a PDF file named "${attachment.name}". When analyzing this text, please look for any Nodes and Relationships that could exist in the text that should be added to the graph. Here is the text content:\n\n${attachment.text}\n\nMy question/prompt: ${input}`
        : input 
    }
    setMessages(prev => [...prev, userMessage])
    setInput("")

    try {

      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          organizationId: organization.id,
          ontologyId,
          attachment: attachment ? {
            name: attachment.name,
            text: attachment.text
          } : null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process request');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to process request');
      }

    } catch (error) {
      console.error('Failed to process request:', error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
      setAttachment(null); // Clear attachment after sending
    }
  }

  const markdownComponents = {
    code({ inline, className, children, ...props }: MarkdownComponentProps) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-muted px-1 py-0.5 rounded" {...props}>
          {children}
        </code>
      )
    },
    p: ({ children }: MarkdownComponentProps) => <p className="mb-4">{children}</p>,
    h2: ({ children }: MarkdownComponentProps) => <h2 className="text-xl font-bold mt-6 mb-4">{children}</h2>,
    h3: ({ children }: MarkdownComponentProps) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
    ul: ({ children }: MarkdownComponentProps) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
    ol: ({ children }: MarkdownComponentProps) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
    blockquote: ({ children }: MarkdownComponentProps) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4">
        {children}
      </blockquote>
    ),
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleMouseDown = (e: MouseEvent) => {
    if (
      e.target instanceof Element && 
      (e.target.closest('button') || 
       e.target.closest('input') || 
       e.target.closest('.scroll-area') ||
       e.target.closest('a'))
    ) {
      return
    }

    setIsDragging(true)
    setDragStart({
      x: e.clientX - (window.innerWidth * (position.x / 100)),
      y: e.clientY - (window.innerHeight * (position.y / 100))
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y

    const newXPercent = Math.min(Math.max((newX / window.innerWidth) * 100, 0), 95)
    const newYPercent = Math.min(Math.max((newY / window.innerHeight) * 100, 0), 95)

    setPosition({ x: newXPercent, y: newYPercent })
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false)
    const handleGlobalMouseMove = (e: globalThis.MouseEvent) => {
      if (isDragging) {
        handleMouseMove(e as unknown as MouseEvent)
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mousemove', handleGlobalMouseMove)

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging])

  const handleResizeStart = (e: MouseEvent, direction: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)
    setResizeStart({ x: e.clientX, y: e.clientY })
  }

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return

    const scalingFactor = 0.1
    const deltaX = (e.clientX - resizeStart.x) * scalingFactor
    const deltaY = (e.clientY - resizeStart.y) * scalingFactor

    setResizeStart({ x: e.clientX, y: e.clientY })

    setSize(prevSize => {
      const newSize = { ...prevSize }

      if (resizeDirection.includes('e')) {
        newSize.width = Math.max(400, prevSize.width + deltaX)
      }
      if (resizeDirection.includes('w')) {
        newSize.width = Math.max(400, prevSize.width - deltaX)
      }
      if (resizeDirection.includes('s')) {
        newSize.height = Math.max(300, prevSize.height + deltaY)
      }
      if (resizeDirection.includes('n')) {
        newSize.height = Math.max(300, prevSize.height - deltaY)
      }

      return newSize
    })
  }

  useEffect(() => {
    const handleResizeEnd = () => setIsResizing(false)
    const handleGlobalResize = (e: globalThis.MouseEvent) => {
      if (isResizing) {
        handleResize(e as unknown as MouseEvent)
      }
    }

    document.addEventListener('mouseup', handleResizeEnd)
    document.addEventListener('mousemove', handleGlobalResize)

    return () => {
      document.removeEventListener('mouseup', handleResizeEnd)
      document.removeEventListener('mousemove', handleGlobalResize)
    }
  }, [isResizing])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file')
      e.target.value = '' // Reset input
      return
    }

    setIsProcessingFile(true)
    try {
      // Create FormData and append file
      const formData = new FormData()
      formData.append('file', file)

      // Send file to process-attachment endpoint
      const response = await fetch('/api/v1/process-attachment', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process PDF')
      }

      const { text, filename } = await response.json()
      
      setAttachment({
        name: filename,
        text: text
      })
    } catch (error) {
      console.error('Error processing PDF:', error)
      alert('Error processing PDF file')
    } finally {
      setIsProcessingFile(false)
      e.target.value = '' // Reset input
    }
  }

  return (
    <div 
      ref={cardRef}
      className={`fixed z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        width: `${size.width}px`,
        height: `${size.height}px`,
        display: isOpen ? 'block' : 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      <Card className="w-full h-full relative">
        <div 
          className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-primary/10"
          onMouseDown={(e) => handleResizeStart(e, 'n')}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-primary/10"
          onMouseDown={(e) => handleResizeStart(e, 's')}
        />
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 cursor-w-resize hover:bg-primary/10"
          onMouseDown={(e) => handleResizeStart(e, 'w')}
        />
        <div 
          className="absolute right-0 top-0 bottom-0 w-1 cursor-e-resize hover:bg-primary/10"
          onMouseDown={(e) => handleResizeStart(e, 'e')}
        />
        <div 
          className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-primary/10"
          onMouseDown={(e) => handleResizeStart(e, 'nw')}
        />
        <div 
          className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-primary/10"
          onMouseDown={(e) => handleResizeStart(e, 'ne')}
        />
        <div 
          className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-primary/10"
          onMouseDown={(e) => handleResizeStart(e, 'sw')}
        />
        <div 
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-primary/10"
          onMouseDown={(e) => handleResizeStart(e, 'se')}
        />
        <CardHeader 
          className="flex flex-row justify-between items-center cursor-grab"
        >
          <div className="flex flex-col space-y-2 w-full">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">AI Agent</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="pr-4" style={{ height: `${size.height - 200}px` }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  msg.role === 'user' 
                    ? 'bg-muted' 
                    : msg.role === 'progress' 
                      ? 'bg-transparent' 
                      : 'bg-background'
                }`}
              >
                {msg.role === 'progress' ? (
                  <ProgressMessage message={msg.content} />
                ) : (
                  <>
                    <div className="font-semibold mb-2">
                      {msg.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSubmit} className="flex w-full gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isProcessingFile ? "Processing PDF..." : "Type your message..."}
                className="flex-1"
                disabled={isLoading || isProcessingFile}
              />
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isLoading || isProcessingFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isLoading || isProcessingFile}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={isLoading || isProcessingFile}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </form>
          {attachment && (
            <div className="absolute bottom-20 left-4 right-4 bg-muted p-2 rounded-md flex justify-between items-center">
              <span className="text-sm truncate">{attachment.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAttachment(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export const useAiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    openChat: () => setIsOpen(true),
    closeChat: () => setIsOpen(false)
  };
};
