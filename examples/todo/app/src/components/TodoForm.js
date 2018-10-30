import React from 'react';
import { Mutation } from 'react-apollo';
import { ADD_TODO } from '../queries';

export const TodoForm = () => {
  return (
    <Mutation mutation={ADD_TODO}>
      {addTodo => {
        let input;
        return (
          <div>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!input.value.trim()) {
                  return;
                }
                addTodo({ variables: { text: input.value } });
                input.value = '';
              }}
            >
              <input ref={node => { input = node; }}/>
              <button type="submit">Add Todo</button>
            </form>
          </div>
        );
      }}
    </Mutation>
  );
}
