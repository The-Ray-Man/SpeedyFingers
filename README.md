# VIScon Hackathon Template

Welcome, hackers, to the VIScon Hackathon!

This repository is a template for your hackathon project. It includes a
basic structure for your project, as well as some resources to help you
get started.

Feel free to modify this template as you see fit or yeet it completely :)

## Project Overview

This template provides a solid starting point for your hackathon project, featuring:

- **Frontend:** A simple React application.
- **Backend:** A Python backend built with the **FastAPI** framework.
- **AI Integration:** An AI-powered endpoint that generates structured data from natural language prompts using `litellm`.
- **Proxy:** A Traefik reverse proxy to route traffic seamlessly.

Everything is containerized with Docker, so you can get up and running with a single command.

## Quick Start

To start all the services, simply run:

```bash
docker compose up --build
```

This will build the containers and start the frontend, backend, and proxy. The application will then be available at:

- **Frontend:** [`http://localhost:8080`](http://localhost:8080)
- **Backend API:** [`http://localhost:8080/api`](http://localhost:8080/api)

## Backend (FastAPI)

The backend is a Python application built with the **FastAPI** framework. It provides a REST API for a multi-user todo list and includes an AI-powered feature.

The backend code is located in the `/backend` directory. You can start it independently by running:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python app.py
```

You can then get started by visiting http://localhost:8000/api/docs.

### API Endpoints

The following endpoints are available. Note that the `/api` prefix is required for all backend routes.

| Method   | Path                   | Description                                         |
| :------- | :--------------------- | :-------------------------------------------------- |
| `GET`    | `/api/me`              | Get the current user.                               |
| `GET`    | `/api/todos`           | Get all todos for the current user.                 |
| `POST`   | `/api/todos`           | Create a new todo for the current user.             |
| `DELETE` | `/api/todos/{todo_id}` | Delete a specific todo by its ID.                   |
| `GET`    | `/api/todos/generate`  | Suggests a new todo from a natural language prompt. |

### Authentication

By default, authentication is handled by the VIScon platform's central proxy. When a user logs into the platform, these headers are automatically added to requests forwarded to your application.

The following headers are expected on requests to the `/api` endpoints:

- `X-User-Id`: A unique identifier for the user.
- `X-User-Name`: The user's full name.

The backend uses the `X-User-Id` to maintain a separate todo list for each user.

### AI-Powered Todo Generation

We've integrated an AI service using `litellm` to generate structured todo items from natural language.

This feature requires credentials for an LLM proxy. To enable it, ensure that the `.env` file in the root directory of the project contains you team-specific API key.

```ini
# .env
...
LITELLM_PROXY_API_KEY=your-secret-api-key
```

## Frontend (React)

The frontend is a simple React app that displays some information and hosts a todo list app. It is written in TypeScript, and the backend requests are made using the `fetch` API.

The frontend code is located in the `/frontend` directory. You can start it independently by running:

```bash
cd frontend
npm install

npm run dev
```

You can then get started by visiting http://localhost:3000.

## Proxy (Traefik)

The project uses Traefik as a reverse proxy. It acts as the single entry point for the application, listening on `http://localhost:8080`.

Its main responsibilities are:

- Routing requests starting with `/api` to the backend service.
- Routing all other requests (`/`) to the frontend service.

The configuration is done via Docker labels in the `docker-compose.yml` file, so you can easily add new services and routing rules.
