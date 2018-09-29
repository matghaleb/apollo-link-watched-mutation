export const createQueryKeyManager = () => {
  // used to keep track of unique QueryName + QueryCacheKey combinations
  // structured as { Query: [cache_key_1, cache_key_2, ...] }
  const queriesToUpdate = {};

  const getQueryKeysToUpdate = queryName => queriesToUpdate[queryName] || [];

  return {
    addQuery: (queryName, queryKey) => {
      queriesToUpdate[queryName] = [...getQueryKeysToUpdate(queryName), queryKey];
    },
    removeQuery: (queryName, queryKey) => {
      queriesToUpdate[queryName] = getQueryKeysToUpdate(queryName).filter(key => JSON.stringify(key) !== JSON.stringify(queryKey));
    },
    hasQueryToUpdate: queryName => queriesToUpdate.hasOwnProperty(queryName),
    getQueryKeysToUpdate
  };
}