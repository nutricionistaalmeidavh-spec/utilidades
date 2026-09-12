export function createPolicy(definition = {}) {
  return Object.freeze(Object.fromEntries(Object.entries(definition).map(([role, permissions]) => [role, new Set(permissions)])));
}
export function can(policy, roles, permission) {
  const list = Array.isArray(roles) ? roles : [roles];
  return list.some(role => policy?.[role]?.has('*') || policy?.[role]?.has(permission));
}
export function requirePermission(policy, roles, permission) {
  if (!can(policy,roles,permission)) { const error = new Error(`permission denied: ${permission}`); error.code='FORBIDDEN'; throw error; }
  return true;
}
