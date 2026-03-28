export const DEMO_MODE = true

export const DEMO_USER = {
  id: "demo-user-001",
  email: "demo@contaflow.app",
  name: "Usuario Demo",
  full_name: "Usuario Demo",
  avatar_url: null,
  company_name: "Contaflow Demo",
}

export interface DemoSession {
  user: typeof DEMO_USER
  expires: number
}

export function isDemoSession(): boolean {
  if (!DEMO_MODE) return false
  
  if (typeof window === "undefined") return false
  
  const session = localStorage.getItem("demo_session")
  if (!session) return false
  
  try {
    const parsed: DemoSession = JSON.parse(session)
    if (parsed.expires < Date.now()) {
      localStorage.removeItem("demo_session")
      return false
    }
    return true
  } catch {
    return false
  }
}

export function getDemoUser() {
  if (!isDemoSession()) return null
  
  const session = localStorage.getItem("demo_session")
  if (!session) return null
  
  try {
    const parsed: DemoSession = JSON.parse(session)
    return parsed.user
  } catch {
    return null
  }
}

export function clearDemoSession() {
  localStorage.removeItem("demo_session")
}
