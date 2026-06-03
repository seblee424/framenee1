import { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, ListTodo } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  assignee: string;
  points: number;
}

export function TodoListModule() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: '1', text: 'Clean your room', completed: false, assignee: 'Emma', points: 10 },
    { id: '2', text: 'Do homework', completed: true, assignee: 'Jake', points: 15 },
    { id: '3', text: 'Water the plants', completed: false, assignee: 'Mom', points: 5 },
    { id: '4', text: 'Take out trash', completed: false, assignee: 'Dad', points: 5 },
  ]);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        text: newTodo,
        completed: false,
        assignee: 'Unassigned',
        points: 10,
      };
      setTodos([...todos, todo]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ListTodo className="w-8 h-8 text-primary" />
          <h2 className="text-2xl">Family To-Dos</h2>
        </div>
        <div className="px-4 py-2 bg-muted rounded-lg">
          {completedCount} / {todos.length} Done
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new task..."
          className="flex-1 px-4 py-3 bg-input-background rounded-lg outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={addTodo}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add
        </button>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {todos.map(todo => (
          <div
            key={todo.id}
            className={`
              p-4 rounded-lg border transition-all
              ${todo.completed ? 'bg-muted border-muted' : 'bg-white border-border hover:border-primary'}
            `}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleTodo(todo.id)}
                className="mt-1 flex-shrink-0"
              >
                {todo.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1">
                <p className={`${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {todo.text}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm">
                    {todo.assignee}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {todo.points} points
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {todos.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No tasks yet. Add one to get started!
        </div>
      )}
    </div>
  );
}
