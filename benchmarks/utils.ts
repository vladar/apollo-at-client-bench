import { Suite } from "benchmark";
import { ApolloLink, Observable } from "@apollo/client";

export class NiceBenchmark {
  private name: string;
  private suite: Suite;

  constructor(name: string) {
    this.name = name;
    this.suite = new Suite(name);
    this.suite.on("cycle", function (event: any) {
      console.log(String(event.target));
    });
  }

  add(name: string, fn: () => Promise<any> | void) {
    this.suite.add(name, {
      defer: true,
      fn: async (deferred: any) => {
        await fn();
        deferred.resolve();
      },
    });
  }

  run(options?: any): Promise<any> {
    return new Promise((resolve) => {
      this.suite.on("complete", resolve);
      console.log(this.name);
      this.suite.run(options);
    });
  }
}

export function createPreExecutedLink(result: any) {
  return new ApolloLink((operation) => {
    return new Observable((observer) => {
      try {
        if (!observer.closed) {
          observer.next(result);
          observer.complete();
        }
      } catch (error) {
        if (!observer.closed) {
          observer.error(error);
        }
      }
    });
  });
}
