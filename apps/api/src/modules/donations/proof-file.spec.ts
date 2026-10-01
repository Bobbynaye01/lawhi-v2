import { detectProofType } from './proof-file';

describe('detectProofType', () => {
  it('recognizes allowed formats from their signature', () => {
    expect(detectProofType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.type).toBe('image/jpeg');
    expect(detectProofType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.type).toBe(
      'image/png',
    );
    expect(detectProofType(Buffer.from('%PDF-1.7 ...'))?.ext).toBe('pdf');
    expect(detectProofType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))?.type).toBe('image/webp');
  });

  it('rejects anything else, whatever its declared name', () => {
    expect(detectProofType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
    expect(detectProofType(Buffer.from('MZ executable'))).toBeNull();
    expect(detectProofType(Buffer.alloc(0))).toBeNull();
  });
});
