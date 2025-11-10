import { describe, it, expect } from 'vitest';
import { inferTagsFromText } from '@/lib/evidence/select';
import { DomainTag } from '@/lib/evidence/types';

describe('inferTagsFromText', () => {
  it('detects reading keywords', () => {
    const tags = inferTagsFromText('phonics decoding phoneme oral reading comprehension');
    expect(tags).toContain(DomainTag.Reading);
  });

  it('detects writing keywords including compose/spell', () => {
    const tags = inferTagsFromText('students compose and practice spelling and handwriting');
    expect(tags).toContain(DomainTag.Writing);
  });

  it('detects math keywords broadly', () => {
    const tags = inferTagsFromText(
      'count numbers, addition, subtraction, fractions and math facts',
    );
    expect(tags).toContain(DomainTag.Math);
  });

  it('detects behavior/FBA signals including ABC and tantrum', () => {
    const tags = inferTagsFromText(
      'PBIS intervention with ABC data, antecedent, escape, attention, and tantrum',
    );
    expect(tags).toContain(DomainTag.Behavior);
    expect(tags).toContain(DomainTag.FBA);
  });

  it('detects AAC with communication device/board and device context', () => {
    const t1 = inferTagsFromText('augmentative communication device');
    const t2 = inferTagsFromText('AAC speech generating device');
    const t3 = inferTagsFromText('communication board recommended');
    expect(t1).toContain(DomainTag.AAC);
    expect(t2).toContain(DomainTag.AAC);
    expect(t3).toContain(DomainTag.AAC);
  });
});
