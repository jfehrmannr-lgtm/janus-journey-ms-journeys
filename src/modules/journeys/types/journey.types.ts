import type { ParentReference } from '@common/parent-reference.js';

export type EntityType = 'journey' | 'folder' | 'task';

export type TaskState =
  'pending' | 'in-progress' | 'complete' | 'in-pause' | 'discarded';

export interface Progress {
  completed: number;
  discarded: number;
  total: number;
  percentage: number;
}

export interface Journey {
  uid: string;
  type: 'journey';
  parent: ParentReference;
  name: string;
  description: string | null;
  metadata: Record<string, unknown>;
  progress?: Progress;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  uid: string;
  type: 'folder';
  parent: ParentReference;
  name: string;
  description: string | null;
  orderIndex: unknown;
  metadata: Record<string, unknown>;
  progress?: Progress;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  uid: string;
  type: 'task';
  parent: ParentReference;
  name: string;
  description: string | null;
  taskType: null;
  state: TaskState;
  isVisible: boolean;
  orderIndex: unknown;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderWithTasks extends Folder {
  tasks: Task[];
}

export interface JourneyWithResources extends Journey {
  folders: FolderWithTasks[];
  tasks: Task[];
}
