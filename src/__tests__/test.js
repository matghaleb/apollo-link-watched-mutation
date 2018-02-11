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
  const watchedMutationLink = new WatchedMutationLink(cache, {
    SaveTodo: {
      TodoList: () => {}
    }
  });
  const mockLink = new ApolloLink(operation => Observable.of({ fooData: 'barData' }));
  const link = ApolloLink.from([
    watchedMutationLink,
    mockLink
  ]);

  it('should ignore unsuccessful queries', done => {
    execute(link, query).subscribe(() => {
      expect(false).toBe(true);
      done();
    });
  });

  it('should ignore successful but unrelated queries', done => {
    execute(link, query).subscribe(() => {
      expect(false).toBe(true);
      done();
    });
  });

  it('should add successful and related queries to queriesToUpdate', done => {
    execute(link, query).subscribe(() => {
      expect(false).toBe(true);
      done();
    });
  });

  it('should ignore unsuccessful mutations', done => {
    execute(link, mutation).subscribe(() => {
      expect(false).toBe(true);
      done();
    });
  });

  it('should ignore successful but unwatched mutations', done => {
    execute(link, mutation).subscribe(() => {
      expect(false).toBe(true);
      done();
    });
  });

  it('should invoke the provided callback if a cached query exists for a watched mutation', done => {
    execute(link, query).subscribe(() => {
      expect(false).toBe(true);
      done();
    });
  });
});
