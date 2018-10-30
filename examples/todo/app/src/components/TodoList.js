import React from 'react';
import { Query } from 'react-apollo';
import PropTypes from 'prop-types';
import { Todo } from './Todo';
import { GET_TODOS } from '../queries';

export const TodoList = props => {
  return (
    <div style={{ margin: '10px 20px' }}>
      <h3>{props.filter}</h3>
      <Query query={GET_TODOS} variables={{ filter: props.filter }}>
        {(queryProps) => {
          if (queryProps.loading) {
            return <span>Loading...</span>;
          }
          if (queryProps.error) {
            return <span>{queryProps.error}</span>;
          }

          return (
            <ul>
              {queryProps.data.todos.map(todo => (
                <Todo key={`${props.filter}-${todo.id}`} {...todo} />
              ))}
            </ul>
          );
        }}
      </Query>
    </div>
  );
};

TodoList.propTypes = {
  filter: PropTypes.string
};
