import { NextRequest } from 'next/server'

// Store active connections
const connections = new Set<ReadableStreamDefaultController>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const seasonId = searchParams.get('seasonId')

  if (!seasonId) {
    return new Response('Season ID required', { status: 400 })
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to our set
      connections.add(controller)
      
      // Send initial connection message
      const data = JSON.stringify({ 
        type: 'connected', 
        message: 'Connected to real-time updates',
        seasonId 
      })
      controller.enqueue(`data: ${data}\n\n`)

      // Keep connection alive with periodic ping
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)
        } catch (error) {
          clearInterval(pingInterval)
          connections.delete(controller)
        }
      }, 30000) // Ping every 30 seconds

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        connections.delete(controller)
        try {
          controller.close()
        } catch (error) {
          // Connection already closed
        }
      })
    },
    cancel() {
      connections.delete(controller)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

// Function to broadcast updates to all connected clients
export function broadcastUpdate(type: string, data: any, seasonId?: string) {
  const message = JSON.stringify({ type, data, seasonId, timestamp: Date.now() })
  
  connections.forEach(controller => {
    try {
      controller.enqueue(`data: ${message}\n\n`)
    } catch (error) {
      // Remove dead connections
      connections.delete(controller)
    }
  })
}

// Function to broadcast to specific season
export function broadcastToSeason(type: string, data: any, seasonId: string) {
  const message = JSON.stringify({ type, data, seasonId, timestamp: Date.now() })
  
  connections.forEach(controller => {
    try {
      controller.enqueue(`data: ${message}\n\n`)
    } catch (error) {
      // Remove dead connections
      connections.delete(controller)
    }
  })
}
