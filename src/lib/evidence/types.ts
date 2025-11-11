export enum EvidenceLevel {
  Strong = 'strong',
  Moderate = 'moderate',
  Emerging = 'emerging',
}

export enum GradeBand {
  K3 = 'k-3',
  FourSix = '4-6',
  SevenNine = '7-9',
  TenTwelve = '10-12',
  Adult = 'adult',
}

export enum DomainTag {
  Reading = 'reading',
  Writing = 'writing',
  Math = 'math',
  Behavior = 'behavior',
  PBIS = 'pbis',
  FBA = 'fba',
  UDL = 'udl',
  HLP = 'hlp',
  AAC = 'aac',
  Autism = 'autism',
  Sensory = 'sensory',
  ProgressMonitoring = 'pm',
}

export interface EvidenceSource {
  id: string;
  title: string;
  url: string;
  shortExcerpt: string;
  tags: DomainTag[];
  loc?: string;
  year?: number;
  publisher?: string;
  evidenceLevel?: EvidenceLevel;
  gradeBands?: GradeBand[];
}

export type EvidenceSourceId = EvidenceSource['id'];

// Zod schema for runtime validation
import { z } from 'zod';

export const ZEvidenceLevel = z.enum(['strong', 'moderate', 'emerging']);
export const ZGradeBand = z.enum(['k-3', '4-6', '7-9', '10-12', 'adult']);
export const ZDomainTag = z.enum([
  'reading',
  'writing',
  'math',
  'behavior',
  'pbis',
  'fba',
  'udl',
  'hlp',
  'aac',
  'autism',
  'sensory',
  'pm',
]);

export const ZEvidenceSource = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url(),
    shortExcerpt: z.string().min(40).max(400),
    tags: z.array(ZDomainTag).min(1),
    loc: z.string().optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    publisher: z.string().optional(),
    evidenceLevel: ZEvidenceLevel.optional(),
    gradeBands: z.array(ZGradeBand).optional(),
  })
  .strict();
