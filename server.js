const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for secrets
// Structure: Map<uuid, { content: string, expiresAt: timestamp }>
const secrets = new Map();

// Configuration
const SECRET_TTL_HOURS = 24;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Rate limiting - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', limiter);

// Serve static files
app.use(express.static('public'));

// Background cleanup job for expired secrets
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [id, secret] of secrets.entries()) {
    if (secret.expiresAt < now) {
      secrets.delete(id);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[Cleanup] Removed ${cleanedCount} expired secret(s). Active: ${secrets.size}`);
  }
}, CLEANUP_INTERVAL_MS);

// API Routes

/**
 * POST /api/secrets
 * Create a new secret
 * Body: { content: string }
 * Response: { id: string, url: string, expiresAt: timestamp }
 */
app.post('/api/secrets', (req, res) => {
  try {
    const { content } = req.body;
    
    // Validate input
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Secret content is required' });
    }
    
    if (content.length > 100000) { // 100KB limit
      return res.status(400).json({ error: 'Secret content is too large (max 100KB)' });
    }
    
    // Generate unique ID and expiration
    const id = uuidv4();
    const expiresAt = Date.now() + (SECRET_TTL_HOURS * 60 * 60 * 1000);
    
    // Store secret
    secrets.set(id, {
      content: content.trim(),
      expiresAt
    });
    
    console.log(`[Create] Secret created: ${id}, expires: ${new Date(expiresAt).toISOString()}, total: ${secrets.size}`);
    
    // Return URL
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const url = `${protocol}://${host}/?secret=${id}`;
    
    res.json({
      id,
      url,
      expiresAt,
      expiresIn: `${SECRET_TTL_HOURS} hours`
    });
    
  } catch (error) {
    console.error('[Create] Error:', error);
    res.status(500).json({ error: 'Failed to create secret' });
  }
});

/**
 * GET /api/secrets/:id
 * Retrieve a secret (one-time use, then destroyed)
 * Response: { content: string } or 404
 */
app.get('/api/secrets/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format (basic check)
    if (!id || id.length !== 36) {
      return res.status(404).json({ error: 'Secret not found or already accessed' });
    }
    
    // Retrieve secret
    const secret = secrets.get(id);
    
    if (!secret) {
      console.log(`[Read] Secret not found: ${id}`);
      return res.status(404).json({ error: 'Secret not found or already accessed' });
    }
    
    // Check expiration
    if (secret.expiresAt < Date.now()) {
      secrets.delete(id);
      console.log(`[Read] Secret expired: ${id}`);
      return res.status(404).json({ error: 'Secret has expired' });
    }
    
    // Delete immediately (one-time use)
    secrets.delete(id);
    console.log(`[Read] Secret accessed and destroyed: ${id}, remaining: ${secrets.size}`);
    
    // Return content
    res.json({
      content: secret.content
    });
    
  } catch (error) {
    console.error('[Read] Error:', error);
    res.status(500).json({ error: 'Failed to retrieve secret' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSecrets: secrets.size,
    uptime: process.uptime()
  });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server with optional HTTPS support
const startServer = () => {
  // Check for HTTPS certificates
  const useHTTPS = process.env.USE_HTTPS === 'true';
  const certPath = process.env.SSL_CERT_PATH;
  const keyPath = process.env.SSL_KEY_PATH;
  
  if (useHTTPS && certPath && keyPath) {
    try {
      const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      
      https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`🔒 WhisperLink HTTPS server running on https://localhost:${PORT}`);
        console.log(`📊 Secret TTL: ${SECRET_TTL_HOURS} hours`);
        console.log(`🛡️  Rate limit: 100 requests per 15 minutes`);
      });
    } catch (error) {
      console.error('Failed to start HTTPS server:', error.message);
      console.log('Falling back to HTTP...');
      startHTTPServer();
    }
  } else {
    startHTTPServer();
  }
};

const startHTTPServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 WhisperLink server running on http://localhost:${PORT}`);
    console.log(`📊 Secret TTL: ${SECRET_TTL_HOURS} hours`);
    console.log(`🛡️  Rate limit: 100 requests per 15 minutes`);
    console.log(`💡 Tip: For production, use HTTPS via reverse proxy (nginx/Caddy)`);
  });
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  secrets.clear();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  secrets.clear();
  process.exit(0);
});
