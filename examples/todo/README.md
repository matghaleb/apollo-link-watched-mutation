Todo App with Apollo Client

A brief example with a client displaying a few filtered lists of Todos.

If you click on any of the Todos, it'll toggle the ```completed``` status and update the cache in order to move the Todo to the proper lists.

Similarly, if you add any todos, it'll update the cache.

Notes:
- The server starts up with an initial todo list, if you want to reset your todo list, just reset the server.
- If you want to test reversions after an optimistic failure, play around with throwing an error in the ```toggleTodo``` mutation resolver.
- This example attempts to start the server on 4000 and will fail if it can't access that port.
- Debug logs are by default printed to the console

---

### Installation
```
npm i
```

### Running
```
npm start
```
