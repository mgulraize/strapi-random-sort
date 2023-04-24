# Strapi plugin random-sort

Plugin to randomly sort the data of a request.

## Installation

`npm install strapi-plugin-random-sort`

or

`yarn add strapi-plugin-random-sort`

## Config

``` javascript
  'random-sort': {
    enabled: true,
  },
```

## Usage

Add a `?random=true` as a query parameter

## Example

`http://localhost:1337/api/blogs?populate=*&random=true`
