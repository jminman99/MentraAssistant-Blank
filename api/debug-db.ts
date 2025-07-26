
```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "./_lib/storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, error: "Query is required" });
    }

    // Basic safety check - only allow SELECT queries
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({ success: false, error: "Only SELECT queries are allowed" });
    }

    console.log("Debug query:", query);
    
    // Use the storage's database connection to run the query
    const result = await storage.db.execute(query);
    
    return res.status(200).json({ 
      success: true, 
      data: result.rows,
      rowCount: result.rows.length 
    });
    
  } catch (error: any) {
    console.error("Debug query error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
}
```
