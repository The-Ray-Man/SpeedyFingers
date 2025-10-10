import { deleteTodo, type TodoItem } from "../apiClient";

interface TodoTableProps {
  todos: TodoItem[];
  onTodoDeleted: () => void;
}

const TodoTable = ({ todos, onTodoDeleted }: TodoTableProps) => {
  const handleDeleteTodo = async (todoId: number) => {
    await deleteTodo(todoId);
    onTodoDeleted();
  };

  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Title</th>
          <th>Description</th>
          <th>Deadline</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {todos.map((todo, index) => (
          <tr key={todo.id}>
            <td>{index + 1}</td>
            <td>{todo.title}</td>
            <td>{todo.description}</td>
            <td>
              {todo.deadline
                ? new Date(todo.deadline).toLocaleDateString()
                : "No deadline"}
            </td>
            <td>
              <button onClick={() => handleDeleteTodo(todo.id)} title="Delete">
                🗑️
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TodoTable;
