import { prisma } from '@/prisma/prisma-client'
import { NodeType } from '@prisma/client'

// Types
type CreateNodeData = {
  type: NodeType
  name: string
  description?: string
  metadata?: Record<string, any>
}

type CreateRelationshipData = {
  fromNodeId: string
  toNodeId: string
  relationType: string
}

type CreateNoteData = {
  content: string
  author: string
  nodeId: string
}

// Default includes for consistent node queries
const defaultIncludes = {
  fromRelations: {
    include: {
      toNode: true
    }
  },
  toRelations: {
    include: {
      fromNode: true
    }
  },
  notes: true
}

// Core Node Operations
export async function createNode(data: CreateNodeData) {
  return prisma.node.create({
    data,
    include: defaultIncludes
  })
}

export async function getNode(nodeId: string) {
  return prisma.node.findUnique({
    where: { id: nodeId },
    include: defaultIncludes
  })
}

export async function updateNode(nodeId: string, data: Partial<CreateNodeData>) {
  return prisma.node.update({
    where: { id: nodeId },
    data,
    include: defaultIncludes
  })
}

export async function deleteNode(nodeId: string) {
  // First delete all relationships
  await prisma.nodeRelationship.deleteMany({
    where: {
      OR: [
        { fromNodeId: nodeId },
        { toNodeId: nodeId }
      ]
    }
  })

  // Then delete all notes
  await prisma.note.deleteMany({
    where: { nodeId }
  })

  // Finally delete the node
  return prisma.node.delete({
    where: { id: nodeId }
  })
}

// Relationship Operations
export async function createRelationship(data: CreateRelationshipData) {
  return prisma.nodeRelationship.create({
    data,
    include: {
      fromNode: true,
      toNode: true
    }
  })
}

export async function deleteRelationship(fromNodeId: string, toNodeId: string, relationType: string) {
  return prisma.nodeRelationship.delete({
    where: {
      fromNodeId_toNodeId_relationType: {
        fromNodeId,
        toNodeId,
        relationType
      }
    }
  })
}

// Note Operations
export async function addNote(data: CreateNoteData) {
  return prisma.note.create({
    data,
    include: {
      node: true
    }
  })
}

export async function deleteNote(noteId: string) {
  return prisma.note.delete({
    where: { id: noteId }
  })
}

// Query Operations
export async function getOntologyData() {
  return prisma.node.findMany({
    include: defaultIncludes
  })
}

export async function getNodesByType(type: NodeType) {
  return prisma.node.findMany({
    where: { type },
    include: defaultIncludes
  })
}

export async function getNodeRelationships(nodeId: string) {
  return prisma.node.findUnique({
    where: { id: nodeId },
    include: {
      fromRelations: {
        include: {
          toNode: true
        }
      },
      toRelations: {
        include: {
          fromNode: true
        }
      }
    }
  })
}

export async function getRelatedNodes(nodeId: string, relationType?: string) {
  const where = relationType 
    ? {
        OR: [
          { fromNodeId: nodeId, relationType },
          { toNodeId: nodeId, relationType }
        ]
      }
    : {
        OR: [
          { fromNodeId: nodeId },
          { toNodeId: nodeId }
        ]
      }

  return prisma.nodeRelationship.findMany({
    where,
    include: {
      fromNode: true,
      toNode: true
    }
  })
}

export async function getNodeNotes(nodeId: string) {
  return prisma.note.findMany({
    where: { nodeId },
    orderBy: { createdAt: 'desc' }
  })
}

// Search Operations
export async function searchNodes(query: string) {
  return prisma.node.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    },
    include: defaultIncludes
  })
}

// Metadata Operations
export async function updateNodeMetadata(nodeId: string, metadata: Record<string, any>) {
  return prisma.node.update({
    where: { id: nodeId },
    data: { metadata },
    include: defaultIncludes
  })
}
