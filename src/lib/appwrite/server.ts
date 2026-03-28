import { Client, Account, Databases } from 'appwrite'
import { cookies } from 'next/headers'

const client = new Client()

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')

export async function createServerClient() {
  const cookieStore = cookies()
  const cookiesData = cookieStore.getAll()

  const client = new Client()
  client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_URL || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')

  if (cookiesData.length > 0) {
    const sessionCookie = cookiesData.find(c => c.name.startsWith('a_session_'))
    if (sessionCookie) {
      client.setSession(sessionCookie.value)
    }
  }

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
  }
}

export { client }
