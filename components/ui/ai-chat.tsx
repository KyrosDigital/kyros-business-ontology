"use client"

import { useState, useRef, useEffect, MouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Paperclip } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useGraph } from "@/contexts/GraphContext"
import { useOrganization } from "@/contexts/OrganizationContext"

type FilterType = 'NODE' | 'RELATIONSHIP' | 'NOTE';

interface ChatMessage {
  role: "user" | "assistant"
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

const LoadingDots = () => {
  return (
    <div className="flex space-x-2 p-2">
      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
    </div>
  )
}

export function AiChat({ isOpen, onClose }: AiChatProps) {
  const { ontologyId, refreshGraph } = useGraph();
  const { organization } = useOrganization();
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(
    new Set(['NODE', 'RELATIONSHIP', 'NOTE'] as FilterType[])
  )
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

  const toggleFilter = (filter: FilterType) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }
    setActiveFilters(newFilters);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !attachment) return
    if (isLoading || !organization?.id || !ontologyId) return

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
      // Add initial AI message
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm processing your request. You'll see updates appear in the graph as I work on it." 
      }]);

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
              <span className="text-lg font-bold">AI Assistant</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {(['NODE', 'RELATIONSHIP', 'NOTE'] as FilterType[]).map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilters.has(filter) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleFilter(filter)}
                  className="text-xs"
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="pr-4" style={{ height: `${size.height - 200}px` }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-4 ${msg.role === 'user' ? 'bg-muted' : 'bg-background'}`}
              >
                <div className="font-semibold mb-2">
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                {msg.content === "loading" ? (
                  <LoadingDots />
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {msg.content}
                  </ReactMarkdown>
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
