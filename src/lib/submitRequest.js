// Form delivery via Web3Forms — submissions land in flyupline.booking@gmail.com.
// The access key is read at build time from VITE_WEB3FORMS_KEY (set in Vercel
// project env). Get a key for free at https://web3forms.com — no account needed,
// just verify the destination email. The key is public by design (frontend form).
const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || ''

export const FORMS_CONFIGURED = Boolean(ACCESS_KEY)

const ENDPOINT = 'https://api.web3forms.com/submit'

export async function submitRequest(formType, formElement) {
  if (!ACCESS_KEY) {
    throw new Error('Forms are not configured yet (missing access key).')
  }

  const data = new FormData(formElement)
  data.append('access_key', ACCESS_KEY)
  data.append('subject', `New ${formType} — FlyUp Line website`)
  data.append('from_name', 'FlyUp Line Website')

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: data,
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Request failed (${res.status})`)
  }
  return json
}
