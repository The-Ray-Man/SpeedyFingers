from collections import defaultdict
from copy import deepcopy
from datetime import datetime, timedelta
from os import getenv

import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from pydantic import ValidationError

from ai import AIService
from models import TodoItem, TodoItemForCreate, User

LITELLM_PROXY_API_KEY = getenv("LITELLM_PROXY_API_KEY")
LITELLM_PROXY_API_BASE = getenv("LITELLM_PROXY_API_BASE")
USE_MOCK_AUTHENTICATION = getenv("USE_MOCK_AUTHENTICATION", "true").lower() != "false"


class State:
    DEFAULT_TODOS: list[TodoItem] = [
        TodoItem(
            id=1,
            title="Find a great team",
            description="Find a great team to work with",
            deadline=datetime.now(),
        ),
        TodoItem(
            id=2,
            title="Choose a project",
            description="Choose a project to work on",
            deadline=datetime.now() + timedelta(hours=1),
        ),
        TodoItem(
            id=3,
            title="Interview people for need-finding",
            description="Interview people for need-finding",
            deadline=datetime.now() + timedelta(hours=2),
        ),
        TodoItem(
            id=4,
            title="Come up with a lo-fi prototype",
            description="Come up with a lo-fi prototype",
            deadline=datetime.now() + timedelta(hours=3),
        ),
    ]

    # Mapping from user id to their todo items
    # When a new user id is seen, initialize with a fresh copy of DEFAULT_TODOS
    todos_by_user_id: defaultdict[str, list[TodoItem]] = defaultdict(
        lambda: deepcopy(State.DEFAULT_TODOS)
    )

    def get_todos(self, user_id: str) -> list[TodoItem]:
        return self.todos_by_user_id[user_id]

    def create_todo(self, user_id: str, item: TodoItemForCreate) -> TodoItem:
        todos = self.todos_by_user_id[user_id]
        next_id = max((todo.id for todo in todos), default=0) + 1
        new_todo = TodoItem(
            id=next_id,
            title=item.title,
            description=item.description,
            deadline=item.deadline,
        )
        todos.append(new_todo)
        return new_todo

    def delete_todo(self, user_id: str, todo_id: int):
        todos = self.todos_by_user_id[user_id]
        new_todos = [todo for todo in todos if todo.id != todo_id]
        self.todos_by_user_id[user_id] = new_todos


state = State()
ai_service = AIService(
    "openai/gpt-4o-mini", LITELLM_PROXY_API_BASE, LITELLM_PROXY_API_KEY
)

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")


def extract_user(request: Request) -> User:
    if USE_MOCK_AUTHENTICATION:
        id = "aeinstein"
        name = "Albert Einstein"
    else:
        id = request.headers.get("X-User-Id")
        name = request.headers.get("X-User-Name")

    try:
        user = User(id=id, name=name)
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication headers, expected X-User-Id and X-User-Name",
        )

    return user


@app.get("/api/me", response_model=User, status_code=status.HTTP_200_OK)
def auth_me(request: Request):
    return extract_user(request)


@app.get("/api/todos", response_model=list[TodoItem], status_code=status.HTTP_200_OK)
def get_todos(request: Request):
    user = extract_user(request)
    return state.get_todos(user.id)


@app.post("/api/todos", response_model=TodoItem, status_code=status.HTTP_201_CREATED)
def create_todo(request: Request, item: TodoItemForCreate):
    user = extract_user(request)
    return state.create_todo(user.id, item)


@app.delete("/api/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(request: Request, todo_id: int):
    user = extract_user(request)
    state.delete_todo(user.id, todo_id)


@app.get(
    "/api/todos/generate",
    response_model=TodoItemForCreate,
    status_code=status.HTTP_200_OK,
)
def generate_todo(prompt: str):
    try:
        return ai_service.generate_todo(prompt)
    except Exception:
        return TodoItemForCreate(title="", description="", deadline=datetime.now())


if __name__ == "__main__":
    print(f"Starting server")
    uvicorn.run(
        "__main__:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
