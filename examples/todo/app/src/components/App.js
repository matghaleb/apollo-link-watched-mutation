import React from 'react';
import { TodoForm } from './TodoForm';
import { TodoList } from './TodoList';
import { visibilityFilter } from '../enums';

const App = () => (
  <main>
    <TodoForm/>
    <div style={{ display: 'flex' }}>
      <TodoList filter={visibilityFilter.SHOW_ACTIVE}/>
      <TodoList filter={visibilityFilter.SHOW_COMPLETED}/>
      <TodoList filter={visibilityFilter.SHOW_ALL}/>
    </div>
  </main>
);
export default App;
