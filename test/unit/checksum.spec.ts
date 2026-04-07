import { computeChecksum } from '../../src/common/utils/checksum';

describe('computeChecksum', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    expect(computeChecksum('<p>hello</p>')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input', () => {
    const html = '<div class="foo" style="color:red">hello</div>';
    expect(computeChecksum(html)).toBe(computeChecksum(html));
  });

  it('differs for different text content', () => {
    expect(computeChecksum('<p>a</p>')).not.toBe(computeChecksum('<p>b</p>'));
  });

  it('ignores class attribute differences', () => {
    expect(computeChecksum('<p class="v1">text</p>')).toBe(
      computeChecksum('<p class="v2-dynamic-hash">text</p>'),
    );
  });

  it('ignores inline style differences', () => {
    expect(computeChecksum('<p style="color:red">text</p>')).toBe(
      computeChecksum('<p style="color:blue;font-size:14px">text</p>'),
    );
  });

  it('ignores <style> tag content', () => {
    const a = '<html><head><style>.old { color: red }</style></head><body>text</body></html>';
    const b = '<html><head><style>.new { color: blue }</style></head><body>text</body></html>';
    expect(computeChecksum(a)).toBe(computeChecksum(b));
  });

  it('detects structural changes', () => {
    expect(computeChecksum('<div><p>text</p></div>')).not.toBe(
      computeChecksum('<div><span>text</span></div>'),
    );
  });
});
