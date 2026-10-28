export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { type: string; ext: string; matches: (b: Buffer) => boolean }[] = [
  {
    type: 'image/jpeg',
    ext: 'jpg',
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: 'image/png',
    ext: 'png',
    matches: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    type: 'image/webp',
    ext: 'webp',
    matches: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    type: 'application/pdf',
    ext: 'pdf',
    matches: (b) => b.subarray(0, 5).toString('ascii') === '%PDF-',
  },
];

/** Detects the real file type from its first bytes; the client-declared MIME type is ignored. */
export function detectProofType(content: Buffer): { type: string; ext: string } | null {
  const found = SIGNATURES.find((s) => s.matches(content));
  return found ? { type: found.type, ext: found.ext } : null;
}

export const MAX_CAUSE_IMAGE_BYTES = 2 * 1024 * 1024;

/** Like detectProofType, restricted to images (cover pictures of causes). */
export function detectImageType(content: Buffer): { type: string; ext: string } | null {
  const found = detectProofType(content);
  return found?.type.startsWith('image/') ? found : null;
}
