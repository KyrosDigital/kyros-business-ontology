import { prisma } from '../prisma/prisma-client'
import { CustomNodeType, Prisma } from '@prisma/client'
import { openAIService } from './openai'
import { createPineconeService } from './pinecone'
import { ontologyUsageService } from './ontology-usage'

// Types
type CreateNodeData = {
  type: string;
  name: string;
  description?: string;
  metadata?: Prisma.JsonValue;
  organizationId: string;
  ontologyId: string;
}

type CreateNoteData = {
  content: string;
  author: string;
  nodeId: string;
  organizationId: string;
  ontologyId: string;
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
  type: true,
  notes: true
}

export interface NodeWithRelations {
  id: string;
  type: CustomNodeType;
  name: string;
  description?: string | null;
  ontologyId: string;
  metadata?: Prisma.JsonValue;
  fromRelations?: {
    id: string;
    relationType: string;
    toNode: {
      id: string;
      type: CustomNodeType;
      name: string;
    };
  }[];
  toRelations?: {
    id: string;
    relationType: string;
    fromNode: {
      id: string;
      type: CustomNodeType;
      name: string;
    };
  }[];
  notes?: {
    id: string;
    content: string;
    author: string;
  }[];
}

export function generateNodeEmbeddingContent(node: NodeWithRelations | Partial<CreateNodeData>): string {
  return JSON.stringify(node, null, 2);
}

// Helper function to get organization and ontology
async function getOrgAndOntology(organizationId: string, ontologyId: string) {
  const [organization, ontology] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.ontology.findUnique({ where: { id: ontologyId } })
  ]);

  if (!organization || !ontology) {
    throw new Error('Organization or Ontology not found');
  }

  return { organization, ontology };
}

