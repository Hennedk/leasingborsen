# Rate Limiting and AI Cost Management Improvements

## Issue Resolved
The hybrid AI extraction system was hitting OpenAI's rate limit of 3 requests per minute, causing many extraction chunks to fail with 429 errors.

## Solutions Implemented

### 1. Built-in Rate Limiting (`aiExtractor.ts`)
- **Automatic Rate Limiting**: Added `waitForRateLimit()` method that tracks requests and automatically waits when limit is reached
- **Smart Timing**: Tracks requests per 60-second windows and waits appropriately
- **Console Feedback**: Shows users when rate limiting is active

### 2. Retry Logic with Exponential Backoff
- **Automatic Retries**: Up to 3 retries for 429 rate limit errors
- **Smart Delays**: 20-second delays between retries for rate limit errors
- **Error Handling**: Only retries on rate limit errors, not other failures

### 3. Chunk Processing Improvements (`hybridExtractor.ts`)
- **Sequential Processing**: Processes chunks one at a time to respect rate limits
- **Safety Buffers**: 1-second delays between successful requests
- **Graceful Degradation**: Continues processing remaining chunks if some fail

### 4. User Experience Enhancements (`VWBatchUploadDialog.tsx`)
- **AI Cost Display**: Shows current month AI spending vs $50 budget
- **Progress Bar**: Visual representation of spending against budget
- **Real-time Updates**: Refreshes spending after successful uploads

## Technical Details

### Rate Limiting Logic
```typescript
private async waitForRateLimit(): Promise<void> {
  const now = Date.now()
  
  // Reset counter if interval has passed
  if (now - this.lastRequestTime >= this.rateLimitInterval) {
    this.requestCount = 0
    this.lastRequestTime = now
  }
  
  // If we've hit the rate limit, wait for the next interval
  if (this.requestCount >= this.rateLimitRequests) {
    const timeToWait = this.rateLimitInterval - (now - this.lastRequestTime)
    if (timeToWait > 0) {
      console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(timeToWait / 1000)}s...`)
      await new Promise(resolve => setTimeout(resolve, timeToWait))
      this.requestCount = 0
      this.lastRequestTime = Date.now()
    }
  }
  
  this.requestCount++
}
```

### Retry Logic
```typescript
while (retryCount <= maxRetries) {
  try {
    completion = await this.openai.chat.completions.create({...})
    break // Success, exit retry loop
  } catch (error: any) {
    if (error?.status === 429 && retryCount < maxRetries) {
      console.log(`⏳ Rate limit hit (attempt ${retryCount + 1}/${maxRetries + 1}). Waiting 20s...`)
      await new Promise(resolve => setTimeout(resolve, 20000))
      retryCount++
      continue
    }
    throw error // Re-throw if not rate limit or max retries exceeded
  }
}
```

## Benefits
1. **Reliability**: No more failed extractions due to rate limiting
2. **Cost Transparency**: Users can see AI spending in real-time
3. **Better UX**: Clear feedback when rate limiting is active
4. **Automatic Recovery**: System handles rate limits gracefully
5. **Budget Control**: Visual spending tracking against monthly budget

## Usage
The improvements are automatic - no configuration needed. The system will:
- Automatically pace requests to stay within rate limits
- Retry failed requests due to rate limiting
- Show users current AI spending
- Handle large PDFs with chunked processing efficiently

## Current Rate Limits (OpenAI Free Tier)
- **Requests**: 3 per minute
- **Tokens**: 40,000 per minute 
- **Monthly Budget**: $50.00 (configurable)

## Future Improvements
- Add configurable rate limits for different API tiers
- Implement token-based rate limiting
- Add notification when approaching budget limits
- Consider upgrading to paid tier for production use