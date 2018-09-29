import { ApolloLink } from 'apollo-link';
import { getMainDefinition } from 'apollo-utilities';
import { assertPreconditions } from './validation';
import {
  isSuccessfulQuery,
  isSuccessfulMutation,
  isFailedMutation,
  isOptimistic,
  getQueryName,
  getLinkArgs
} from './utils';
import { createCacheManager } from './cache-manager';
import { createQueryKeyManager } from './queries-to-update-manager';
import { createMutationsManager } from './mutations-to-update-manager';
import { createInflightRequestManager } from './inflight-request-manager';


export class WatchedMutationLink extends ApolloLink {
  /**
   * @param cache - cache used w/ apollo-client
   * @param mutationQueryResolverMap - map of mutations -> map of queries -> callbacks for updating the cache
   * @param debug - flag for debug logging, will log if truthy
   * @param readOnly - flag for telling this link never to write to the cache but otherwise operate as normal
   */
  constructor(...args) {
    super();
    const {
      cache,
      mutationQueryResolverMap,
      debug,
      readOnly
    } = getLinkArgs(...args);

    assertPreconditions(cache, mutationQueryResolverMap);

    this.cache = createCacheManager(cache, debug, readOnly);
    this.debug = debug;
    this.readOnly = readOnly;
    this.mutationManager = createMutationsManager(mutationQueryResolverMap);
    this.queriesToUpdate = createQueryKeyManager();
    this.inflightOptimisticRequests = createInflightRequestManager(this.cache);
    this.debugLog({
      message: 'Success --- Constructed our link',
      watchedMutations: this.mutationManager.getMutationNames()
    });
  }

  debugLog = payload => this.debug && window.console.log(payload);
  isQueryRelated = operationName => {
    const registeredQueryNames = this.mutationManager.getAllQueryNamesToUpdate();
    return registeredQueryNames.some(queryName => queryName === operationName || false);
  }
  addRelatedQuery = (queryName, operation) => {
    this.queriesToUpdate.addQuery(queryName, this.cache.createKey(operation));
  }
  removeRelatedQuery = (queryName, queryKey) => {
    this.queriesToUpdate.removeQuery(queryName, queryKey);
  }
  getCachedQueryKeysToUpdate = mutationName => {
    // gets all the unique Query + QueryVariable cache keys used by the apollo-cache
    const relevantQueryNames = this.mutationManager.getQueryNamesToUpdate(mutationName);
    return relevantQueryNames.reduce((queryCacheKeyList, queryName) => {
      const relevantQueryCacheKeys = this.queriesToUpdate.getQueryKeysToUpdate(queryName);
      return [
        ...queryCacheKeyList,
        ...relevantQueryCacheKeys
      ];
    }, []);
  }

  updateQueryAfterMutation = (mutationOperation, mutationData, queryKey) => {
    const queryName = getQueryName(queryKey.query);
    const cachedQueryData = this.cache.read(queryKey);
    if (!cachedQueryData) {
      // we failed reading from the cache so there's nothing to update, probably it was invalidated outside of this link, we should remove it from our queries to update
      this.removeRelatedQuery(queryName, queryKey);
      return;
    }
    const mutationName = getQueryName(mutationOperation.query);
    const updateQueryCb = this.mutationManager.getUpdateFn(mutationName, queryName);
    const updatedData = updateQueryCb({
      mutation: {
        name: mutationName,
        variables: mutationOperation.variables,
        result: mutationData
      },
      query: {
        name: queryName,
        variables: queryKey.variables,
        result: cachedQueryData
      }
    });
    if (updatedData) {
      this.cache.write(queryKey, updatedData);
    } else {
      this.debugLog({
        message: 'We did NOT receive anything new to write to the cache so we will not do anything',
        cacheKey: queryKey
      });
    }
  }
  updateQueriesAfterMutation = (operation, operationName, result) => {
    const cachedQueryToUpdateKeys = this.getCachedQueryKeysToUpdate(operationName);
    cachedQueryToUpdateKeys.forEach(queryKey => {
      this.debugLog({
        message: 'Found a cached query related to this successful mutation, this Link will invoke the associated callback',
        mutationName: operationName
      });
      this.updateQueryAfterMutation(operation, result, queryKey);
    });
  }

  addOptimisticRequest = (operationName) => {
    const cachedQueryToUpdateKeys = this.getCachedQueryKeysToUpdate(operationName);
    cachedQueryToUpdateKeys.forEach(queryKey => {
      const currentCachedState = this.cache.read(queryKey);
      this.inflightOptimisticRequests.set(queryKey, currentCachedState);
      this.debugLog({
        message: 'Added a cached query in case we need to revert it after an optimistic error',
        mutationName: operationName
      });
    });
  }
  clearOptimisticRequest = query => {
    this.inflightOptimisticRequests.set(query, null);
  }
  revertOptimisticRequest = (operationName) => {
    const cachedQueryToUpdateKeys = this.getCachedQueryKeysToUpdate(operationName);
    cachedQueryToUpdateKeys.forEach(query => {
      const previousCachedState = this.inflightOptimisticRequests.get(query);
      if (previousCachedState) {
        this.cache.write(query, previousCachedState);
        this.debugLog({
          message: 'Reverted an optimistic request after an error',
          afterRevert: previousCachedState,
          mutationName: operationName
        });
      }
      this.clearOptimisticRequest(operationName);
    });
  }

  request(operation, forward) {
    const observer = forward(operation);
    const definition = getMainDefinition(operation.query);
    const operationName = (definition && definition.name && definition.name.value) || '';
    const context = operation.getContext();
    if (isOptimistic(context) && this.mutationManager.isWatched(operationName)) {
      this.addOptimisticRequest(operationName);
      this.updateQueriesAfterMutation(operation, operationName, context.optimisticResponse);
    }

    return observer.map(result => {
      if (isSuccessfulQuery(definition.operation, result) && this.isQueryRelated(operationName)) {
        // for every successful query, if any watched mutations care about it, store the cacheKey to update it later
        this.debugLog({ message: 'Found a successful query related to a watched mutation', relatedQueryName: operationName });
        this.addRelatedQuery(operationName, operation);
      }
      else if (isSuccessfulMutation(definition.operation, result) && this.mutationManager.isWatched(operationName)) {
        if (isOptimistic(context)) {
          this.clearOptimisticRequest(operationName);
        } else {
          // for every successful mutation, look up the cachedQueryKeys the mutation cares about, and invoke the update callback for each one
          this.updateQueriesAfterMutation(operation, operationName, result);
        }
      } else if (isFailedMutation(definition.operation, result) && this.mutationManager.isWatched(operationName)) {
        this.revertOptimisticRequest(operationName);
      }
      return result;
    });
  }
}

export default WatchedMutationLink;
