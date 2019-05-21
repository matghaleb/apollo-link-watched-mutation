import { ApolloLink, execute, Observable } from "apollo-link";
import { WatchedMutationLink } from "../index";
import gql from "graphql-tag";
import {
  sampleSuccessfulQueryResponse,
  sampleErrorQueryResponse,
  sampleSuccessfulMutationResponse,
  sampleErrorMutationResponse,
  createCache,
  mutation,
  query
} from "./private";
const cache = createCache();

describe("WatchedMutationLink", () => {
  it("should ignore unsuccessful queries", done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: {
        TodoList: () => {
          called = true;
        }
      }
    });
    const mockLink = new ApolloLink(() =>
      Observable.of(sampleErrorQueryResponse)
    );
    const link = ApolloLink.from([watchedMutationLink, mockLink]);
    expect(watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")).toBe(
      false
    );

    execute(link, query).subscribe(() => {
      expect(
        watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")
      ).toBe(false);
      expect(called).toBe(false);
      done();
    });
  });

  it("should ignore successful but unrelated queries", done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: {
        TodoList: () => {
          called = true;
        }
      }
    });
    const mockLink = new ApolloLink(() =>
      Observable.of({
        data: {
          users: [{ id: "foo", name: "John" }, { id: "bar", name: "Adam" }]
        }
      })
    );
    const link = ApolloLink.from([watchedMutationLink, mockLink]);
    expect(watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")).toBe(
      false
    );
    const usersQuery = gql`
      query Users {
        id
        name
      }
    `;

    execute(link, { query: usersQuery }).subscribe(() => {
      expect(
        watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")
      ).toBe(false);
      expect(called).toBe(false);
      done();
    });
  });

  it("should add successful and related queries to queryManager", done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: {
        TodoList: () => {
          called = true;
        }
      }
    });
    const mockLink = new ApolloLink(() =>
      Observable.of(sampleSuccessfulQueryResponse)
    );
    const link = ApolloLink.from([watchedMutationLink, mockLink]);
    expect(watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")).toBe(
      false
    );

    execute(link, query).subscribe(() => {
      expect(
        watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")
      ).toBe(true);
      const todoListQueriesToUpdate = watchedMutationLink.queryManager.getQueryKeysToUpdate(
        "TodoList"
      );
      expect(todoListQueriesToUpdate.length).toBe(1);
      expect(todoListQueriesToUpdate[0].variables).toMatchObject({
        status: "DONE"
      });
      expect(called).toBe(false);
      done();
    });
  });

  it("should ignore unsuccessful mutations", done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: {
        TodoList: () => {
          called = true;
        }
      }
    });
    const mockQueryLink = new ApolloLink(() =>
      Observable.of(sampleSuccessfulQueryResponse)
    );
    const mockMutationLink = new ApolloLink(() =>
      Observable.of(sampleErrorMutationResponse)
    );
    const queryLink = ApolloLink.from([watchedMutationLink, mockQueryLink]);

    expect(watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")).toBe(
      false
    );

    execute(queryLink, query).subscribe(() => {
      expect(
        watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")
      ).toBe(true);
      const todoListQueriesToUpdate = watchedMutationLink.queryManager.getQueryKeysToUpdate(
        "TodoList"
      );
      expect(todoListQueriesToUpdate.length).toBe(1);
      expect(todoListQueriesToUpdate[0].variables).toMatchObject({
        status: "DONE"
      });
      expect(called).toBe(false);
    });

    // mock what should be stored in apollo's cache after a successful query
    watchedMutationLink.cache.read = cacheKey => {
      if (JSON.stringify(cacheKey) === JSON.stringify(query)) {
        return sampleErrorQueryResponse;
      }
    };
    const link = ApolloLink.from([watchedMutationLink, mockMutationLink]);
    execute(link, mutation).subscribe(() => {
      expect(called).toBe(false);
      done();
    });
  });

  it("should ignore successful but unwatched mutations", done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: {
        TodoList: () => {
          called = true;
        }
      }
    });
    const mockQueryLink = new ApolloLink(() =>
      Observable.of(sampleSuccessfulQueryResponse)
    );
    const mockMutationLink = new ApolloLink(() =>
      Observable.of({
        data: { saveUser: { id: "foo", name: "Joh" } }
      })
    );
    const queryLink = ApolloLink.from([watchedMutationLink, mockQueryLink]);

    expect(watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")).toBe(
      false
    );

    execute(queryLink, query).subscribe(() => {
      expect(
        watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")
      ).toBe(true);
      const todoListQueriesToUpdate = watchedMutationLink.queryManager.getQueryKeysToUpdate(
        "TodoList"
      );
      expect(todoListQueriesToUpdate.length).toBe(1);
      expect(todoListQueriesToUpdate[0].variables).toMatchObject({
        status: "DONE"
      });
      expect(called).toBe(false);
    });

    // mock what should be stored in apollo's cache after a successful query
    watchedMutationLink.cache.read = cacheKey => {
      if (JSON.stringify(cacheKey) === JSON.stringify(query)) {
        return sampleErrorQueryResponse;
      }
    };

    const link = ApolloLink.from([watchedMutationLink, mockMutationLink]);
    const usersMutation = gql`
      mutation SaveUser($id: ID!, $name: String!) {
        id
        name
      }
    `;

    execute(link, { query: usersMutation, variables: usersMutation }).subscribe(
      () => {
        expect(called).toBe(false);
        done();
      }
    );
  });

  it("should NOT invoke the provided callback if no cached query exists for a watched mutation", done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: {
        TodoList: () => {
          called = true;
        }
      }
    });
    const mockLink = new ApolloLink(() =>
      Observable.of(sampleSuccessfulMutationResponse)
    );
    const link = ApolloLink.from([watchedMutationLink, mockLink]);

    execute(link, mutation).subscribe(() => {
      expect(called).toBe(false);
      done();
    });
  });

  it("should invoke the provided callback if a cached query exists for a watched mutation", done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: {
        TodoList: ({ mutation, query }) => {
          called = true;
        }
      }
    });
    const mockQueryLink = new ApolloLink(() =>
      Observable.of(sampleSuccessfulQueryResponse)
    );
    const mockMutationLink = new ApolloLink(() =>
      Observable.of(sampleSuccessfulMutationResponse)
    );
    const queryLink = ApolloLink.from([watchedMutationLink, mockQueryLink]);

    expect(watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")).toBe(
      false
    );

    execute(queryLink, query).subscribe(() => {
      expect(
        watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")
      ).toBe(true);
      const todoListQueriesToUpdate = watchedMutationLink.queryManager.getQueryKeysToUpdate(
        "TodoList"
      );
      expect(todoListQueriesToUpdate.length).toBe(1);
      expect(todoListQueriesToUpdate[0].variables).toMatchObject({
        status: "DONE"
      });
      expect(called).toBe(false);
    });

    // mock what should be stored in apollo's cache after a successful query
    watchedMutationLink.cache.read = cacheKey => {
      if (JSON.stringify(cacheKey) === JSON.stringify(query)) {
        return sampleErrorQueryResponse;
      }
    };
    const mutationLink = ApolloLink.from([
      watchedMutationLink,
      mockMutationLink
    ]);

    execute(mutationLink, mutation).subscribe(() => {
      expect(called).toBe(true);
      done();
    });
  });

  describe("optimistic", () => {
    it("should invoke the provided callback with data if a cached query exist for a watched mutation and an optimistic response is sent", done => {
      let called = false;
      const watchedMutationLink = new WatchedMutationLink(cache, {
        SaveTodo: {
          TodoList: ({ mutation, query }) => {
            if (mutation.result.hasOwnProperty("data")) {
              called = true;
            }
          }
        }
      });
      const mockQueryLink = new ApolloLink(() =>
        Observable.of(sampleSuccessfulQueryResponse)
      );
      const queryLink = ApolloLink.from([watchedMutationLink, mockQueryLink]);

      expect(
        watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")
      ).toBe(false);

      execute(queryLink, query).subscribe(() => {
        expect(
          watchedMutationLink.queryManager.hasQueryToUpdate("TodoList")
        ).toBe(true);
        const todoListQueriesToUpdate = watchedMutationLink.queryManager.getQueryKeysToUpdate(
          "TodoList"
        );
        expect(todoListQueriesToUpdate.length).toBe(1);
        expect(todoListQueriesToUpdate[0].variables).toMatchObject({
          status: "DONE"
        });
        expect(called).toBe(false);
      });

      // mock what should be stored in apollo's cache after a successful query
      watchedMutationLink.cache.read = cacheKey => {
        if (JSON.stringify(cacheKey) === JSON.stringify(query)) {
          return sampleSuccessfulQueryResponse;
        }
      };
      const mutationLink = ApolloLink.from([
        watchedMutationLink,
        new ApolloLink(() => {})
      ]);

      execute(mutationLink, {
        ...mutation,
        context: {
          optimisticResponse: { ...sampleSuccessfulMutationResponse.data }
        }
      });
      //expect(called).toBe(true);
      done();
    });
  });
});
