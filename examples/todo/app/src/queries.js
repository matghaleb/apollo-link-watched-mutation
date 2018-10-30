import gql from 'graphql-tag';

export const GET_TODOS = gql`
  query GetTodos($filter: String) {
    todos(filter: $filter) {
      id
      text
      completed
    }
  }
`;

export const TOGGLE_TODO = gql`
  mutation ToggleTodo($id: Int!) {
    toggleTodo(id: $id) {
      id
      text
      completed
    }
  }
`;

export const ADD_TODO = gql`
  mutation AddTodo($text: String!) {
    addTodo(text: $text) {
      id
      text
      completed
    }
  }
`;