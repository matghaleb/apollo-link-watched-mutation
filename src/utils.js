import { getMainDefinition } from 'apollo-utilities';

const isQuery = operation => operation === 'query';
const isMutation = operation => operation === 'mutation';
const isSuccessful = result => result.data && !result.data.error;
export const isSuccessfulQuery = (operation, result) => isQuery(operation) && isSuccessful(result);
export const isSuccessfulMutation = (operation, result) => isMutation(operation) && isSuccessful(result);

export const getQueryName = query => {
  const queryDefinition = getMainDefinition(query);
  return (queryDefinition && queryDefinition.name && queryDefinition.name.value) || '';
}
