// src/utils/storage.js
export function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback

  // alguns códigos acabam salvando "undefined" como string 🤡
  if (value === "undefined" || value === "null" || value === "") return fallback

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function getStoredUser() {
  return safeJsonParse(localStorage.getItem("user"), null)
}

export function getStoredToken() {
  const token = localStorage.getItem("token")
  if (!token || token === "undefined" || token === "null") return null
  return token
}