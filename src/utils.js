import {
  getMainDefinition,
  graphQLResultHasError
} from 'apollo-utilities';

export const isQuery = operation => operation === 'query';
export const isMutation = operation => operation === 'mutation';
export const isSuccessful = result => !graphQLResultHasError(result);
export const isSuccessfulQuery = (operation, result) => isQuery(operation) && isSuccessful(result);
export const isSuccessfulMutation = (operation, result) => isMutation(operation) && isSuccessful(result);
export const isFailedMutation = (operation, result) => isMutation(operation) && !isSuccessful(result);

export const isOptimistic = context => !!context.optimisticResponse;

export const getQueryName = query => {
  const queryDefinition = getMainDefinition(query);
  return (queryDefinition && queryDefinition.name && queryDefinition.name.value) || '';
};
