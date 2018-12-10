import React from 'react';
import { Mutation } from 'react-apollo';
import { TOGGLE_TODO, TOGGLE_TODO_WITH_ERROR } from '../queries';

export const Todo = ({ id, completed, text }) => {
  return (
    <li style={{ textDecoration: completed ? 'line-through' : 'none' }}>
      {text}
      <Mutation mutation={TOGGLE_TODO} variables={{ id }}>
        {toggleTodo => (
          <button onClick={toggleTodo} style={{ margin: '0 5px' }}>
            toggle
          </button>
        )}
      </Mutation>
      <Mutation mutation={TOGGLE_TODO_WITH_ERROR} variables={{ id }}>
        {toggleTodoWithError => (
          <button onClick={toggleTodoWithError} style={{ margin: '0 5px' }}>
            toggle and throw an error
          </button>
        )}
      </Mutation>
    </li>
  );
};
