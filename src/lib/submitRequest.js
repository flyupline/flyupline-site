// Form delivery — posts submissions to our Vercel serverless function, which
// stores them in Supabase and sends the branded team alert + customer
// confirmation via Resend. See api/quote.js.

export async function submitRequest(formType, formElement) {
  const fd = new FormData(formElement)
  const data = {}
  for (const [key, value] of fd.entries()) {
    if (key in data) {
      if (Array.isArray(data[key])) data[key].push(value)
      else data[key] = [data[key], value]
    } else {
      data[key] = value
    }
  }
  data.form_type = formType

  const res = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Request failed (${res.status})`)
  }
  return json
}
