export interface User {
  email: string;
  username: string;
  name: string;
}

export interface TodoItem {
  id: number;
  title: string;
  description: string;
  deadline: Date;
}

export interface TodoItemForCreate {
  title: string;
  description: string;
  deadline: Date;
}

export class ApiError extends Error {
  constructor(status: number, message: string) {
    super(`${status} / ${message}`);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(endpoint, config);

  // If the response is not OK (e.g., 404, 500), throw a custom error.
  if (!response.ok) {
    const error = new ApiError(response.status, response.statusText);
    alert(`${error.name}: ${error.message}`);
    throw error;
  }

  // For 204 No Content, there's no body to parse
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function getMe(): Promise<User> {
  return request(`/api/me`, "GET");
}

export function getTodos(): Promise<TodoItem[]> {
  return request(`/api/todos`, "GET");
}

export function createTodo(
  title: string,
  description: string,
  deadline: Date,
): Promise<TodoItem> {
  return request(`/api/todos`, "POST", { title, description, deadline });
}

export function generateTodo(prompt: string): Promise<TodoItemForCreate> {
  return request<TodoItemForCreate>(
    `/api/todos/generate?prompt=${encodeURIComponent(prompt)}`,
    "GET",
  ).then((data) => {
    data.deadline = new Date(data.deadline);
    return data;
  });
}

export function deleteTodo(id: number): Promise<void> {
  return request(`/api/todos/${id}`, "DELETE");
}
