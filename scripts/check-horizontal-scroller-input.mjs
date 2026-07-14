import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getHorizontalWheelDelta } from '../src/lib/horizontalScroller.js';

const source = fs.readFileSync(new URL('../src/lib/horizontalScroller.js', import.meta.url), 'utf8');

assert.equal(getHorizontalWheelDelta({ ctrlKey: true, deltaX: 0, deltaY: 10 }, 500, 200), null);
assert.equal(getHorizontalWheelDelta({ ctrlKey: false, deltaX: 0, deltaY: 10 }, 200, 200), null);
assert.equal(getHorizontalWheelDelta({ ctrlKey: false, deltaX: 2, deltaY: 10 }, 500, 200), 10);
assert.equal(getHorizontalWheelDelta({ ctrlKey: false, deltaX: -12, deltaY: 3 }, 500, 200), -12);

assert.match(source, /touchAction: 'auto'/);
assert.match(source, /overscrollBehaviorY: 'auto'/);
assert.match(source, /const delta = getHorizontalWheelDelta\(e, el\.scrollWidth, el\.clientWidth\)/);
