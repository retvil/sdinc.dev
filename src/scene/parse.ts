// Runtime validation of the imported scene.json. TypeScript cannot infer
// tuple bounds or kind unions from JSON module imports, so the raw JSON is
// parsed into typed structures here — invalid data fails loudly at mount.

import type { Bounds, SceneFile, SceneNode } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, context: string): string {
  if (typeof value !== 'string') throw new Error(`Scene parse error: ${context} must be a string`);
  return value;
}

function asOptionalString(value: unknown, context: string): string | undefined {
  if (value === undefined) return undefined;
  return asString(value, context);
}

function asBounds(value: unknown, context: string): Bounds {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((n) => typeof n === 'number')) {
    throw new Error(`Scene parse error: ${context}.bounds must be [left, top, right, bottom]`);
  }
  return [value[0], value[1], value[2], value[3]];
}

const NODE_KINDS = ['lamp', 'face', 'rotor'] as const;
type NodeKind = (typeof NODE_KINDS)[number];

function asKind(value: unknown, context: string): NodeKind | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string' && (NODE_KINDS as readonly string[]).includes(value)) {
    return value as NodeKind;
  }
  throw new Error(`Scene parse error: ${context}.kind must be one of ${NODE_KINDS.join(', ')}`);
}

function asNode(value: unknown, context: string): SceneNode {
  if (!isRecord(value)) throw new Error(`Scene parse error: ${context} must be an object`);
  if (!Array.isArray(value.children)) throw new Error(`Scene parse error: ${context}.children must be an array`);
  return {
    id: asString(value.id, `${context}.id`),
    name: asString(value.name, `${context}.name`),
    bounds: asBounds(value.bounds, context),
    children: value.children.map((child, index) => asNode(child, `${context}.children[${index}]`)),
    textKey: asOptionalString(value.textKey, context),
    asset: asOptionalString(value.asset, context),
    cleanAsset: asOptionalString(value.cleanAsset, context),
    kind: asKind(value.kind, context),
    action: asOptionalString(value.action, context),
  };
}

export function parseScene(raw: unknown): SceneFile {
  if (!isRecord(raw)) throw new Error('Scene parse error: root must be an object');
  if (!isRecord(raw.reference)) throw new Error('Scene parse error: reference must be an object');
  const reference = {
    width: Number(raw.reference.width),
    height: Number(raw.reference.height),
    asset: asString(raw.reference.asset, 'reference'),
  };
  if (!isRecord(raw.content)) throw new Error('Scene parse error: content must be an object');
  if (!isRecord(raw.nodes)) throw new Error('Scene parse error: nodes must be an object');
  const content: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw.content)) {
    content[key] = asString(value, `content.${key}`);
  }
  const nodes: Record<string, { title: string; description: string }> = {};
  for (const [key, value] of Object.entries(raw.nodes)) {
    if (!isRecord(value)) throw new Error(`Scene parse error: nodes.${key} must be an object`);
    nodes[key] = {
      title: asString(value.title, `nodes.${key}.title`),
      description: asString(value.description, `nodes.${key}.description`),
    };
  }
  return {
    version: asString(raw.version, 'version'),
    reference,
    scene: asNode(raw.scene, 'scene'),
    content,
    nodes,
  };
}
