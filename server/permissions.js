// Capability model. Roles set the defaults; per-user overrides (stored on
// admin_users.permissions) can grant or revoke any single capability.
export const CAPABILITIES = [
  { key: 'requests.view', label: 'View requests' },
  { key: 'requests.manage', label: 'Manage requests (status, assign, archive)' },
  { key: 'requests.delete', label: 'Delete requests' },
  { key: 'quotes.edit', label: 'Build & save quotes' },
  { key: 'quotes.send', label: 'Send quotes to customers' },
  { key: 'messages.send', label: 'Message customers' },
  { key: 'notes.write', label: 'Write internal notes' },
  { key: 'team.manage', label: 'Manage people & permissions' },
]

export const ROLE_DEFAULTS = {
  owner: {
    'requests.view': true, 'requests.manage': true, 'requests.delete': true,
    'quotes.edit': true, 'quotes.send': true, 'messages.send': true,
    'notes.write': true, 'team.manage': true,
  },
  admin: {
    'requests.view': true, 'requests.manage': true, 'requests.delete': true,
    'quotes.edit': true, 'quotes.send': true, 'messages.send': true,
    'notes.write': true, 'team.manage': false,
  },
  moderator: {
    'requests.view': true, 'requests.manage': false, 'requests.delete': false,
    'quotes.edit': true, 'quotes.send': false, 'messages.send': false,
    'notes.write': true, 'team.manage': false,
  },
}

export function effectivePermissions(role, overrides) {
  const base = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.moderator
  const out = { ...base }
  for (const [k, v] of Object.entries(overrides || {})) {
    if (k in out && typeof v === 'boolean') out[k] = v
  }
  return out
}

export function can(ctx, capability) {
  return Boolean(ctx?.permissions?.[capability])
}

// Throws a 403 unless the caller holds the capability.
export function requireCap(ctx, capability) {
  if (!can(ctx, capability)) {
    throw Object.assign(new Error('You do not have permission to do that.'), { status: 403 })
  }
}
