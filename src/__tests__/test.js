import {
  ApolloLink,
  execute,
  Observable
} from 'apollo-link';
import { WatchedMutationLink } from '../index';
import gql from 'graphql-tag';


const sampleQuery = gql`
    query TodoList($status: String) {
        todoList(status: $status) {
            id
            name
            status
        }
    }
`;

const sampleSuccessfulQueryResponse = {
  data: {
    todoList: [
      { id: '1', name: 'Get groceries', status: 'IN_PROGRESS' },
      { id: '2', name: 'Take car in for service', status: 'DONE' }
    ]
  }
};

const sampleErrorQueryResponse = {
  data: null,
  errors: [{ message: 'Everything went wrong' }]
};

const sampleMutation = gql`
    mutation SaveTodo(
      $id: String
      $status: String
    ) {
        saveTodo(
          id: $id
          status: $status
        ) {
            id
            name
            status
        }
    }
`;

const sampleSuccessfulMutationResponse = {
  data: {
    saveTodo: {
      id: '1',
      name: 'Get groceries',
      status: 'DONE'
    }
  }
};

const sampleErrorMutationResponse = {
  data: null,
  errors: [{ message: 'Oops forgot to implement' }]
};

const query = {
  query: sampleQuery,
  variables: { status: 'DONE' }
};
const mutation = {
  query: sampleMutation,
  variables: { id: 'todo_1', status: 'IN_PROGRESS' }
};
const cache = {
  readQuery: k => {},
  writeQuery: (k, v) => {}
};

describe('WatchedMutationLink', () => {
  it('should ignore unsuccessful queries', done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: { TodoList: () => { called = true; } }
    });
    const mockLink = new ApolloLink(() => Observable.of(sampleErrorQueryResponse));
    const link = ApolloLink.from([
      watchedMutationLink,
      mockLink
    ]);
    expect(watchedMutationLink.queriesToUpdate.hasOwnProperty('TodoList')).toBe(false);

    execute(link, query).subscribe(() => {
      expect(watchedMutationLink.queriesToUpdate.hasOwnProperty('TodoList')).toBe(false);
      expect(called).toBe(false);
      done();
    });
  });

  it('should ignore successful but unrelated queries', done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: { TodoList: () => { called = true; } }
    });
    const mockLink = new ApolloLink(() => Observable.of({
      data: { users: [{ id: 'foo', name: 'John' }, { id: 'bar', name: 'Adam'} ] }
    }));
    const link = ApolloLink.from([
      watchedMutationLink,
      mockLink
    ]);
    expect(watchedMutationLink.queriesToUpdate.hasOwnProperty('TodoList')).toBe(false);
    const usersQuery = gql`
        query Users {
          id
          name
        }
    `;

    execute(link, { query: usersQuery }).subscribe(() => {
      expect(watchedMutationLink.queriesToUpdate.hasOwnProperty('TodoList')).toBe(false);
      expect(called).toBe(false);
      done();
    });
  });

  it('should add successful and related queries to queriesToUpdate', done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: { TodoList: () => { called = true; } }
    });
    const mockLink = new ApolloLink(() => Observable.of(sampleSuccessfulQueryResponse));
    const link = ApolloLink.from([
      watchedMutationLink,
      mockLink
    ]);
    expect(watchedMutationLink.queriesToUpdate.hasOwnProperty('TodoList')).toBe(false);

    execute(link, query).subscribe(() => {
      expect(watchedMutationLink.queriesToUpdate.hasOwnProperty('TodoList')).toBe(true);
      const todoListQueriesToUpdate = watchedMutationLink.queriesToUpdate['TodoList'];
      expect(todoListQueriesToUpdate.length).toBe(1);
      expect(todoListQueriesToUpdate[0].variables).toMatchObject({ status: 'DONE' });
      expect(called).toBe(false);
      done();
    });
  });

  it('should ignore unsuccessful mutations', done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: { TodoList: () => { called = true; } }
    });
    const mockLink = new ApolloLink(() => Observable.of(sampleErrorMutationResponse));
    const link = ApolloLink.from([
      watchedMutationLink,
      mockLink
    ]);
    execute(link, mutation).subscribe(() => {
      expect(called).toBe(false);
      done();
    });
  });

  it('should ignore successful but unwatched mutations', done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: { TodoList: () => { called = true; } }
    });
    const mockLink = new ApolloLink(() => Observable.of({
      data: { saveUser: { id: 'foo', name: 'Joh' }}
    }));
    const link = ApolloLink.from([
      watchedMutationLink,
      mockLink
    ]);
    const usersMutation = gql`
        mutation SaveUser(
          $id: ID!
          $name: String!
        ) {
          id
          name  
        }
    `;

    execute(link, { query: usersMutation, variables: usersMutation }).subscribe(() => {
      expect(called).toBe(false);
      done();
    });
  });

  it('should NOT invoke the provided callback if no cached query exists for a watched mutation', done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: { TodoList: () => { called = true; } }
    });
    const mockLink = new ApolloLink(() => Observable.of(sampleSuccessfulMutationResponse));
    const link = ApolloLink.from([
      watchedMutationLink,
      mockLink
    ]);

    execute(link, mutation).subscribe(() => {
      expect(called).toBe(false);
      done();
    });
  });

  it('should invoke the provided callback if a cached query exists for a watched mutation', done => {
    let called = false;
    const watchedMutationLink = new WatchedMutationLink(cache, {
      SaveTodo: { TodoList: () => { called = true; } }
    });
    const mockQueryLink = new ApolloLink(() => Observable.of(sampleSuccessfulQueryResponse));
    const mockMutationLink = new ApolloLink(() => Observable.of(sampleSuccessfulMutationResponse));
    const queryLink = ApolloLink.from([
      watchedMutationLink,
      mockQueryLink
    ]);

    expect(watchedMutationLink.queriesToUpdate.hasOwnProperty('TodoList')).toBe(false);

    execute(queryLink, query).subscribe(() => {
      expect(watchedMutationLink.queriesToUpdate.hasOwnProperty('TodoList')).toBe(true);
      const todoListQueriesToUpdate = watchedMutationLink.queriesToUpdate['TodoList'];
      expect(todoListQueriesToUpdate.length).toBe(1);
      expect(todoListQueriesToUpdate[0].variables).toMatchObject({ status: 'DONE' });
      expect(called).toBe(false);
    });

    // mock what should be stored in apollo's cache after a successful query
    watchedMutationLink.cache.readQuery = cacheKey => {
      if (JSON.stringify(cacheKey) === JSON.stringify(query)) {
        return sampleErrorQueryResponse;
      }
    }
    const mutationLink = ApolloLink.from([
      watchedMutationLink,
      mockMutationLink
    ]);

    execute(mutationLink, mutation).subscribe(() => {
      expect(called).toBe(true);
      done();
    });
  });
});
