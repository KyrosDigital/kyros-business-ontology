import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { NodeData, NodeType } from '@/types/graph';

/**
 * Combines multiple class names or conditional classes using clsx and tailwind-merge.
 * This utility helps merge Tailwind CSS classes safely while handling conflicts.
 * @param inputs - Array of class values, objects, or conditional classes
 * @returns Merged className string with resolved Tailwind conflicts
 * @example
 * cn('px-2 bg-red', {'text-blue': true, 'text-red': false}, 'py-4')
 * // Returns: 'px-2 bg-red text-blue py-4'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a NodeType enum value from SNAKE_CASE to Title Case
 * @param type NodeType enum value
 * @returns Formatted string in Title Case
 */
export const formatNodeType = (type: NodeType): string => {
  return type.split('_')
    .map(word => word.charAt(0) + word.toLowerCase().slice(1))
    .join(' ');
};

/**
 * Checks if a node has any child nodes by examining its fromRelations
 * @param node The node to check for children
 * @returns boolean indicating if the node has children
 */
export const hasChildren = (node: NodeData | null): boolean => {
  if (!node || !node.fromRelations) return false;
  return node.fromRelations.length > 0;
};
