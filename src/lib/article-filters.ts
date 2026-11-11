import { Prisma } from '@prisma/client';

// What the feed shows by default: everything except posts the classifier is confident aren't engineering.
// Unclassified posts stay visible, so the feed still works without an LLM.
export const ENGINEERING_ONLY: Prisma.ArticleWhereInput = {
  OR: [{ kind: null }, { kind: 'ENGINEERING' }, { kindConfident: false }],
};
