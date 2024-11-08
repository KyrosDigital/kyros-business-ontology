import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRelationshipType(type: string) {
  switch(type) {
    case 'Department': return 'has department';
    case 'Role': return 'has role';
    case 'Process': return 'has process';
    case 'Task': return 'has task';
    case 'Integration': return 'integrates';
    case 'DataSource': return 'uses';
    case 'AIComponent': return 'implements';
    case 'Analytics': return 'analyzes';
    case 'SoftwareTool': return 'uses tool';
    default: return 'connects to';
  }
}

export const graphColors = {
  Organization: '#69b3a2',
  Department: '#ffcc00',
  Role: '#ff6600',
  Process: '#0066cc',
  Task: '#cc0066',
  Integration: '#9900cc',
  DataSource: '#00cc99',
  AIComponent: '#ff3333',
  Analytics: '#3333ff',
  SoftwareTool: '#ff99cc'
};
