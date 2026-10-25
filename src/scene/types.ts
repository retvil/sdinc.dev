// Scene types — mirroring sdinc-fidelity-v5-desktop scene.json structure.

export type Bounds = [number, number, number, number];

export interface SceneNode {
  id: string;
  name: string;
  bounds: Bounds;
  children: SceneNode[];
  textKey?: string;
  asset?: string;
  cleanAsset?: string;
  kind?: 'lamp' | 'face' | 'rotor';
  action?: string;
}

export interface SceneFile {
  version: string;
  reference: {
    width: number;
    height: number;
    asset: string;
  };
  scene: SceneNode;
  content: Record<string, string>;
  nodes: Record<string, { title: string; description: string }>;
}

export interface LayerOverride {
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
}
