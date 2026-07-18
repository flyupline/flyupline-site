// Central place to configure where each form posts.
// These match the endpoints the original FlyUp Line site used — point them
// at your live handlers (PHP, serverless function, form service, ...) on deploy.
export const ENDPOINTS = {
  roundtrip: '/roundtrip.php',
  oneway: '/oneway.php',
  multicity: '/multicity.php',
  contact: '/contact.php',
}

export async function submitRequest(endpoint, formElement) {
  const data = new FormData(formElement)
  const res = await fetch(endpoint, { method: 'POST', body: data })
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`)
  }
  return res
}
