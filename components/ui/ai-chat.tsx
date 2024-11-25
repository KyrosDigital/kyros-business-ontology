"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X } from "lucide-react"
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

interface MarkdownComponentProps {
  children?: React.ReactNode;
  className?: string;
  inline?: boolean;
  node?: unknown;
}

export function AiChat() {
  const { ontologyId, refreshGraph } = useGraph();
  const { organization } = useOrganization();
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(
    new Set(['NODE', 'RELATIONSHIP', 'NOTE'] as FilterType[])
  )

  const toggleFilter = (filter: FilterType) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }
    setActiveFilters(newFilters);
  };

  const handleToolCalls = async (toolCalls: any[]) => {
    for (const call of toolCalls) {
      try {
        if (call.tool === 'create_node') {
          const response = await fetch('/api/v1/ontology/create-node', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...call.input,
              ontologyId,
              organizationId: organization?.id
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create node');
          }

          await refreshGraph();
        }
        
        else if (call.tool === 'create_relationship') {
          const response = await fetch('/api/v1/ontology/connect-nodes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fromNodeId: call.input.fromNodeId,
              toNodeId: call.input.toNodeId,
              relationType: call.input.relationType,
              ontologyId,
              organizationId: organization?.id
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create relationship');
          }

          await refreshGraph();
        }

      } catch (error) {
        console.error(`Error executing ${call.tool} tool:`, error);
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `I encountered an error while trying to ${call.tool === 'create_node' ? 'create the node' : 'create the relationship'}. Please try again.`
        }]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !organization?.id || !ontologyId) return

    setIsLoading(true)
    const userMessage: ChatMessage = { role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          previousMessages: messages,
          activeFilters: Array.from(activeFilters),
          organizationId: organization.id,
          ontologyId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const aiResponse = data.response.text;
      
      // Handle tool calls if they exist
      if (data.response.toolCalls) {
        await handleToolCalls(data.response.toolCalls);
      }

      setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
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

  return (
    <div className="fixed bottom-4 right-[50%] translate-x-[50%] w-[800px] z-50">
      {isOpen ? (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <div className="flex flex-col space-y-2 w-full">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">AI Assistant</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
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
