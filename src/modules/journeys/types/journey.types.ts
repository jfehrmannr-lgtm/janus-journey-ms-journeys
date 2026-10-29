import type { ParentReference } from '@common/parent-reference.js';

export type EntityType = 'journey' | 'folder' | 'task';

export type TaskState =
  'pending' | 'in-progress' | 'completed' | 'in-pause' | 'discarded';

export interface BaseResourceType {
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

export interface Progress {
  completed: number;
  discarded: number;
  total: number;
  percentage: number;
}

export interface Journey extends BaseResourceType {
  uid: string;
  ownerUid: string;
  type: 'journey';
  parent: ParentReference;
  name: string;
  description: string | null;
  imgUrl?: string;
  metadata: Record<string, unknown>;
  progress?: Progress;
}

export interface Folder extends BaseResourceType {
  uid: string;
  ownerUid: string;
  type: 'folder';
  parent: ParentReference;
  name: string;
  description: string | null;
  orderIndex: unknown;
  metadata: Record<string, unknown>;
  progress?: Progress;
}

export interface Task extends BaseResourceType {
  uid: string;
  ownerUid: string;
  type: 'task';
  parent: ParentReference;
  name: string;
  description: string | null;
  taskType: null;
  state: TaskState;
  isVisible: boolean;
  orderIndex: unknown;
  metadata: Record<string, unknown>;
}

export interface FolderWithTasks extends Folder {
  tasks: Task[];
}

export interface JourneyWithResources extends Journey {
  folders: FolderWithTasks[];
  tasks: Task[];
}
