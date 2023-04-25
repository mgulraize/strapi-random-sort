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
