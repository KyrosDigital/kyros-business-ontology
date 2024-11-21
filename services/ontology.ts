import { prisma } from '@/prisma/prisma-client'
import { NodeType } from '@prisma/client'
import { openAIService } from '@/services/openai'
import { pineconeService } from '@/services/pinecone'

// Types
type InputJsonValue = string | number | boolean | null | { [key: string]: InputJsonValue } | InputJsonValue[];

type CreateNodeData = {
  type: NodeType
  name: string
  description?: string
  metadata?: InputJsonValue
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

export async function updateNode(nodeId: string, data: Partial<CreateNodeData>) {
  // First fetch the existing node to merge with updates
  const existingNode = await prisma.node.findUnique({
    where: { id: nodeId }
  });

  if (!existingNode) {
    throw new Error('Node not found');
  }

  // Merge existing and new data for embedding generation
  const updatedName = data.name || existingNode.name;
  const updatedDescription = data.description ?? existingNode.description;
  const updatedType = data.type || existingNode.type;

  // Generate embedding for updated content
  const textForEmbedding = `${updatedName} ${updatedDescription || ''}`.trim();
  const vector = await openAIService.generateEmbedding(textForEmbedding);

  // Update vector in Pinecone
  const vectorId = await pineconeService.upsertNodeVector(
    nodeId,
    vector,
    updatedType,
    textForEmbedding
  );

  // Update node in database with new data and vector ID
  return prisma.node.update({
    where: { id: nodeId },
    data: {
      ...data,
      vectorId,
    },
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
    // Generate embedding for node content
    const nodeTextForEmbedding = `${data.name} ${data.description || ''}`.trim();
    const nodeVector = await openAIService.generateEmbedding(nodeTextForEmbedding);

    // Create the child node
    const childNode = await tx.node.create({
      data: {
        type: data.type,
        name: data.name,
        description: data.description,
        metadata: data.metadata,
      }
    });

    // Store node vector in Pinecone
    const nodeVectorId = await pineconeService.upsertNodeVector(
      childNode.id,
      nodeVector,
      data.type,
      nodeTextForEmbedding
    );

    // Update node with vector ID
    await tx.node.update({
      where: { id: childNode.id },
      data: { vectorId: nodeVectorId }
    });

    // Get parent node for relationship embedding
    const parentNode = await tx.node.findUnique({
      where: { id: parentId },
      select: { name: true }
    });

    if (!parentNode) {
      throw new Error('Parent node not found');
    }

    // Create the relationship
    const relationship = await tx.nodeRelationship.create({
      data: {
        fromNodeId: parentId,
        toNodeId: childNode.id,
        relationType
      }
    });

    // Generate and store embedding for relationship
    const relationshipText = `${parentNode.name} ${relationType} ${data.name}`;
    const relationshipVector = await openAIService.generateEmbedding(relationshipText);
    const relationshipVectorId = await pineconeService.upsertRelationshipVector(
      relationship.id,
      relationshipVector,
      relationType,
      relationshipText
    );

    // Update relationship with vector ID
    await tx.nodeRelationship.update({
      where: { id: relationship.id },
      data: { vectorId: relationshipVectorId }
    });

    // Return the child node with all relationships included
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
      select: { id: true, name: true }
    }),
    prisma.node.findUnique({ 
      where: { id: toNodeId },
      select: { id: true, name: true }
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
    }),
    prisma.node.findUnique({
      where: { id: fromNodeId },
      select: { name: true }
    }),
    prisma.node.findUnique({
      where: { id: toNodeId },
      select: { name: true }
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
  metadata?: InputJsonValue
}

// Add this new function
export async function createNode(data: CreateNodeInput) {
  // Generate embedding for node content
  const textForEmbedding = `${data.name} ${data.description || ''}`.trim();
  const vector = await openAIService.generateEmbedding(textForEmbedding);

  // Create node in database
  const node = await prisma.node.create({
    data: {
      type: data.type,
      name: data.name,
      description: data.description,
      metadata: data.metadata
    },
    include: defaultIncludes
  });

  // Store vector in Pinecone
  const vectorId = await pineconeService.upsertNodeVector(
    node.id,
    vector,
    data.type,
    textForEmbedding
  );

  // Update node with vector ID
  return prisma.node.update({
    where: { id: node.id },
    data: { vectorId },
    include: defaultIncludes
  });
}