export async function updateNode(
  nodeId: string, 
  data: Partial<CreateNodeData>
) {
  const { organization, ontology } = await getOrgAndOntology(
    data.organizationId!,
    data.ontologyId!
  );

  const existingNode = await prisma.node.findUnique({
    where: { id: nodeId },
    include: defaultIncludes
  });

  if (!existingNode) {
    throw new Error('Node not found');
  }

  const updatedNode = {
    ...existingNode,
    name: data.name || existingNode.name,
    description: data.description ?? existingNode.description,
    type: data.type || existingNode.type,
    metadata: data.metadata === null ? null : (data.metadata || existingNode.metadata)
  };

  const textForEmbedding = generateNodeEmbeddingContent(updatedNode);
  const vector = await openAIService.generateEmbedding(textForEmbedding);

  const pineconeService = createPineconeService(organization, ontology);
  
  // Delete the old vector if it exists
  if (existingNode.vectorId) {
    await pineconeService.deleteVector(existingNode.vectorId);
  }

  // Create new vector
  const vectorId = await pineconeService.upsertNodeVector(
    nodeId,
    vector,
    updatedNode,
    textForEmbedding
  );

  const { organizationId, ontologyId, ...updateFields } = data;

  const updateData: Prisma.NodeUpdateInput = {
    ...updateFields,
    type: data.type,
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
  const { organization, ontology } = await getOrgAndOntology(
    data.organizationId,
    data.ontologyId
  );

  const vector = await openAIService.generateEmbedding(data.content);

  const note = await prisma.note.create({
    data: {
      content: data.content,
      author: data.author,
      nodeId: data.nodeId,
      ontologyId: data.ontologyId
    },
    include: {
      node: true
    }
  });

  const pineconeService = createPineconeService(organization, ontology);
  const vectorId = await pineconeService.upsertNoteVector(
    note.id,
    vector,
    data.content,
    data.author,
    data.nodeId
  );

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
  const { organization, ontology } = await getOrgAndOntology(
    data.organizationId,
    data.ontologyId
  );

  const pineconeService = createPineconeService(organization, ontology);

  return prisma.$transaction(async (tx) => {
    const nodeTextForEmbedding = generateNodeEmbeddingContent(data);
    const nodeVector = await openAIService.generateEmbedding(nodeTextForEmbedding);

    const createData: Prisma.NodeCreateInput = {
      name: data.name,
      description: data.description,
      metadata: data.metadata || {},
      ontology: {
        connect: { id: data.ontologyId }
      },
      type: {
        connect: { id: data.type }
      }
    };

    const childNode = await tx.node.create({
      data: createData,
      include: defaultIncludes
    });

    // Update node count
    await ontologyUsageService.incrementNodeCount(data.organizationId, data.ontologyId);

		console.log('childNode', childNode)

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
        relationType,
        ontologyId: data.ontologyId
      }
    });

    // Update relationship count
    await ontologyUsageService.incrementRelationshipCount(data.organizationId, data.ontologyId);

    const relationshipText = `${parentNode.name} ${relationType} ${data.name}`;
    const relationshipVector = await openAIService.generateEmbedding(relationshipText);
    const relationshipVectorId = await pineconeService.upsertRelationshipVector(
      relationship.id,
      relationshipVector,
      {
        id: parentNode.id,
        type: parentNode.type.name,
        name: parentNode.name
      },
      {
        id: childNode.id,
        type: childNode.type.name,
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
  relationType: string = 'PARENT_CHILD',
  organizationId: string,
  ontologyId: string
) {
  const { organization, ontology } = await getOrgAndOntology(
    organizationId,
    ontologyId
  );

  const pineconeService = createPineconeService(organization, ontology);

  if (!fromNodeId) {
    throw new Error(`Node with ID ${fromNodeId} not found`);
  }
  if (!toNodeId) {
    throw new Error(`Node with ID ${toNodeId} not found`);
  }

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

  // Use transaction to ensure relationship creation and usage update succeed or fail together
  const relationship = await prisma.$transaction(async (tx) => {
    // Create the relationship
    const createdRelationship = await tx.nodeRelationship.create({
      data: {
        fromNodeId,
        toNodeId,
        relationType,
        ontologyId
      },
      include: {
        fromNode: true,
        toNode: true
      }
    });

    // Update usage tracking
    await ontologyUsageService.incrementRelationshipCount(organizationId, ontologyId);

    return createdRelationship;
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
      type: fromNode.type.name,
      name: fromNode.name
    },
    {
      id: toNode.id,
      type: toNode.type.name,
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
export async function getGraphData(ontologyId: string) {
  // Get all nodes with their relationships
  const nodes = await prisma.node.findMany({
    where: {
      ontologyId: ontologyId
    },
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

  // Get all relationships for this ontology
  const relationships = await prisma.nodeRelationship.findMany({
    where: {
      ontologyId: ontologyId
    },
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
  // Get node and create pinecone service first
  const nodeExists = await prisma.node.findUnique({
    where: { id: nodeId },
    include: {
      fromRelations: true,
      toRelations: true,
      notes: true,
      ontology: true
    }
  });

  if (!nodeExists || !nodeExists.ontology) {
    return null;
  }

  // Get organization for pinecone service
  const organization = await prisma.organization.findFirst({
    where: { ontologies: { some: { id: nodeExists.ontology.id } } }
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  const pineconeService = createPineconeService(organization, nodeExists.ontology);
  const organizationId = organization.id;
  const ontologyId = nodeExists.ontology.id;

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

        // Count relationships to be deleted for usage tracking
        const relationshipCount = nodeExists.fromRelations.length + nodeExists.toRelations.length;

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

        // Update usage tracking
        await ontologyUsageService.decrementNodeCount(organizationId, ontologyId);
        // Decrement relationships count by the total number of relationships
        for (let i = 0; i < relationshipCount; i++) {
          await ontologyUsageService.decrementRelationshipCount(organizationId, ontologyId);
        }

        // Delete vectors from Pinecone after successful database transaction
        if (vectorIds.length > 0) {
          for (const vectorId of vectorIds) {
            await pineconeService.deleteVector(vectorId);
          }
        }

        return deletedNode;
      });

    case 'cascade':
      return prisma.$transaction(async (tx) => {
        const descendants = await getDescendantNodes(nodeId);
        
        // Collect all vector IDs to delete
        const vectorIds: string[] = [];
        if (nodeExists.vectorId) vectorIds.push(nodeExists.vectorId);
        nodeExists.notes.forEach(note => note.vectorId && vectorIds.push(note.vectorId));
        
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

        // Count total relationships to be deleted for usage tracking
        let totalRelationships = nodeExists.fromRelations.length + nodeExists.toRelations.length;
        for (const descendant of descendants) {
          const descendantWithRels = await tx.node.findUnique({
            where: { id: descendant.id },
            include: {
              fromRelations: true,
              toRelations: true
            }
          });
          if (descendantWithRels) {
            totalRelationships += descendantWithRels.fromRelations.length + descendantWithRels.toRelations.length;
          }
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
          // Update usage tracking for each deleted descendant
          await ontologyUsageService.decrementNodeCount(organizationId, ontologyId);
        }
        
        // Delete the target node
        const deletedNode = await tx.node.delete({
          where: { id: nodeId }
        });

        // Update usage tracking for the target node and all relationships
        await ontologyUsageService.decrementNodeCount(organizationId, ontologyId);
        // Decrement relationships count by the total number of relationships
        for (let i = 0; i < totalRelationships; i++) {
          await ontologyUsageService.decrementRelationshipCount(organizationId, ontologyId);
        }

        // Delete vectors from Pinecone after successful database transaction
        if (vectorIds.length > 0) {
          for (const vectorId of vectorIds) {
            await pineconeService.deleteVector(vectorId);
          }
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

        // Count initial relationships for usage tracking
        const initialRelationshipCount = nodeExists.fromRelations.length + nodeExists.toRelations.length;

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
                  relationType: childRel.relationType,
                  ontologyId: nodeExists.ontology.id
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
                  type: parentRel.fromNode.type.name,
                  name: parentRel.fromNode.name
                },
                {
                  id: childRel.toNode.id,
                  type: childRel.toNode.type.name,
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

              // Update usage tracking for new relationship
              await ontologyUsageService.incrementRelationshipCount(organizationId, ontologyId);
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

        // Update usage tracking
        await ontologyUsageService.decrementNodeCount(organizationId, ontologyId);
        // Decrement relationships count by the number of original relationships
        for (let i = 0; i < initialRelationshipCount; i++) {
          await ontologyUsageService.decrementRelationshipCount(organizationId, ontologyId);
        }

        // Delete vectors from Pinecone after successful database transaction
        if (vectorIds.length > 0) {
          for (const vectorId of vectorIds) {
            await pineconeService.deleteVector(vectorId);
          }
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
        fromNode: {
          include: {
            ontology: true // Include ontology to get its ID
          }
        },
        toNode: true
      }
    }),
    prisma.node.findUnique({
      where: { id: fromNodeId },
      include: {
        type: true
      }
    }),
    prisma.node.findUnique({
      where: { id: toNodeId },
      include: {
        type: true
      }
    })
  ]);

  if (!relationship || !fromNode || !toNode) {
    throw new Error('Relationship or nodes not found');
  }

  // Get the organization for the ontology
  const organization = await prisma.organization.findFirst({
    where: {
      ontologies: {
        some: { id: relationship.fromNode.ontology.id }
      }
    }
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // Create pinecone service instance
  const pineconeService = createPineconeService(organization, relationship.fromNode.ontology);

  // Delete the old vector if it exists
  if (relationship.vectorId) {
    await pineconeService.deleteVector(relationship.vectorId);
  }

  // Generate new embedding for updated relationship
  const relationshipText = `${fromNode.name} ${newType} ${toNode.name}`;
  const vector = await openAIService.generateEmbedding(relationshipText);

  // Create new vector in Pinecone
  const vectorId = await pineconeService.upsertRelationshipVector(
    relationship.id,
    vector,
    {
      id: fromNode.id,
      type: fromNode.type.name,
      name: fromNode.name
    },
    {
      id: toNode.id,
      type: toNode.type.name,
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
  // Find the relationship first with the ontology info
  const relationship = await prisma.nodeRelationship.findFirst({
    where: {
      fromNodeId: sourceId,
      toNodeId: targetId,
    },
    include: {
      fromNode: {
        include: {
          ontology: true
        }
      }
    }
  });

  if (!relationship) {
    throw new Error('Relationship not found');
  }

  // Get the organization for the ontology
  const organization = await prisma.organization.findFirst({
    where: {
      ontologies: {
        some: { id: relationship.fromNode.ontology.id }
      }
    }
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // Create pinecone service instance
  const pineconeService = createPineconeService(organization, relationship.fromNode.ontology);

  // Use transaction to ensure both deletion and usage update succeed or fail together
  return prisma.$transaction(async (tx) => {
    // Delete the relationship from the database
    const deletedRelationship = await tx.nodeRelationship.delete({
      where: {
        id: relationship.id,
      },
    });

    // Update usage tracking
    await ontologyUsageService.decrementRelationshipCount(
      organization.id,
      relationship.fromNode.ontology.id
    );

    // Delete vector from Pinecone if it exists
    if (relationship.vectorId) {
      await pineconeService.deleteVector(relationship.vectorId);
    }

    return deletedRelationship;
  });
}

// Add this with the other type definitions at the top
export type CreateNodeInput = {
  type: CustomNodeType
  name: string
  description?: string
  metadata?: Prisma.JsonValue
}

// Add this new function
export async function createNode(data: CreateNodeData) {
  const { organization, ontology } = await getOrgAndOntology(
    data.organizationId,
    data.ontologyId
  );

  // Find the CustomNodeType by name
  const nodeType = await prisma.customNodeType.findFirst({
    where: {
      organizationId: data.organizationId,
      name: data.type,
      isDeprecated: false
    }
  });

  if (!nodeType) {
    throw new Error(`Node type "${data.type}" not found`);
  }

  const textForEmbedding = generateNodeEmbeddingContent(data);
  const vector = await openAIService.generateEmbedding(textForEmbedding);

  const createData: Prisma.NodeCreateInput = {
    name: data.name,
    description: data.description,
    metadata: data.metadata || {},
    ontology: {
      connect: { id: data.ontologyId }
    },
    type: {
      connect: { id: nodeType.id }  // Connect to the CustomNodeType
    }
  };

  // Use transaction to ensure both node creation and usage update succeed or fail together
  const node = await prisma.$transaction(async (tx) => {
    const createdNode = await tx.node.create({
      data: createData,
      include: defaultIncludes
    });

    // Update usage tracking
    await ontologyUsageService.incrementNodeCount(data.organizationId, data.ontologyId);

    return createdNode;
  });

  const pineconeService = createPineconeService(organization, ontology);
  const vectorId = await pineconeService.upsertNodeVector(
    node.id,
    vector,
    node,
    textForEmbedding
  );

  return prisma.node.update({
    where: { id: node.id },
    data: { vectorId },
    include: defaultIncludes
  });
}

export async function listOntologies(organizationId: string) {
  try {
    const ontologies = await prisma.ontology.findMany({
      where: {
        organizationId: organizationId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            nodes: true,
            relationships: true
          }
        }
      }
    });

    return { success: true, data: ontologies };
  } catch (error) {
    console.error('Error listing ontologies:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to list ontologies' 
    };
  }
}

export async function createOntology(data: { 
  name: string; 
  description?: string; 
  organizationId: string;
}) {
  try {
    const ontology = await prisma.ontology.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId: data.organizationId,
      },
      include: {
        _count: {
          select: {
            nodes: true,
            relationships: true
          }
        }
      }
    });

    // Initialize usage tracking for the new ontology
    await ontologyUsageService.initializeUsage(data.organizationId, ontology.id);

    return { success: true, data: ontology };
  } catch (error) {
    console.error('Error creating ontology:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create ontology' 
    };
  }
}

export async function deleteOntology(ontologyId: string) {
  try {
    // First get the ontology and organization details
    const ontology = await prisma.ontology.findUnique({
      where: { id: ontologyId },
      include: {
        organization: true
      }
    });

    if (!ontology) {
      return { 
        success: false, 
        error: 'Ontology not found' 
      };
    }

    // Create pinecone service for vector cleanup
    const pineconeService = createPineconeService(ontology.organization, ontology);

    // Use a transaction to ensure all database operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // 1. Delete all notes and their vectors
      const notes = await tx.note.findMany({
        where: { ontologyId }
      });
      
      for (const note of notes) {
        if (note.vectorId) {
          await pineconeService.deleteVector(note.vectorId);
        }
      }
      await tx.note.deleteMany({ where: { ontologyId } });

      // 2. Delete all relationships and their vectors
      const relationships = await tx.nodeRelationship.findMany({
        where: { ontologyId }
      });
      
      for (const rel of relationships) {
        if (rel.vectorId) {
          await pineconeService.deleteVector(rel.vectorId);
        }
      }
      await tx.nodeRelationship.deleteMany({ where: { ontologyId } });

      // 3. Delete all nodes and their vectors
      const nodes = await tx.node.findMany({
        where: { ontologyId }
      });
      
      for (const node of nodes) {
        if (node.vectorId) {
          await pineconeService.deleteVector(node.vectorId);
        }
      }
      await tx.node.deleteMany({ where: { ontologyId } });

      // 4. Delete the ontology itself
      await tx.ontology.delete({
        where: { id: ontologyId }
      });

      // 5. Delete the usage tracking record
      await ontologyUsageService.deleteUsage(ontology.organization.id, ontologyId);
    });

    // 6. Delete the entire namespace in Pinecone
    await pineconeService.deleteNamespace();

    // 7. Get updated list of ontologies
    const { data: updatedOntologies } = await listOntologies(ontology.organizationId);

    return {
      success: true,
      message: 'Ontology and all related data deleted successfully',
      data: updatedOntologies
    };

  } catch (error) {
    console.error('Error deleting ontology:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete ontology'
    };
  }
}

