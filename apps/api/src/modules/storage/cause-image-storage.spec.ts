import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LOCAL_CAUSE_IMAGES_ROUTE, LocalCauseImageStorage } from './cause-image-storage';

describe('LocalCauseImageStorage', () => {
  let root: string;
  let storage: LocalCauseImageStorage;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'lawhi-images-'));
    storage = new LocalCauseImageStorage(root);
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('serves what it saved under the public route, then forgets it on removal', async () => {
    const url = await storage.save('cause-1.png', Buffer.from('png'), 'image/png');
    expect(url).toBe(`${LOCAL_CAUSE_IMAGES_ROUTE}/cause-1.png`);
    expect(await storage.read('cause-1.png')).toEqual({
      content: Buffer.from('png'),
      contentType: 'image/png',
    });
    await storage.remove(url);
    expect(await storage.read('cause-1.png')).toBeNull();
  });

  it('never reads or writes outside its folder', async () => {
    await expect(storage.save('../escape.png', Buffer.from('x'), 'image/png')).rejects.toThrow();
    expect(await storage.read('../../etc/passwd')).toBeNull();
    expect(await storage.read('a/b.png')).toBeNull();
    await expect(storage.remove('https://elsewhere.example/x.png')).resolves.toBeUndefined();
  });
});
