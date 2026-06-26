// Back-compat shim for static imports (tests, WorkspaceHome).
// App.jsx lazy-loads ./pages/emergency directly to avoid dev HMR re-export failures.
export { default } from '../pages/emergency';
