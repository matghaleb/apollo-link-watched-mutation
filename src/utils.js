import { getMainDefinition } from 'apollo-utilities';

export const isQuery = operation => operation === 'query';
export const isMutation = operation => operation === 'mutation';
export const isSuccessful = result => result.data && !result.data.error;
export const isSuccessfulQuery = (operation, result) => isQuery(operation) && isSuccessful(result);
export const isSuccessfulMutation = (operation, result) => isMutation(operation) && isSuccessful(result);
export const isFailedMutation = (operation, result) => isMutation(operation) && !isSuccessful(result);

export const isOptimistic = context => !!context.optimisticResponse;

export const getQueryName = query => {
  const queryDefinition = getMainDefinition(query);
  return (queryDefinition && queryDefinition.name && queryDefinition.name.value) || '';
};

export const getLinkArgs = (...args) => {
  if (args.length) {
    if (args.length === 1) {
      // recommended constructor api
      return {
        ...args[0],
        mutationQueryResolverMap: args[0].map
      };
    } else {
      // try and be backwards compatible with 0.1.0
      return {
        cache: args[0],
        mutationQueryResolverMap: args[1],
        debug: args[2],
        readOnly: args[3]
      };
    }
  }

  throw new Error('WatchedMutationLink requires input in the form { cache, map, debug, readOnly }');
};
