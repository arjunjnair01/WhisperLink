# 🔒 WhisperLink

**Self-Destructing Secret Sharer**

A minimal, self-hosted web utility for sharing sensitive information through single-use, auto-destructing links. Share passwords, API keys, or private notes securely—they vanish after one view.

![WhisperLink](https://img.shields.io/badge/Security-First-%233b82f6?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)

---

## ✨ Features

- **🔥 One-Time View** - Secrets are destroyed immediately after being read once
- **⏱️ Auto-Expiration** - Unread secrets automatically delete after 24 hours
- **🚫 Zero Persistence** - Nothing saved to disk; all data stored in RAM only
- **🛡️ Rate Limited** - Protection against abuse (100 requests per 15 minutes per IP)
- **🎨 Beautiful UI** - Sleek dark theme with glassmorphism and gradient branding
- **🔒 Production Ready** - HTTPS support, security headers, and helmet protection
- **📱 Responsive** - Works seamlessly on desktop and mobile devices

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)

### Installation

1. **Clone or download this repository**
   ```bash
   cd wisperLink
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

That's it! 🎉 WhisperLink is now running locally.

---

## 🌐 Production Deployment

### Recommended: HTTPS via Reverse Proxy

For production deployment, use a reverse proxy (nginx or Caddy) to handle HTTPS/TLS.

#### Option 1: Using Nginx

1. **Install nginx**
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx
   ```

2. **Configure nginx** (`/etc/nginx/sites-available/whisperlink`)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable site and get SSL certificate**
   ```bash
   sudo ln -s /etc/nginx/sites-available/whisperlink /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   sudo certbot --nginx -d your-domain.com
   ```

4. **Run WhisperLink as a service** (systemd)
   Create `/etc/systemd/system/whisperlink.service`:
   ```ini
   [Unit]
   Description=WhisperLink Secret Sharer
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/path/to/wisperLink
   ExecStart=/usr/bin/node server.js
   Restart=always
   Environment=NODE_ENV=production
   Environment=PORT=3000

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start:
   ```bash
   sudo systemctl enable whisperlink
   sudo systemctl start whisperlink
   sudo systemctl status whisperlink
   ```

#### Option 2: Using Caddy (Recommended for Simplicity)

1. **Install Caddy**
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

2. **Configure Caddy** (`/etc/caddy/Caddyfile`)
   ```
   your-domain.com {
       reverse_proxy localhost:3000
   }
   ```

3. **Reload Caddy**
   ```bash
   sudo systemctl reload caddy
   ```

Caddy automatically handles HTTPS certificates via Let's Encrypt! 🎉

---

### Alternative: Direct HTTPS (Not Recommended for Production)

If you prefer to run HTTPS directly from Node.js:

1. **Obtain SSL certificates** (e.g., from Let's Encrypt)

2. **Set environment variables**
   ```bash
   export USE_HTTPS=true
   export SSL_CERT_PATH=/path/to/fullchain.pem
   export SSL_KEY_PATH=/path/to/privkey.pem
   ```

3. **Start the server**
   ```bash
   npm start
   ```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `USE_HTTPS` | Enable direct HTTPS | `false` |
| `SSL_CERT_PATH` | Path to SSL certificate | - |
| `SSL_KEY_PATH` | Path to SSL private key | - |

### Customization

**Secret TTL (Time-to-Live)**: Edit `server.js` line 14
```javascript
const SECRET_TTL_HOURS = 24; // Change to your preferred hours
```

**Rate Limiting**: Edit `server.js` line 36
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  // ...
});
```

**Max Secret Size**: Edit `server.js` line 78
```javascript
if (content.length > 100000) { // 100KB limit
```

---

## 🎨 UI Preview

WhisperLink features a stunning dark UI with:
- **Gradient text branding** (blue to emerald)
- **Glassmorphism effects** with backdrop blur
- **Smooth animations** and hover transitions
- **Color-coded views** (green for success, yellow for warnings, red for errors)
- **Fully responsive** design for all screen sizes

---

## 🔒 Security Considerations

### What WhisperLink Does

✅ Stores secrets only in RAM (never on disk)  
✅ Destroys secrets after first view  
✅ Auto-expires secrets after 24 hours  
✅ Rate limits requests to prevent abuse  
✅ Includes security headers (Helmet.js)  
✅ Validates input and prevents oversized payloads  

### What You Should Do

⚠️ **Always use HTTPS in production** (via reverse proxy)  
⚠️ **Deploy in a trusted network** or with proper firewall rules  
⚠️ **Monitor server logs** for suspicious activity  
⚠️ **Keep Node.js and dependencies updated**  
⚠️ **Consider additional authentication** for very sensitive environments  

### Limitations

- Secrets stored in **RAM** are lost on server restart
- **No authentication** by default—anyone with the link can access
- **Not encrypted at rest** (RAM storage only)
- Rate limiting is **per IP** (can be bypassed with VPNs/proxies)

---

## 📊 API Reference

### Create Secret

```http
POST /api/secrets
Content-Type: application/json

{
  "content": "Your secret text here"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://your-domain.com/?secret=550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": 1700000000000,
  "expiresIn": "24 hours"
}
```

### Retrieve Secret

```http
GET /api/secrets/:id
```

**Response (Success):**
```json
{
  "content": "Your secret text here"
}
```

**Response (Error):**
```json
{
  "error": "Secret not found or already accessed"
}
```

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "activeSecrets": 5,
  "uptime": 12345.67
}
```

---

## 🛠️ Development

### Project Structure

```
wisperLink/
├── server.js           # Express server with API routes
├── package.json        # Dependencies and scripts
├── public/
│   ├── index.html      # Main HTML structure
│   ├── styles.css      # Dark theme styles with glassmorphism
│   └── app.js          # Client-side JavaScript
└── README.md           # This file
```

### Running in Development

```bash
npm run dev
```

### Testing

1. **Create a secret** at `http://localhost:3000`
2. **Copy the generated link**
3. **Open link in a new tab** (secret should display)
4. **Refresh the page** (should show 404 error)
5. **Test rate limiting** by making 100+ rapid requests

---

## 📝 License

MIT License - feel free to use this for personal or commercial projects!

---

## 🙏 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

## 💡 Tips

- Use **keyboard shortcuts**: `Ctrl/Cmd + Enter` to create secret, `Esc` to go back
- Click on the generated link to **auto-select** for easy copying
- Secrets are **case-sensitive** and preserve formatting
- The UI automatically **counts characters** as you type

---

## 🚨 Troubleshooting

**Server won't start:**
- Check if port 3000 is already in use: `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)
- Try a different port: `PORT=8080 npm start`

**HTTPS not working:**
- Verify certificate paths are correct
- Check file permissions on certificates
- Use reverse proxy instead (recommended)

**Rate limiting too strict:**
- Adjust limits in `server.js` (line 36)
- Consider using Redis for distributed rate limiting

---

 
🔒 **Remember:** WhisperLink is designed for convenience, not for storing state secrets. Always follow your organization's security policies.
