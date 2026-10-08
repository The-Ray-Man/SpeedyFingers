// Base URL of the backend API. Defaults to the same-origin `/api` path that
// Traefik (in Docker) and the Vite dev proxy forward to the backend.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
