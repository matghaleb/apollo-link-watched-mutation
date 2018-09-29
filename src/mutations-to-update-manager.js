export const createMutationsManager = mutationQueryResolverMap => {
  // used to look up mutations to watch, what queries each mutation is related to, and what callbacks to call for each query

  const getMutationNames = () => Object.keys(mutationQueryResolverMap);
  const getQueryNamesToUpdate = mutationName => {
    return Object.keys(mutationQueryResolverMap[mutationName] || {})
  };
  const getAllQueryNamesToUpdate = () => {
    return getMutationNames().reduce((queryNames, mutationName) => {
      queryNames.push(...getQueryNamesToUpdate(mutationName));
      return queryNames;
    }, []);
  };

  return {
    isWatched: mutationName => mutationQueryResolverMap.hasOwnProperty(mutationName),
    getMutationNames,
    getQueryNamesToUpdate,
    getAllQueryNamesToUpdate,
    getUpdateFn: (mutationName, queryName) => mutationQueryResolverMap[mutationName][queryName] || (() => {})
  };
};