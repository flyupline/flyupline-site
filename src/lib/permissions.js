// Mirror of server/permissions.js for UI gating only.
// The server is always the authority — this just hides what you can't do.
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
