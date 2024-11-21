import { prisma } from '../prisma/prisma-client'
import { NodeType, Prisma } from '@prisma/client'
import { openAIService } from './openai'
import { pineconeService } from './pinecone'

// Types
type CreateNodeData = {
  type: NodeType
  name: string
  description?: string
  metadata?: Prisma.JsonValue
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

export interface NodeWithRelations {
  id: string;
  type: NodeType;
  name: string;
  description?: string | null;
  metadata?: Prisma.JsonValue;
  fromRelations?: {
    id: string;
    relationType: string;
    toNode: {
      id: string;
      type: NodeType;
      name: string;
    };
  }[];
  toRelations?: {
    id: string;
    relationType: string;
    fromNode: {
      id: string;
      type: NodeType;
      name: string;
    };
  }[];
  notes?: {
    id: string;
    content: string;
    author: string;
  }[];
}

export function generateNodeEmbeddingContent(node: NodeWithRelations): string {
  let content = `Type: ${node.type}\nName: ${node.name}\n`;
  
  if (node.description) {
    content += `Description: ${node.description}\n`;
  }

  if (node.metadata) {
    content += `Additional Information: ${JSON.stringify(node.metadata)}\n`;
  }

  if (node.fromRelations?.length) {
    content += '\nOutgoing Relationships:\n';
    node.fromRelations.forEach(rel => {
      content += `- ${rel.relationType} -> ${rel.toNode.type} "${rel.toNode.name}"\n`;
    });
  }

  if (node.toRelations?.length) {
    content += '\nIncoming Relationships:\n';
    node.toRelations.forEach(rel => {
      content += `- ${rel.fromNode.type} "${rel.fromNode.name}" ${rel.relationType} -> This Node\n`;
    });
  }

  if (node.notes?.length) {
    content += '\nNotes:\n';
    node.notes.forEach(note => {
      content += `- ${note.author}: ${note.content}\n`;
    });
  }

  return content;
}

export async function updateNode(nodeId: string, data: Partial<CreateNodeData>) {
  const existingNode = await prisma.node.findUnique({
    where: { id: nodeId },
    include: defaultIncludes
  });

  if (!existingNode) {
    throw new Error('Node not found');
  }

  const updatedName = data.name || existingNode.name;
  const updatedDescription = data.description ?? existingNode.description;

  const textForEmbedding = `${updatedName} ${updatedDescription || ''}`.trim();
  const vector = await openAIService.generateEmbedding(textForEmbedding);

  const vectorId = await pineconeService.upsertNodeVector(
    nodeId,
    vector,
    existingNode,
    textForEmbedding
  );

  const updateData: Prisma.NodeUpdateInput = {
    ...data,
    vectorId,
    metadata: data.metadata === null ? Prisma.JsonNull : data.metadata
  };

  return prisma.node.update({
    where: { id: nodeId },
    data: updateData,
    include: defaultIncludes
  });
}

// Note Operations
export async function addNote(data: CreateNoteData) {
  // Generate embedding for note content
  const vector = await openAIService.generateEmbedding(data.content);

  // Create note in database
  const note = await prisma.note.create({
    data: data,
    include: {
      node: true
    }
  });

  // Store vector in Pinecone and get vector ID
  const vectorId = await pineconeService.upsertNoteVector(
    note.id,
    vector,
    data.content
  );

  // Update note with vector ID
  return prisma.note.update({
    where: { id: note.id },
    data: { vectorId },
    include: {
      node: true
    }
  });
}

// Query Operations
export async function getOntologyData() {
  return prisma.node.findMany({
    include: defaultIncludes
  })
}

// Add new function to create child node with relationship
export async function createChildNode(
  parentId: string, 
  data: CreateNodeData,
  relationType: string
) {
  if (!parentId) {
    throw new Error('Parent ID is required');
  }

  return prisma.$transaction(async (tx) => {
    const nodeTextForEmbedding = `${data.name} ${data.description || ''}`.trim();
    const nodeVector = await openAIService.generateEmbedding(nodeTextForEmbedding);

    const createData: Prisma.NodeCreateInput = {
      type: data.type,
      name: data.name,
      description: data.description,
      metadata: data.metadata === null ? Prisma.JsonNull : data.metadata
    };

    const childNode = await tx.node.create({
      data: createData,
      include: defaultIncludes
    });

    const nodeVectorId = await pineconeService.upsertNodeVector(
      childNode.id,
      nodeVector,
      childNode,
      nodeTextForEmbedding
    );

    await tx.node.update({
      where: { id: childNode.id },
      data: { vectorId: nodeVectorId }
    });

    const parentNode = await tx.node.findUnique({
      where: { id: parentId },
      include: {
        ...defaultIncludes,
        fromRelations: {
          include: {
            toNode: {
              select: {
                id: true,
                type: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!parentNode) {
      throw new Error('Parent node not found');
    }

    const relationship = await tx.nodeRelationship.create({
      data: {
        fromNodeId: parentId,
        toNodeId: childNode.id,
        relationType
      }
    });

    const relationshipText = `${parentNode.name} ${relationType} ${data.name}`;
    const relationshipVector = await openAIService.generateEmbedding(relationshipText);
    const relationshipVectorId = await pineconeService.upsertRelationshipVector(
      relationship.id,
      relationshipVector,
      {
        id: parentNode.id,
        type: parentNode.type,
        name: parentNode.name
      },
      {
        id: childNode.id,
        type: childNode.type,
        name: childNode.name
      },
      relationType,
      relationshipText
    );

    await tx.nodeRelationship.update({
      where: { id: relationship.id },
      data: { vectorId: relationshipVectorId }
    });

    return tx.node.findUnique({
      where: { id: childNode.id },
      include: defaultIncludes
    });
  });
}

// Add new function to connect nodes with a specific relationship type
export async function connectNodes(
  fromNodeId: string,
  toNodeId: string,
  relationType: string = 'PARENT_CHILD'
) {
  // Verify both nodes exist and get their names for the embedding
  const [fromNode, toNode] = await Promise.all([
    prisma.node.findUnique({ 
      where: { id: fromNodeId },
      select: { id: true, name: true, type: true }
    }),
    prisma.node.findUnique({ 
      where: { id: toNodeId },
      select: { id: true, name: true, type: true }
    })
  ]);

  if (!fromNode || !toNode) {
    const missing = [];
    if (!fromNode) missing.push('fromNode');
    if (!toNode) missing.push('toNode');
    throw new Error(`Node(s) not found: ${missing.join(', ')}. Attempted IDs: fromNodeId=${fromNodeId}, toNodeId=${toNodeId}`);
  }

  // Create the relationship
  const relationship = await prisma.nodeRelationship.create({
    data: {
      fromNodeId,
      toNodeId,
      relationType
    },
    include: {
      fromNode: true,
      toNode: true
    }
  });

  // Generate embedding for the relationship
  const relationshipText = `${fromNode.name} ${relationType} ${toNode.name}`;
  const vector = await openAIService.generateEmbedding(relationshipText);

  // Store vector in Pinecone and get vector ID
  const vectorId = await pineconeService.upsertRelationshipVector(
    relationship.id,
    vector,
    {
      id: fromNode.id,
      type: fromNode.type,
      name: fromNode.name
    },
    {
      id: toNode.id,
      type: toNode.type,
      name: toNode.name
    },
    relationType,
    relationshipText
  );

  // Update relationship with vector ID
  return prisma.nodeRelationship.update({
    where: { id: relationship.id },
    data: { vectorId },
    include: {
      fromNode: true,
      toNode: true
    }
  });
}

// Add this new function for graph-specific data
export async function getGraphData() {
  // Get all nodes with their relationships
  const nodes = await prisma.node.findMany({
    include: {
      notes: {
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          content: true,
          author: true,
          nodeId: true,
          createdAt: true,
          updatedAt: true
        }
      },
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
  });

  // Get all relationships
  const relationships = await prisma.nodeRelationship.findMany({
    include: {
      fromNode: true,
      toNode: true
    }
  });

  return {
    nodes,
    relationships
  };
}

// Add a new function to get detailed node data
export async function getNodeWithDetails(nodeId: string) {
  return prisma.node.findUnique({
    where: { id: nodeId },
    include: {
      fromRelations: {
        include: {
          toNode: {
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
              metadata: true
            }
          }
        }
      },
      toRelations: {
        include: {
          fromNode: {
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
              metadata: true
            }
          }
        }
      },
      notes: {
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          content: true,
          author: true,
          nodeId: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });
}

// Add these new functions to handle different deletion strategies
export async function deleteNodeWithStrategy(nodeId: string, strategy: 'orphan' | 'cascade' | 'reconnect') {
  // First verify the node exists before starting any transaction
  const nodeExists = await prisma.node.findUnique({
    where: { id: nodeId },
    include: {
      fromRelations: true,
      toRelations: true,
      notes: true
    }
  });

  if (!nodeExists) {
    return null;
  }

  switch (strategy) {
    case 'orphan':
      return prisma.$transaction(async (tx) => {
        // Collect vector IDs to delete
        const vectorIds: string[] = [];
        if (nodeExists.vectorId) vectorIds.push(nodeExists.vectorId);
        nodeExists.fromRelations.forEach(rel => rel.vectorId && vectorIds.push(rel.vectorId));
        nodeExists.toRelations.forEach(rel => rel.vectorId && vectorIds.push(rel.vectorId));
        nodeExists.notes.forEach(note => note.vectorId && vectorIds.push(note.vectorId));

        // Delete all notes first
        await tx.note.deleteMany({
          where: { nodeId }
        });

        // Delete all relationships where this node is involved
        await tx.nodeRelationship.deleteMany({
          where: {
            OR: [
              { fromNodeId: nodeId },
              { toNodeId: nodeId }
            ]
          }
        });

        // Delete the node itself
        const deletedNode = await tx.node.delete({
          where: { id: nodeId }
        });

        // Delete vectors from Pinecone after successful database transaction
        if (vectorIds.length > 0) {
          await pineconeService.deleteVectors(vectorIds);
        }

        return deletedNode;
      });

    case 'cascade':
      return prisma.$transaction(async (tx) => {
        const descendants = await getDescendantNodes(nodeId);
        
        // Collect all vector IDs to delete
        const vectorIds: string[] = [];
        if (nodeExists.vectorId) vectorIds.push(nodeExists.vectorId);
        
        // Get vector IDs from descendants and their relationships
        for (const descendant of descendants) {
          const descendantWithRels = await tx.node.findUnique({
            where: { id: descendant.id },
            include: {
              fromRelations: true,
              toRelations: true,
              notes: true
            }
          });
          
          if (descendantWithRels?.vectorId) vectorIds.push(descendantWithRels.vectorId);
          descendantWithRels?.fromRelations.forEach(rel => rel.vectorId && vectorIds.push(rel.vectorId));
          descendantWithRels?.toRelations.forEach(rel => rel.vectorId && vectorIds.push(rel.vectorId));
          descendantWithRels?.notes.forEach(note => note.vectorId && vectorIds.push(note.vectorId));
        }

        // Delete relationships first for all nodes
        await tx.nodeRelationship.deleteMany({
          where: {
            OR: [
              { fromNodeId: { in: [...descendants.map(d => d.id), nodeId] } },
              { toNodeId: { in: [...descendants.map(d => d.id), nodeId] } }
            ]
          }
        });

        // Delete notes for all nodes
        await tx.note.deleteMany({
          where: {
            nodeId: { in: [...descendants.map(d => d.id), nodeId] }
          }
        });

        // Delete descendant nodes
        for (const descendant of descendants) {
          await tx.node.delete({
            where: { id: descendant.id }
          });
        }
        
        // Delete the target node
        const deletedNode = await tx.node.delete({
          where: { id: nodeId }
        });

        // Delete vectors from Pinecone after successful database transaction
        if (vectorIds.length > 0) {
          await pineconeService.deleteVectors(vectorIds);
        }

        return deletedNode;
      });

    case 'reconnect':
      return prisma.$transaction(async (tx) => {
        // Get the parent relationship and child relationships
        const parentRel = await getParentNode(nodeId);
        const childRels = await getChildNodes(nodeId);
        
        // Collect vector IDs to delete
        const vectorIds: string[] = [];
        if (nodeExists.vectorId) vectorIds.push(nodeExists.vectorId);
        nodeExists.fromRelations.forEach(rel => rel.vectorId && vectorIds.push(rel.vectorId));
        nodeExists.toRelations.forEach(rel => rel.vectorId && vectorIds.push(rel.vectorId));
        nodeExists.notes.forEach(note => note.vectorId && vectorIds.push(note.vectorId));

        if (parentRel) {
          // Reconnect each child to the parent, but check for existing relationships first
          for (const childRel of childRels) {
            // Check if relationship already exists
            const existingRelationship = await tx.nodeRelationship.findFirst({
              where: {
                fromNodeId: parentRel.fromNode.id,
                toNodeId: childRel.toNode.id,
                relationType: childRel.relationType
              }
            });

            // Only create the relationship if it doesn't already exist
            if (!existingRelationship) {
              const newRelationship = await tx.nodeRelationship.create({
                data: {
                  fromNodeId: parentRel.fromNode.id,
                  toNodeId: childRel.toNode.id,
                  relationType: childRel.relationType
                }
              });

              // Generate and store embedding for new relationship
              const relationshipText = `${parentRel.fromNode.name} ${childRel.relationType} ${childRel.toNode.name}`;
              const vector = await openAIService.generateEmbedding(relationshipText);
              const vectorId = await pineconeService.upsertRelationshipVector(
                newRelationship.id,
                vector,
                {
                  id: parentRel.fromNode.id,
                  type: parentRel.fromNode.type,
                  name: parentRel.fromNode.name
                },
                {
                  id: childRel.toNode.id,
                  type: childRel.toNode.type,
                  name: childRel.toNode.name
                },
                childRel.relationType,
                relationshipText
              );

              // Update relationship with vector ID
              await tx.nodeRelationship.update({
                where: { id: newRelationship.id },
                data: { vectorId }
              });
            }
          }
        }
        
        // Delete the node's relationships first
        await tx.nodeRelationship.deleteMany({
          where: {
            OR: [
              { fromNodeId: nodeId },
              { toNodeId: nodeId }
            ]
          }
        });

        // Delete the node's notes
        await tx.note.deleteMany({
          where: { nodeId }
        });
        
        // Delete the node itself
        const deletedNode = await tx.node.delete({
          where: { id: nodeId }
        });

        // Delete vectors from Pinecone after successful database transaction
        if (vectorIds.length > 0) {
          await pineconeService.deleteVectors(vectorIds);
        }

        return deletedNode;
      });
  }
}

// Helper functions
async function getDescendantNodes(nodeId: string) {
  const descendants = new Set<string>();
  const visited = new Set<string>();
  
  async function collectDescendants(currentId: string) {
    if (visited.has(currentId)) return; // Prevent cycles
    visited.add(currentId);

    // Get all outgoing relationships from this node
    const relationships = await prisma.nodeRelationship.findMany({
      where: {
        fromNodeId: currentId,
      },
      include: {
        toNode: true
      }
    });

    for (const rel of relationships) {
      const childId = rel.toNode.id;
      if (!descendants.has(childId)) {
        descendants.add(childId);
        // Recursively get descendants of this child
        await collectDescendants(childId);
      }
    }
  }

  await collectDescendants(nodeId);
  
  return prisma.node.findMany({
    where: {
      id: {
        in: Array.from(descendants)
      }
    }
  });
}

// Update getParentNode to look for any incoming relationships
async function getParentNode(nodeId: string) {
  return prisma.nodeRelationship.findFirst({
    where: {
      toNodeId: nodeId,
    },
    include: {
      fromNode: true
    }
  });
}

// Update getChildNodes to look for any outgoing relationships
async function getChildNodes(nodeId: string) {
  return prisma.nodeRelationship.findMany({
    where: {
      fromNodeId: nodeId,
    },
    include: {
      toNode: true
    }
  });
}

// Add this new function to update relationship types
export async function updateRelationType(
  fromNodeId: string,
  toNodeId: string,
  newType: string
) {
  // Find the existing relationship first
  const [relationship, fromNode, toNode] = await Promise.all([
    prisma.nodeRelationship.findFirst({
      where: {
        fromNodeId,
        toNodeId,
      },
      include: {
        fromNode: true,
        toNode: true
      }
    }),
    prisma.node.findUnique({
      where: { id: fromNodeId }
    }),
    prisma.node.findUnique({
      where: { id: toNodeId }
    })
  ]);

  if (!relationship || !fromNode || !toNode) {
    throw new Error('Relationship or nodes not found');
  }

  // Generate new embedding for updated relationship
  const relationshipText = `${fromNode.name} ${newType} ${toNode.name}`;
  const vector = await openAIService.generateEmbedding(relationshipText);

  // Update vector in Pinecone
  const vectorId = await pineconeService.upsertRelationshipVector(
    relationship.id,
    vector,
    {
      id: fromNode.id,
      type: fromNode.type,
      name: fromNode.name
    },
    {
      id: toNode.id,
      type: toNode.type,
      name: toNode.name
    },
    newType,
    relationshipText
  );

  // Update the relationship with new type and vector ID
  return prisma.nodeRelationship.update({
    where: {
      id: relationship.id,
    },
    data: {
      relationType: newType,
      vectorId
    },
    include: {
      fromNode: true,
      toNode: true,
    },
  });
}

export async function deleteRelationship(sourceId: string, targetId: string) {
  // Find the relationship first
  const relationship = await prisma.nodeRelationship.findFirst({
    where: {
      fromNodeId: sourceId,
      toNodeId: targetId,
    },
  });

  if (!relationship) {
    throw new Error('Relationship not found');
  }

  // Delete vector from Pinecone if it exists
  if (relationship.vectorId) {
    await pineconeService.deleteVector(relationship.vectorId);
  }

  // Delete the relationship from the database
  return prisma.nodeRelationship.delete({
    where: {
      id: relationship.id,
    },
  });
}

// Add this with the other type definitions at the top
export type CreateNodeInput = {
  type: NodeType
  name: string
  description?: string
  metadata?: Prisma.JsonValue
}

// Add this new function
export async function createNode(data: CreateNodeInput) {
  const textForEmbedding = `${data.name} ${data.description || ''}`.trim();
  const vector = await openAIService.generateEmbedding(textForEmbedding);

  const createData: Prisma.NodeCreateInput = {
    type: data.type,
    name: data.name,
    description: data.description,
    metadata: data.metadata === null ? Prisma.JsonNull : data.metadata
  };

  // Create node in database
  const node = await prisma.node.create({
    data: createData,
    include: defaultIncludes
  });

  // Store vector in Pinecone
  const vectorId = await pineconeService.upsertNodeVector(
    node.id,
    vector,
    node, // Pass the full node object
    textForEmbedding
  );

  // Update node with vector ID
  return prisma.node.update({
    where: { id: node.id },
    data: { vectorId },
    include: defaultIncludes
  });
}

