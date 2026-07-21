// Cached loaders for the airport and airline datasets (fetched once).
let airportsCache = null
let airportsPromise = null
let airlinesCache = null
let airlinesPromise = null

export function loadAirports() {
  if (airportsCache) return Promise.resolve(airportsCache)
  if (!airportsPromise) {
    airportsPromise = fetch('/assets/data/airports.json')
      .then((r) => r.json())
      .then((data) => {
        // normalise to { code, name, city, country }
        airportsCache = data.map((a) => ({ code: a.iata, name: a.name, city: a.city, country: a.country }))
        return airportsCache
      })
      .catch(() => [])
  }
  return airportsPromise
}

export function loadAirlines() {
  if (airlinesCache) return Promise.resolve(airlinesCache)
  if (!airlinesPromise) {
    airlinesPromise = fetch('/assets/data/airlines.json')
      .then((r) => r.json())
      .then((data) => {
        airlinesCache = data
        return data
      })
      .catch(() => [])
  }
  return airlinesPromise
}

export const airlineLogo = (iata) => (iata ? `https://pics.avs.io/60/60/${iata}.png` : '')
