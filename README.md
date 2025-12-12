# Frontend - Chat Assistant

A Next.js frontend application with a ChatGPT-like interface for interacting with the AI chat backend.

## Features

- 🎨 ChatGPT-inspired design and layout
- 💬 Real-time streaming chat responses
- 📱 Responsive design
- ⚡ Built with Next.js 14 and TypeScript
- 🎯 Tailwind CSS for styling
- 🔌 Backend API integration with connection status

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running (default: http://localhost:8000)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure the backend API URL (optional):
   
   Create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

   Or set it in your environment. The default is `http://localhost:8000`.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend Integration

The frontend connects to the FastAPI backend at the `/chat` endpoint. Make sure:

1. **Backend is running**: The backend should be running on the configured port (default: 8000)
2. **CORS is enabled**: The backend already has CORS middleware configured to allow all origins
3. **API endpoint**: The frontend sends POST requests to `${API_URL}/chat`

### API Configuration

The frontend uses the `NEXT_PUBLIC_API_URL` environment variable to determine the backend URL. You can:

- Set it in `.env.local` for local development
- Set it in your deployment environment
- Defaults to `http://localhost:8000` if not set

### Connection Status

The frontend displays a connection status indicator in the header:
- 🟢 Green dot = Backend is connected and responding
- 🔴 Red dot = Backend is not reachable

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main page
│   └── globals.css      # Global styles
├── components/
│   ├── ChatContainer.tsx  # Main chat container
│   ├── MessageList.tsx    # Message list component
│   ├── Message.tsx        # Individual message component
│   └── InputBox.tsx       # Input box component
├── lib/
│   └── api.ts            # API utility functions
└── package.json
```

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### Backend Connection Issues

1. **Check backend is running**: Ensure the FastAPI backend is running on the expected port
2. **Check API URL**: Verify `NEXT_PUBLIC_API_URL` matches your backend URL
3. **Check CORS**: The backend should have CORS middleware enabled (already configured)
4. **Check network**: Ensure there are no firewall or network issues blocking the connection

### Common Issues

- **"Failed to get response"**: Backend might not be running or API URL is incorrect
- **CORS errors**: Backend CORS middleware should allow all origins (already configured)
- **Streaming not working**: Check browser console for errors and verify backend streaming endpoint

## Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **React Hooks** - State management
- **Fetch API** - For HTTP requests and streaming

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |
