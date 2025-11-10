/*
 * Temporary polyfill for libraries that still rely on the removed `SlowBuffer`
 * global. Node.js 21+ no longer exposes this helper, so we recreate a minimal
 * compatible shim that wraps the modern `Buffer` implementation.
 */

const bufferModule = require('buffer');
const { Buffer } = bufferModule;

function ensureEquals(target) {
    if (typeof target.prototype.equal !== 'function' && typeof Buffer.prototype.equals === 'function') {
        target.prototype.equal = function equal(otherBuffer) {
            return Buffer.prototype.equals.call(this, otherBuffer);
        };
    }
}

if (typeof global.SlowBuffer === 'undefined') {
    function SlowBuffer(length) {
        if (!(this instanceof SlowBuffer)) {
            return Buffer.alloc(length);
        }
        return Buffer.alloc(length);
    }

    SlowBuffer.prototype = Buffer.prototype;
    SlowBuffer.prototype.constructor = SlowBuffer;
    ensureEquals(SlowBuffer);

    SlowBuffer.from = Buffer.from.bind(Buffer);
    SlowBuffer.alloc = Buffer.alloc.bind(Buffer);
    SlowBuffer.allocUnsafe = Buffer.allocUnsafe.bind(Buffer);
    SlowBuffer.isBuffer = Buffer.isBuffer.bind(Buffer);

    global.SlowBuffer = SlowBuffer;
    Buffer.SlowBuffer = SlowBuffer;
    bufferModule.SlowBuffer = SlowBuffer;
} else {
    ensureEquals(global.SlowBuffer);
    Buffer.SlowBuffer = global.SlowBuffer;
    bufferModule.SlowBuffer = global.SlowBuffer;
}
