'use strict';

const middlewares = require('./middlewares');

/**
 * Strapi v4 register hook
 */
module.exports = ({ strapi }) => {
  // Register the random sort middleware globally
  strapi.server.use(middlewares.random);
};
