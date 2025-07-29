import { http, HttpResponse } from 'msw';

// Define handlers for external APIs and services
export const handlers = [
  // Mock PDF downloads from dealer websites
  http.get('https://vw-dealer.dk/catalogs/*', () => {
    return new HttpResponse('Mock VW PDF content', {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': '1024',
      },
    });
  }),

  http.get('https://toyota-dealer.dk/prisliste.pdf', () => {
    return new HttpResponse('Mock Toyota PDF content', {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': '2048',
      },
    });
  }),

  // Mock OpenAI API calls (in case they leak through)
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-3.5-turbo',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify({
            vehicles: [
              {
                make: 'Volkswagen',
                model: 'ID.4',
                variant: 'GTX Performance',
                monthly_price: 4999,
                retail_price: 475000,
                fuel_type: 'Electric',
                body_type: 'SUV',
                transmission: 'Automatic',
                year: 2024,
                offers: [
                  {
                    monthly_price: 4999,
                    period_months: 36,
                    mileage_per_year: 15000,
                    first_payment: 35000,
                  }
                ]
              }
            ]
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300
      }
    });
  }),

  // Mock Anthropic Claude API calls
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_mock',
      type: 'message',
      role: 'assistant',
      content: [{
        type: 'text',
        text: JSON.stringify({
          vehicles: [
            {
              make: 'Toyota',
              model: 'Aygo X',
              variant: 'Active 72 HK',
              monthly_price: 2195,
              retail_price: 185000,
              fuel_type: 'Petrol',
              body_type: 'Hatchback',
              transmission: 'Manual',
              year: 2024,
            }
          ]
        })
      }],
      model: 'claude-3-sonnet-20240229',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 100,
        output_tokens: 150
      }
    });
  }),

  // Mock Railway PDF extraction service
  http.post('https://leasingborsen-production.up.railway.app/extract-pdf', () => {
    return HttpResponse.json({
      extracted_text: 'Mock extracted PDF text content',
      pages: 5,
      processing_time: 2.5,
      success: true,
    });
  }),

  // Mock image upload services
  http.post('https://api.cloudinary.com/v1_1/*/image/upload', () => {
    return HttpResponse.json({
      public_id: 'mock-image-id',
      version: 1234567890,
      signature: 'mock-signature',
      width: 800,
      height: 600,
      format: 'jpg',
      resource_type: 'image',
      created_at: new Date().toISOString(),
      tags: [],
      bytes: 102400,
      type: 'upload',
      etag: 'mock-etag',
      placeholder: false,
      url: 'https://res.cloudinary.com/mock/image/upload/v1234567890/mock-image-id.jpg',
      secure_url: 'https://res.cloudinary.com/mock/image/upload/v1234567890/mock-image-id.jpg',
    });
  }),

  // Mock background removal service (API4AI)
  http.post('https://api.api4ai.cloud/v1/results', () => {
    return HttpResponse.json({
      results: [{
        entities: [{
          classes: ['background_removed'],
          image: 'data:image/png;base64,mock-base64-image-data',
        }]
      }]
    });
  }),

  // Mock any other external HTTP calls with a generic response
  http.get('*', ({ request }) => {
    const url = new URL(request.url);
    
    // Allow localhost and test URLs through
    if (url.hostname === 'localhost' || url.hostname.includes('test')) {
      return;
    }
    
    console.warn(`Unmocked external request to: ${request.url}`);
    return HttpResponse.json(
      { message: 'Mock response for unmocked external API' },
      { status: 200 }
    );
  }),

  // Mock POST requests to external services
  http.post('*', ({ request }) => {
    const url = new URL(request.url);
    
    // Allow localhost and test URLs through
    if (url.hostname === 'localhost' || url.hostname.includes('test')) {
      return;
    }
    
    console.warn(`Unmocked external POST request to: ${request.url}`);
    return HttpResponse.json(
      { success: true, message: 'Mock response for unmocked external API' },
      { status: 200 }
    );
  }),
];

// Specific handlers for different test scenarios
export const errorHandlers = [
  // Simulate network errors
  http.get('https://vw-dealer.dk/catalogs/error-test.pdf', () => {
    return HttpResponse.error();
  }),

  // Simulate server errors
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json(
      { error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } },
      { status: 429 }
    );
  }),

  // Simulate API key errors
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json(
      { error: { message: 'Invalid API key', type: 'authentication_error' } },
      { status: 401 }
    );
  }),
];

export default handlers;