import { prisma } from '@/prisma/prisma-client'
import { NodeType } from '@prisma/client'
import { determineRelationType } from '@/types/graph'

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
  return prisma.node.update({
    where: { id: nodeId },
    data,
    include: defaultIncludes
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
    // Create the child node
    const childNode = await tx.node.create({
      data: {
        type: data.type,
        name: data.name,
        description: data.description,
        metadata: data.metadata,
      }
    });

    // Create the relationship with the user-provided type
    await tx.nodeRelationship.create({
      data: {
        fromNodeId: parentId,
        toNodeId: childNode.id,
        relationType
      }
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
  // First, let's check what nodes exist in the database
  const allNodes = await prisma.node.findMany({
    select: { id: true }
  });

  // Then verify both nodes exist
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
  return prisma.nodeRelationship.create({
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
    where: { id: nodeId }
  });

  if (!nodeExists) {
    return null;
  }

  switch (strategy) {
    case 'orphan':
      return prisma.$transaction(async (tx) => {
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

        // Finally delete the node itself
        return tx.node.delete({
          where: { id: nodeId }
        });
      });

    case 'cascade':
      return prisma.$transaction(async (tx) => {
        const descendants = await getDescendantNodes(nodeId);
        
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
        
        // Finally delete the target node
        return tx.node.delete({
          where: { id: nodeId }
        });
      });

    case 'reconnect':
      return prisma.$transaction(async (tx) => {
        // Get the parent relationship and child relationships
        const parentRel = await getParentNode(nodeId);
        const childRels = await getChildNodes(nodeId);
        
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
              await tx.nodeRelationship.create({
                data: {
                  fromNodeId: parentRel.fromNode.id,
                  toNodeId: childRel.toNode.id,
                  relationType: childRel.relationType
                }
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
        
        // Finally delete the node itself
        return tx.node.delete({
          where: { id: nodeId }
        });
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

