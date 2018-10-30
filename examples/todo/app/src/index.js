import React from 'react';
import { render } from 'react-dom';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { WatchedMutationLink } from 'apollo-link-watched-mutation';
import { BatchHttpLink } from 'apollo-link-batch-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloProvider } from 'react-apollo';
import { visibilityFilter } from './enums';

import App from './components/App';


const shouldTodoBeIncluded = (updatedTodo, filter) => {
  if (filter === visibilityFilter.SHOW_COMPLETED && !updatedTodo.completed) {
    return false;
  }
  if (filter === visibilityFilter.SHOW_ACTIVE && updatedTodo.completed) {
    return false;
  }
  return true;
};

const applyFiltering = (updatedTodo, todoList, query) => {
  const mutatedTodoId = updatedTodo.id;
  const isTodoIncluded = todoList.some(todos => todos.id === mutatedTodoId);
  const shouldIncludeTodo = !query.variables || shouldTodoBeIncluded(updatedTodo, query.variables.filter);

  let updatedItems = null;
  if (isTodoIncluded && !shouldIncludeTodo) {
    // if the mutatedTodo is found in the cached list and it should not be there after the mutation, remove it
    updatedItems = todoList.filter(todo => todo.id !== mutatedTodoId);
  } else if (!isTodoIncluded && shouldIncludeTodo) {
    // if the mutatedTodo is not found in the cached list and it should be there after the mutation, add it
    updatedItems = [updatedTodo, ...todoList];
  }
  // else an in-place update is already sufficient so no update is necessary

  return updatedItems;
};

const cache = new InMemoryCache();
const link = new ApolloLink.from([
  new WatchedMutationLink(cache, {
    AddTodo: {
      GetTodos: ({ mutation, query }) => {
        const updatedTodo = mutation.result.data.addTodo;
        const cachedTodos = query.result.todos;
        const updatedTodos = applyFiltering(updatedTodo, cachedTodos, query);

        if (updatedTodos) {
          // immutably return query.result with updated items
          return { ...query.result, todos: updatedTodos };
        }
      }
    },
    ToggleTodo: {
      GetTodos: ({ mutation, query }) => {
        const updatedTodo = mutation.result.data.toggleTodo;
        const cachedTodos = query.result.todos;
        const updatedTodos = applyFiltering(updatedTodo, cachedTodos, query);

        if (updatedTodos) {
          // immutably return query.result with updated items
          return { ...query.result, todos: updatedTodos };
        }
      }
    }
  }, 1),
  new BatchHttpLink({ uri: `http://localhost:4000/graphql` })
]);

const client = new ApolloClient({
  cache,
  link,
  connectToDevTools: true
});

render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root'),
);
