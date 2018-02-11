import { ApolloLink } from 'apollo-link';
import { getMainDefinition } from 'apollo-utilities';
import { assertPreconditions } from './validation';
import {
  isSuccessfulQuery,
  isSuccessfulMutation,
  getQueryName
} from './utils';

export class WatchedMutationLink extends ApolloLink {
  /**
   * @param cache - cache used w/ apollo-client
   * @param mutationQueryResolverMap - map of mutations -> map of queries -> callbacks for updating the cache
   * @param debug - flag for debug logging, will log if truthy
   * @param readOnly - flag for telling this link never to write to the cache but otherwise operate as normal
   */
  constructor(cache, mutationQueryResolverMap, debug = 0, readOnly = 0) {
    assertPreconditions(cache, mutationQueryResolverMap);
    super();
    this.cache = cache;
    this.debug = debug;
    this.readOnly = readOnly;
    // used to look up mutations to watch, what queries each mutation is related to, and what callbacks to call for each query
    this.mutationQueryResolverMap = mutationQueryResolverMap;
    // used keep track of unique QueryName + QueryCacheKey combinations
    // structured as { Query: [cache_key_1, cache_key_2, ...] }
    this.queriesToUpdate = {};
    this.debugLog({ message: 'Success --- Constructed our link', watchedMutationNames: Object.keys(this.mutationQueryResolverMap)});
  }

  debugLog = payload => this.debug && window.console.log(payload);
  readFromCache = cacheKey => {
    try {
      return this.cache.readQuery(cacheKey);
    } catch (error) {
      this.debugLog({ message: 'Error --- Unable to read from cache', cacheKey, error });
    }
  }
  writeToCache = (cacheKey, data) => {
    if (this.readOnly) {
      this.debugLog({ message: 'ReadOnly --- this link will NOT write to the cache but it would have attempted to', cacheKey, data });
      return;
    }
    try {
      this.cache.writeQuery({ ...cacheKey, data });
      this.debugLog({ message: 'Success --- Updated the cache upon a mutation', cacheKey, data });
    } catch (error) {
      this.debugLog({ message: 'Error --- Unable to write to the cache', cacheKey, data, error });
    }
  }

  isQueryRelated = operationName => {
    // true if any watched mutation cares about this query
    const watchedMutationNames = Object.keys(this.mutationQueryResolverMap);
    return watchedMutationNames.some(mutationName => {
      const relevantQueryNames = Object.keys(this.mutationQueryResolverMap[mutationName]);
      return relevantQueryNames.some(queryName => queryName === operationName);
    });
  }
  addRelatedQuery = (queryName, operation) => {
    // add a queryName -> cachedQueryKey mapping to our map of cached queries to update
    const existingCachedQueryKeys = (this.queriesToUpdate[queryName] || []);
    const cachedQueryKey = { query: operation.query, variables: operation.variables };
    this.queriesToUpdate[queryName] = [ ...existingCachedQueryKeys, cachedQueryKey ];
  }
  removeRelatedQuery = (queryName, cacheKey) => {
    this.queriesToUpdate[queryName] = this.queriesToUpdate[queryName].filter(key => JSON.stringify(key) !== JSON.stringify(cacheKey));
  }

  isMutationWatched = mutationName => this.mutationQueryResolverMap.hasOwnProperty(mutationName)
  getCachedQueryKeysToUpdate = mutationName => {
    // gets all the unique Query + QueryVariable cache keys used by the apollo-cache
    const relevantQueryNames = Object.keys(this.mutationQueryResolverMap[mutationName] || {});
    return relevantQueryNames.reduce((queryCacheKeyList, queryName) => {
      const relevantQueryCacheKeys = this.queriesToUpdate[queryName] || [];
      return [
        ...queryCacheKeyList,
        ...relevantQueryCacheKeys
      ];
    }, []);
  }

  updateQueryAfterMutation = (mutationOperation, mutationData, cacheKey) => {
    const queryName = getQueryName(cacheKey.query);
    const cachedQueryData = this.readFromCache(cacheKey);
    if (!cachedQueryData) {
      // we failed reading from the cache so there's nothing to update, probably it was invalidated outside of this link, we should remove it from our queries to update
      this.removeRelatedQuery(queryName, cacheKey);
      return;
    }
    const mutationName = getQueryName(mutationOperation.query);
    const updateQueryCb = this.mutationQueryResolverMap[mutationName][queryName];
    const updatedData = updateQueryCb({
      mutation: {
        name: mutationName,
        variables: mutationOperation.variables,
        result: mutationData
      },
      query: {
        name: queryName,
        variables: cacheKey.variables,
        result: cachedQueryData
      }
    });
    if (updatedData) {
      this.writeToCache(cacheKey, updatedData);
    } else {
      this.debugLog({ message: 'Success --- We did NOT receive anything new to write to the cache so we will not do anything', cacheKey });
    }
  }

  request(operation, forward) {
    const observer = forward(operation);
    const definition = getMainDefinition(operation.query);
    const operationName = (definition && definition.name && definition.name.value) || '';

    return observer.map(result => {
      if (isSuccessfulQuery(definition.operation, result) && this.isQueryRelated(operationName)) {
        // for every successful query, if any watched mutations care about it, store the cacheKey to update it later
        this.debugLog({ message: 'Success --- Found a successful query related to a watched mutation', relatedQueryName: operationName });
        this.addRelatedQuery(operationName, operation);
      }
      else if (isSuccessfulMutation(definition.operation, result) && this.isMutationWatched(operationName)) {
        // for every successful mutation, look up the cachedQueryKeys the mutation cares about, and invoke the update callback for each one
        const cachedQueryToUpdateKeys = this.getCachedQueryKeysToUpdate(operationName);
        cachedQueryToUpdateKeys.forEach(cacheKey => {
          this.debugLog({
            message: 'Success --- Found a cached query related to this successful mutation, this Link will invoke the associated callback',
            cacheKey,
            mutationName: operationName
          });
          this.updateQueryAfterMutation(operation, result, cacheKey);
        });
      }
      return result;
    });
  }
}

export default WatchedMutationLink;
