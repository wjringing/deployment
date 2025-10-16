import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

function loadEnvCorrect() {
  return {
    name: 'load-env-correct',
    config() {
      const envCorrectPath = path.resolve(process.cwd(), '.env.correct')

      if (fs.existsSync(envCorrectPath)) {
        const envContent = fs.readFileSync(envCorrectPath, 'utf-8')
        const envVars = {}

        envContent.split('\n').forEach(line => {
          const trimmedLine = line.trim()
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const [key, ...valueParts] = trimmedLine.split('=')
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').trim()
              envVars[`import.meta.env.${key.trim()}`] = JSON.stringify(value)
            }
          }
        })

        return {
          define: envVars
        }
      }

      return {}
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), loadEnvCorrect()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
