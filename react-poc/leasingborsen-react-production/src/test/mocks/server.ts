import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup server with default handlers
export const server = setupServer(...handlers);

// Server management utilities
export const mswServer = {
  // Start the server with optional additional handlers
  start: (additionalHandlers?: any[]) => {
    const allHandlers = additionalHandlers 
      ? [...handlers, ...additionalHandlers]
      : handlers;
    
    server.listen({
      onUnhandledRequest: 'warn', // Warn about unhandled requests
    });
  },

  // Stop the server
  stop: () => {
    server.close();
  },

  // Reset handlers to initial state
  reset: () => {
    server.resetHandlers();
  },

  // Use different handlers for specific tests
  use: (...newHandlers: any[]) => {
    server.use(...newHandlers);
  },

  // Restore original handlers
  restoreHandlers: () => {
    server.restoreHandlers();
  },
};

export default server;