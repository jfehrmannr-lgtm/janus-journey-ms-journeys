export type ParentType = 'user' | 'journey' | 'folder';

export interface ParentReference {
  uid: string;
  type: ParentType;
}
