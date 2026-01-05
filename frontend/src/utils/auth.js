// NOTE: This file is currently unused. The application now relies on the
// centralized api helper in `src/config/api.js` and the Login component uses
// `api.login` directly. These helpers are kept only for potential future use.

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

export function isAuthenticated() {
  return !!localStorage.getItem("token");
}
