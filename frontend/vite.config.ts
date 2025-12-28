import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

// serve admin files placed under `public/admin`
const adminDir = fileURLToPath(new URL('./public/admin', import.meta.url))

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
}

function serveAdminPlugin(): Plugin {
  return {
    name: 'serve-admin-directory',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/admin', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url) return next()

        // Redirect bare /admin or /admin/ to the login page
        if (req.url === '/' || req.url === '') {
          res.statusCode = 302
          res.setHeader('Location', '/admin/login.html')
          res.end()
          return
        }

        let relativePath = req.url === '/' ? '/login.html' : req.url
        // remove query params
        const [cleanPath] = relativePath.split('?')
        relativePath = cleanPath

        const targetPath = path.join(adminDir, relativePath)
        if (!targetPath.startsWith(adminDir)) {
          return next()
        }

        let filePath = targetPath
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html')
        }

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next()
        }

        const ext = path.extname(filePath)
        const contentType = mimeTypes[ext] ?? 'application/octet-stream'
        res.setHeader('Content-Type', contentType)
        fs.createReadStream(filePath).pipe(res)
      })
    },
    writeBundle() {
      const distAdmin = fileURLToPath(new URL('./dist/admin', import.meta.url))
      copyDir(adminDir, distAdmin)
    },
  }
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveAdminPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/qr': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/scanner': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@providers': fileURLToPath(new URL('./src/providers', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },
})
