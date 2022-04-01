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
      foo
    }
    serverOrClient
  }
`;

const withClient = gql`
  {
    items {
      id
      foo
    }
    serverOrClient @client
  }
`;

async function prepareBenchmark(
  itemCount: number,
  withClientDirective: boolean
) {
  function generateResult() {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push({ id: String(i), foo: `foo-${i}` });
    }
    return {
      data: {
        items,
        serverOrClient: `server`,
      },
    };
  }

  const client = new ApolloClient({
    link: createPreExecutedLink(generateResult()),
    cache: new InMemoryCache(),
    resolvers: {
      Query: {
        serverOrClient: () => `client`,
      },
    },
  });

  return async function runQuery() {
    return client.query({
      query: withClientDirective ? withClient : withoutClient,
      fetchPolicy: "network-only",
    });
  };
}

async function main() {
  const withClientSuite = new NiceBenchmark("Without client resolver");

  withClientSuite.add("100 items", await prepareBenchmark(100, false));
  withClientSuite.add("1000 items", await prepareBenchmark(1000, false));
  withClientSuite.add("10000 items", await prepareBenchmark(10000, false));
  // withClientSuite.add("100000 items", await prepareBenchmark(100000, false));

  const withoutClientSuite = new NiceBenchmark("With client resolver");

  withoutClientSuite.add("100 items", await prepareBenchmark(100, true));
  withoutClientSuite.add("1000 items", await prepareBenchmark(1000, true));
  withoutClientSuite.add("10000 items", await prepareBenchmark(10000, true));
  // withoutClientSuite.add("100000 items", await prepareBenchmark(100000, true));

  await withClientSuite.run({ async: true });
  await withoutClientSuite.run({ async: true });
}

main().catch(console.error);
