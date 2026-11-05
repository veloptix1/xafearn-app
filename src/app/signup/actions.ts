export async function onUserSignup(userId: string, email: string, fullName: string) {
  // Mode statique : simulation
  console.log('Signup called:', { userId, email, fullName })
  return { success: true }
}
