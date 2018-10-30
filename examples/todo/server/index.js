const { ApolloServer, gql } = require('apollo-server');
const { port } = require('./package');

let todos = [
  {
    text: 'Go to the gym',
    completed: true,
  },
  {
    text: 'Get groceries',
    completed: false
  },
];

const typeDefs = gql`
  type Todo {
    id: Int!
    text: String!
    completed: Boolean!
  }

  type Mutation {
    addTodo(text: String!): Todo
    toggleTodo(id: Int!): Todo
  }

  type Query {
    todos(filter: String): [Todo]
  }
`;

const getVisibleTodos = (todos, filter) => {
  switch (filter) {
    case 'SHOW_COMPLETED':
      return todos.filter(t => t.completed);
    case 'SHOW_ACTIVE':
      return todos.filter(t => !t.completed);
    default:
      return todos;
  }
};

const resolvers = {
  Query: {
    todos: (_, args) => {
      const allTodos = todos.map((todo, idx) => ({
        id: idx,
        ...todo
      }));
      return getVisibleTodos(allTodos, args.filter);
    },
  },
  Mutation: {
    addTodo: (_, args) => {
      const newTodo = { id: todos.length, text: args.text, completed: false };
      todos = [...todos, newTodo];
      return newTodo;
    },
    toggleTodo: (_, args) => {
      const todoToToggle = todos[args.id];
      todoToToggle.completed = !todoToToggle.completed;
      return {
        id: args.id,
        ...todoToToggle
      };
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen(port).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
