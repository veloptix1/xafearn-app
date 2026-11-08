import ChatClient from './ClientPage'

export async function generateStaticParams() {
  return [{ id: 'default' }]
}

export default function ChatPage() {
  return <ChatClient />
}
