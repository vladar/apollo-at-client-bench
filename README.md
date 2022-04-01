# Apollo `@client` directive benchmarks

## Related links:
- [Apollo Client issue: Fields not marked with `@client` are being resolved locally ](https://github.com/apollographql/apollo-client/issues/9571)
- [Proposed fix: Fields without a `@client` directive should not be resolved locally](https://github.com/apollographql/apollo-client/pull/9573)

## Example1. Single field with `@client` resolver

```shell
yarn bench-single
```

Benchmarking two GraphQL queries. Query1:

```graphql
# Query1: without @client directives
{
  items {
    id
    foo
  }
  serverOrClient
}
```

and Query2:

```graphql
# Query2: with @client directive
{
  items {
    id
    foo
  }
  serverOrClient @client
}
```

Using the same GraphQL server result for both:
```js
{
  items: [
    { id: "0", foo: "foo-0" },
    { id: "1", foo: "foo-1" },
    // ...
    { id: "99", foo: "foo-99" },
  ]
  serverOrClient: `server`
}
```

### Expected Benchmark Result

Query2 performance should not depend on the number of `items` in the result because the local resolver
is outside of `items` selectionSet and only executes once (i.e. expecting local resolver overhead to be `O(1)`)

### Actual Result

Query performance changes proportionally to the number of `items` (i.e. `O(N)`).
So presence of a single client resolver degrades performance of the whole query.

```
Without client resolver
100 items x 1,078 ops/sec ±4.69% (58 runs sampled)
1000 items x 128 ops/sec ±5.05% (57 runs sampled)
10000 items x 11.90 ops/sec ±8.81% (55 runs sampled)

With client resolver
100 items x 494 ops/sec ±7.05% (59 runs sampled)
1000 items x 56.21 ops/sec ±6.67% (56 runs sampled)
10000 items x 5.10 ops/sec ±10.75% (28 runs sampled)
```

### With a fix

After applying a [potential fix](https://github.com/apollographql/apollo-client/pull/9573) to skip selectionSets without local resolvers, the result is
expected:

```
With client resolver
100 items x 1,002 ops/sec ±7.57% (60 runs sampled)
1000 items x 123 ops/sec ±7.82% (55 runs sampled)
10000 items x 12.80 ops/sec ±8.15% (58 runs sampled)
```

# Example2. Local resolver in every list item

```shell
yarn bench-list
```

Benchmarking two GraphQL queries. Query1:

```graphql
{
  items {
    id
    foo {
      bar { baz }
    }
    serverOrClient
  }
}
```

and Query2:

```graphql
{
  items {
    id
    foo {
      bar { baz }
    }
    serverOrClient @client
  }
}
```

Using the same GraphQL server result for both:

```js
{
  items: [
    { id: "0", foo: [/* see below */], serverOrClient: `server` },
    { id: "1", foo: [/* see below */], serverOrClient: `server` },
    // ...
    { id: "99", foo: [/* see below */], serverOrClient: `server` },
  ]
}

// Where foo is a static array of 10 items:
const foo = [
  { bar : { baz: 0 } },
  { bar : { baz: 1 } },
  // ...
  { bar : { baz: 9 } },
]
```

### Result
```
Without client resolvers
100 items x 49.40 ops/sec ±30.61% (53 runs sampled)
1000 items x 6.74 ops/sec ±11.26% (36 runs sampled)
10000 items x 0.13 ops/sec ±12.33% (5 runs sampled)

With client resolvers
100 items x 20.61 ops/sec ±42.55% (58 runs sampled)
1000 items x 2.09 ops/sec ±32.01% (17 runs sampled)
10000 items x 0.08 ops/sec ±13.01% (5 runs sampled)
```

The problem here is that Apollo has to loop through every single item of `foo` as well
(even though it has no local resolvers).

### With a fix

```
With client resolvers
100 items x 48.08 ops/sec ±12.68% (60 runs sampled)
1000 items x 4.56 ops/sec ±42.92% (26 runs sampled)
10000 items x 0.12 ops/sec ±17.35% (5 runs sampled)
```
