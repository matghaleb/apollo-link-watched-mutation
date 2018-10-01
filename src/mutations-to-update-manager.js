export const createMutationsManager = mutationQueryResolverMap => {
  // used to look up mutations to watch, what queries each mutation is related to, and what callbacks to call for each query

  const getMutationNames = () => Object.keys(mutationQueryResolverMap);
  const getRegisteredQueryNames = mutationName => {
    return Object.keys(mutationQueryResolverMap[mutationName] || {})
  };
  const getAllRegisteredQueryNames = () => {
    // across all watched mutations
    return getMutationNames().reduce((queryNames, mutationName) => {
      queryNames.push(...getRegisteredQueryNames(mutationName));
      return queryNames;
    }, []);
  };

  return {
    isWatched: mutationName => mutationQueryResolverMap.hasOwnProperty(mutationName),
    getMutationNames,
    getRegisteredQueryNames,
    getAllRegisteredQueryNames,
    getUpdateFn: (mutationName, queryName) => mutationQueryResolverMap[mutationName][queryName] || (() => {})
  };
};