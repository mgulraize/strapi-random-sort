'use strict';

/**
 * strapi-random-sort plugin
 * Compatible with Strapi v4 and v5
 */

// Try v5 built output first, fall back to v4 structure
try {
    module.exports = require('./dist/server/index.js');
} catch (e) {
    // Fall back to v4 CommonJS structure
    module.exports = require('./server');
}
