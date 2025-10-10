import { useEffect, useState } from "react";
import { getMe, getTodos, type TodoItem, type User } from "../apiClient";
import TodoForm from "./TodoForm";
import TodoTable from "./TodoTable";
import "./Todos.css";

const Todos = () => {
  const [me, setMe] = useState<User | undefined>();
  const [todos, setTodos] = useState<TodoItem[]>([]);

  async function updateMe() {
    setMe(await getMe());
  }

  async function updateTodos() {
    setTodos(await getTodos());
  }

  useEffect(() => {
    updateMe();
    updateTodos();
  }, []);

  return (
    <div className="todos">
      <h1>Todos {me && <>of {me.name}</>}</h1>
      <TodoForm onTodoCreated={updateTodos} />
      <TodoTable todos={todos} onTodoDeleted={updateTodos} />
    </div>
  );
};

export default Todos;
