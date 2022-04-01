import { NiceBenchmark, createPreExecutedLink } from "./utils";

import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  gql,
} from "@apollo/client";

const withoutClient = gql`
  {
    items {
      id
      foo {
        bar { baz }
      }
      serverOrClient
    }
  }
`;

const withClient = gql`
  {
    items {
      id
      foo {
        bar { baz }
      }
      serverOrClient @client
    }
  }
`;

let lastResult: any

async function prepareBenchmark(
  itemCount: number,
  withClientDirective: boolean
) {
  function generateResult() {
    const items = [];
    const foo = [];
    for (let i = 0; i < 10; i++) {
      foo.push({ bar: { baz: i } });
    }
    for (let i = 0; i < itemCount; i++) {
      items.push({
        __typename: `Item`,
        id: String(i),
        foo,
        serverOrClient: `server`,
      });
    }
    return {
      data: {
        items,
      },
    };
  }

  const client = new ApolloClient({
    link: createPreExecutedLink(generateResult()),
    cache: new InMemoryCache(),
    resolvers: {
      Item: {
        serverOrClient: () => `client`,
      },
    },
  });

  return async function runQuery() {
    lastResult = await client.query({
      query: withClientDirective ? withClient : withoutClient,
      fetchPolicy: "network-only",
    });
    return lastResult
  };
}

async function main() {
  const withClientSuite = new NiceBenchmark("Without client resolvers");

  withClientSuite.add("100 items", await prepareBenchmark(100, false));
  withClientSuite.add("1000 items", await prepareBenchmark(1000, false));
  withClientSuite.add("10000 items", await prepareBenchmark(10000, false));
  // withClientSuite.add("100000 items", await prepareBenchmark(100000, false));

  const withoutClientSuite = new NiceBenchmark("With client resolvers");

  withoutClientSuite.add("100 items", await prepareBenchmark(100, true));
  // withoutClientSuite.add("1000 items", await prepareBenchmark(1000, true));
  // withoutClientSuite.add("10000 items", await prepareBenchmark(10000, true));
  // withoutClientSuite.add("100000 items", await prepareBenchmark(100000, true));

  // await withClientSuite.run({ async: true });
  await withoutClientSuite.run({ async: true });

  console.log(lastResult.data.items[0].foo)
}

main().catch(console.error);
