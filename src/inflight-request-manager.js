export const createInflightRequestManager = () => {
  // used to keep track of prior cache states that we may have to revert after an optimistic error.
  // structured as { JSON.stringify(cacheKey): cached_result }]
  const inflightRequests = {};

  return {
    getBeforeState: queryKey => inflightRequests[JSON.stringify(queryKey)],
    set: (queryKey, result) => {
      inflightRequests[JSON.stringify(queryKey)] = result;
    }
  };
};