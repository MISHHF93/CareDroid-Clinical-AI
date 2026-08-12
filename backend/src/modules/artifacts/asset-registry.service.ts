import { Injectable } from '@nestjs/common';

export interface AssetRegistryItem {
  id: string;
  type: 'icon' | 'svg' | 'image' | 'template' | 'document' | 'protocol';
  title: string;
  references: string[];
  missing: boolean;
}

const ASSETS: AssetRegistryItem[] = [
  {
    id: 'protocol:sepsis',
    type: 'protocol',
    title: 'Sepsis Escalation Protocol',
    references: ['workflow:sepsis-escalation', 'asset:triage-handoff'],
    missing: false,
  },
  {
    id: 'template:discharge-summary',
    type: 'template',
    title: 'Discharge Summary Template',
    references: ['workflow:documentation'],
    missing: false,
  },
  {
    id: 'svg:hospital-floor',
    type: 'svg',
    title: 'Hospital Floor Map SVG',
    references: ['dashboard:digital-twin', 'route:hospital-map'],
    missing: false,
  },
  {
    id: 'icon:fleet-marker',
    type: 'icon',
    title: 'Fleet Marker Icon',
    references: ['route:fleet-map', 'route:live-map'],
    missing: false,
  },
  {
    id: 'document:legacy-onboarding',
    type: 'document',
    title: 'Legacy Onboarding Document',
    references: [],
    missing: false,
  },
];

// KNOWN DUPLICATE, DORMANT (found 2026-08-12, repo-wide export-collision audit):
// `modules/platform-assets/asset-registry.service.ts` also exports `AssetRegistryService`
// (TypeORM-backed, real) -- this one is an in-memory demo list. Both modules
// (`ArtifactsModule`/`PlatformAssetsModule`) are imported together into `chat.module.ts`/
// `memory.module.ts`, but nothing there currently injects either version, so no active bug --
// a live trap for whichever gets picked up if a future constructor injects `AssetRegistryService`
// by name in one of those modules. See docs/architecture/CARE_DROID_MASTER_BACKLOG.md.
@Injectable()
export class AssetRegistryService {
  listAssets(params: { query?: string; type?: string; includeMissing?: boolean } = {}) {
    const query = (params.query || '').trim().toLowerCase();
    const type = params.type || 'all';
    return ASSETS.filter((asset) => {
      if (type !== 'all' && asset.type !== type) return false;
      if (!params.includeMissing && asset.missing) return false;
      if (!query) return true;
      return [asset.id, asset.type, asset.title, ...asset.references]
        .join(' ')
        .toLowerCase()
        .includes(query);
    }).map((asset) => ({
      ...asset,
      usageCount: asset.references.length,
      status: asset.missing ? 'missing' : asset.references.length ? 'referenced' : 'orphan',
    }));
  }
}
