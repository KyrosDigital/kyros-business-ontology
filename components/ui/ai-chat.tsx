"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { sendMessage } from "@/lib/claude"
import { X } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface AiChatProps {
  ontologyData: any
}

export function AiChat({ ontologyData }: AiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    const userMessage = { role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")

    try {
      const response = await sendMessage(input, messages, ontologyData)
      setMessages(prev => [...prev, { role: "assistant", content: response }])
    } catch (error) {
      console.error('Failed to get response:', error)
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm sorry, I encountered an error. Please try again." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const markdownComponents = {
    code({node, inline, className, children, ...props}) {
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
    p: ({children}) => <p className="mb-4">{children}</p>,
    h2: ({children}) => <h2 className="text-xl font-bold mt-6 mb-4">{children}</h2>,
    h3: ({children}) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
    ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
    ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
    blockquote: ({children}) => (
      <blockquote className="border-l-4 border-primary pl-4 italic my-4">
        {children}
      </blockquote>
    ),
  }

  return (
    <div className="fixed bottom-4 right-[50%] translate-x-[50%] w-[800px] z-50">
      {isOpen ? (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <span className="text-lg font-bold">AI Assistant</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-4 ${msg.role === 'user' ? 'bg-muted' : 'bg-background'}`}
                >
                  <div className="font-semibold mb-2">
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </div>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send"}
              </Button>
            </form>
          </CardFooter>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="mx-auto block"
          onClick={() => setIsOpen(true)}
        >
          Open Chat
        </Button>
      )}
    </div>
  )
}
