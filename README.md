# Strapi plugin Random Sort

A Strapi plugin to randomly sort the data of a request.

## Features

- Randomly sort incoming data without the need of complex middleware
- Simple configuration and works with any endpoint

## Installation

To install this plugin, you need to add an NPM dependency to your Strapi application.

```sh
# Using Yarn
yarn add strapi-random-sort

# Or using NPM
npm install strapi-random-sort
```

## Configuration

Add configuration to your `config/plugins.js` file.

```js

module.exports = ({ env }) => ({
   // ...
  "random-sort": {
    enabled: true,
  },
  // ...

});
```

## Usage

You can access the new random query parameter on any of your API calls.

Add a `?random=true` as a query parameter

## Example

`http://localhost:1337/api/blogs?random=true`

## GraphQL

The `random=true` flag also works on the GraphQL endpoint - add it as a URL
query param on the request itself (GraphQL clients can usually set this
alongside the endpoint URL):

`http://localhost:1337/graphql?random=true`

This shuffles the order of whatever page GraphQL returns for each array
field in the response (both the default flattened Strapi v5 format and the
Relay-style `_connection` variant are supported). Note that GraphQL resolves
its own pagination from the query/variables, so unlike the REST endpoint
this can't force a "fetch everything, then repaginate" pass - request a
larger `pageSize` in your GraphQL query if you want randomness across the
full dataset rather than just the returned page.
