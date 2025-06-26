# Serena Setup for Leasingbørsen React

This document describes the Serena integration for semantic code analysis and editing capabilities in the Leasingbørsen React project.

## What is Serena?

Serena is an open-source coding agent toolkit by Oraios AI that provides semantic code retrieval and editing capabilities through the Model Context Protocol (MCP). It transforms LLMs into powerful coding assistants with IDE-like capabilities.

## Installation

### Prerequisites
- Python installed on your system
- uv package manager (for Python)

### Quick Start

1. **Install uv (if not already installed):**
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Run Serena for this project:**
   ```bash
   cd /home/hennedk/projects/leasingborsen/react-poc/leasingborsen-react-production
   uvx --from git+https://github.com/oraios/serena serena-mcp-server --project $(pwd)
   ```

## Project Configuration

The project is configured with the following Serena files:

### `.serena/project.yml`
- Configures TypeScript/JavaScript language servers
- Enables JSX/TSX support for React
- Sets up code analysis and editing tools
- Defines source paths and exclusions

### `.cursor/mcp.json`
- Configures Serena for VSCode/Cursor integration
- Enables automatic startup and restart on failure
- Sets up proper project context

## Usage with Claude Desktop

To use Serena with Claude Desktop, add this to your Claude configuration:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "serena-leasingborsen": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena-mcp-server",
        "--context",
        "ide-assistant",
        "--project",
        "/home/hennedk/projects/leasingborsen/react-poc/leasingborsen-react-production"
      ]
    }
  }
}
```

## Key Capabilities

### 1. Semantic Code Navigation
- Find React components by name or usage
- Navigate TypeScript interfaces and types
- Locate custom hooks and their implementations
- Find all usages of a component or function

### 2. Code Analysis
- Analyze component dependencies
- Review TypeScript type coverage
- Identify unused imports
- Check React best practices
- Understand component hierarchy

### 3. Code Editing
- Refactor components with semantic understanding
- Update TypeScript interfaces across the codebase
- Modify React hooks safely
- Edit configuration files with validation

### 4. Project Understanding
- Analyze overall project structure
- Map component relationships
- Review state management patterns
- Examine Supabase integrations

## Example Commands

When using Serena through Claude or other MCP clients:

### 🔍 Code Discovery
- "Show me all components that use the useListings hook"
- "Find all TypeScript interfaces related to car data"
- "Where is the price formatting function defined?"
- "Show all components that render car images"
- "Find all API error handling patterns"

### 📊 Architecture Analysis
- "Analyze the filter system architecture"
- "Show me the component hierarchy for the admin section"
- "Map the data flow from Supabase to ListingCard"
- "Which components depend on the filterStore?"
- "Analyze the routing structure and lazy loading setup"

### 🛠️ Refactoring Operations
- "Refactor all components to use the new Button variant"
- "Add React.memo to all list rendering components"
- "Update all price displays to use formatPrice utility"
- "Replace all direct Supabase calls with custom hooks"
- "Add proper TypeScript types to all component props"

### 🔧 Maintenance Tasks
- "Find all TODOs and FIXMEs in the codebase"
- "Identify components missing error boundaries"
- "Show all hardcoded strings that should be constants"
- "Find duplicate code patterns across components"
- "Identify unused imports and exports"

### 🚀 Performance Optimization
- "Find components that re-render too frequently"
- "Identify large components that should be split"
- "Show all images without lazy loading"
- "Find synchronous operations that could be async"
- "Analyze bundle size impact of each component"

## Practical Development Scenarios

### Scenario 1: Adding a New Feature
```
1. "Analyze how the current filter system works"
2. "Show me all filter-related components and their relationships"
3. "Where should I add a new color filter feature?"
4. "Update all relevant components to support color filtering"
```

### Scenario 2: Debugging an Issue
```
1. "Find all places where car prices are calculated"
2. "Show the data flow for pricing information"
3. "Identify where monthly_price could be null"
4. "Add null checks to all price displays"
```

### Scenario 3: Performance Optimization
```
1. "Find all components rendering large lists"
2. "Which components lack memoization?"
3. "Show me components with expensive computations"
4. "Add React.memo and useMemo where beneficial"
```

## Dashboard

Serena includes a web dashboard at `http://localhost:8080` (when running) that shows:
- Real-time operation logs
- Active analysis tasks
- Server status and controls

## Troubleshooting

### Common Issues

1. **Server won't start:**
   - Ensure Python and uv are installed
   - Check if port 8080 is available
   - Verify project path is correct

2. **TypeScript analysis not working:**
   - Ensure `tsconfig.json` exists
   - Check that node_modules are installed
   - Restart Serena server

3. **Slow performance:**
   - First startup indexes the codebase (can take a minute)
   - Subsequent runs use cached index
   - Large files (>10MB) are skipped by default

### Logs

Check Serena logs for debugging:
```bash
# Verbose logging
SERENA_LOG_LEVEL=DEBUG uvx --from git+https://github.com/oraios/serena serena-mcp-server --project $(pwd)
```

## Security Notes

- Serena has full read/write access to the project directory
- Set `read_only: true` in `.serena/project.yml` for analysis-only mode
- Never expose the Serena server port (8080) to the internet

## Links

- [Serena GitHub Repository](https://github.com/oraios/serena)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Oraios AI](https://oraios.com/)