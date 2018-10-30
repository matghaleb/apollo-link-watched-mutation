import React from 'react';
import { Mutation } from 'react-apollo';
import { TOGGLE_TODO } from '../queries';

export const Todo = ({ id, completed, text }) => {
  return (
    <Mutation
      mutation={TOGGLE_TODO}
      variables={{ id }}
      optimisticResponse={{
        toggleTodo: {
          id,
          completed: !completed,
          text,
          __typename: 'Todo'
        }
      }}
    >
      {toggleTodo => (
        <li
          onClick={toggleTodo}
          style={{
            textDecoration: completed ? 'line-through' : 'none',
          }}
        >
          {text}
        </li>
      )}
    </Mutation>
  );
};
