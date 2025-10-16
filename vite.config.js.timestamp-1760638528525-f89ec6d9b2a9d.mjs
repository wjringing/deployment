// vite.config.js
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///home/project/node_modules/@tailwindcss/vite/dist/index.mjs";
import fs from "fs";
import path from "path";
function loadEnvCorrect() {
  return {
    name: "load-env-correct",
    config() {
      const envCorrectPath = path.resolve(process.cwd(), ".env.correct");
      if (fs.existsSync(envCorrectPath)) {
        const envContent = fs.readFileSync(envCorrectPath, "utf-8");
        const envVars = {};
        envContent.split("\n").forEach((line) => {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith("#")) {
            const [key, ...valueParts] = trimmedLine.split("=");
            if (key && valueParts.length > 0) {
              const value = valueParts.join("=").trim();
              envVars[`import.meta.env.${key.trim()}`] = JSON.stringify(value);
            }
          }
        });
        return {
          define: envVars
        };
      }
      return {};
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss(), loadEnvCorrect()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    hmr: true
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: void 0
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJ1xuaW1wb3J0IGZzIGZyb20gJ2ZzJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcblxuZnVuY3Rpb24gbG9hZEVudkNvcnJlY3QoKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2xvYWQtZW52LWNvcnJlY3QnLFxuICAgIGNvbmZpZygpIHtcbiAgICAgIGNvbnN0IGVudkNvcnJlY3RQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuZW52LmNvcnJlY3QnKVxuXG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhlbnZDb3JyZWN0UGF0aCkpIHtcbiAgICAgICAgY29uc3QgZW52Q29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhlbnZDb3JyZWN0UGF0aCwgJ3V0Zi04JylcbiAgICAgICAgY29uc3QgZW52VmFycyA9IHt9XG5cbiAgICAgICAgZW52Q29udGVudC5zcGxpdCgnXFxuJykuZm9yRWFjaChsaW5lID0+IHtcbiAgICAgICAgICBjb25zdCB0cmltbWVkTGluZSA9IGxpbmUudHJpbSgpXG4gICAgICAgICAgaWYgKHRyaW1tZWRMaW5lICYmICF0cmltbWVkTGluZS5zdGFydHNXaXRoKCcjJykpIHtcbiAgICAgICAgICAgIGNvbnN0IFtrZXksIC4uLnZhbHVlUGFydHNdID0gdHJpbW1lZExpbmUuc3BsaXQoJz0nKVxuICAgICAgICAgICAgaWYgKGtleSAmJiB2YWx1ZVBhcnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSB2YWx1ZVBhcnRzLmpvaW4oJz0nKS50cmltKClcbiAgICAgICAgICAgICAgZW52VmFyc1tgaW1wb3J0Lm1ldGEuZW52LiR7a2V5LnRyaW0oKX1gXSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGRlZmluZTogZW52VmFyc1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7fVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKSwgbG9hZEVudkNvcnJlY3QoKV0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICBwb3J0OiA1MTczLFxuICAgIGhtcjogdHJ1ZVxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIGFzc2V0c0RpcjogJ2Fzc2V0cycsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczogdW5kZWZpbmVkXG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBRWpCLFNBQVMsaUJBQWlCO0FBQ3hCLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFNBQVM7QUFDUCxZQUFNLGlCQUFpQixLQUFLLFFBQVEsUUFBUSxJQUFJLEdBQUcsY0FBYztBQUVqRSxVQUFJLEdBQUcsV0FBVyxjQUFjLEdBQUc7QUFDakMsY0FBTSxhQUFhLEdBQUcsYUFBYSxnQkFBZ0IsT0FBTztBQUMxRCxjQUFNLFVBQVUsQ0FBQztBQUVqQixtQkFBVyxNQUFNLElBQUksRUFBRSxRQUFRLFVBQVE7QUFDckMsZ0JBQU0sY0FBYyxLQUFLLEtBQUs7QUFDOUIsY0FBSSxlQUFlLENBQUMsWUFBWSxXQUFXLEdBQUcsR0FBRztBQUMvQyxrQkFBTSxDQUFDLEtBQUssR0FBRyxVQUFVLElBQUksWUFBWSxNQUFNLEdBQUc7QUFDbEQsZ0JBQUksT0FBTyxXQUFXLFNBQVMsR0FBRztBQUNoQyxvQkFBTSxRQUFRLFdBQVcsS0FBSyxHQUFHLEVBQUUsS0FBSztBQUN4QyxzQkFBUSxtQkFBbUIsSUFBSSxLQUFLLENBQUMsRUFBRSxJQUFJLEtBQUssVUFBVSxLQUFLO0FBQUEsWUFDakU7QUFBQSxVQUNGO0FBQUEsUUFDRixDQUFDO0FBRUQsZUFBTztBQUFBLFVBQ0wsUUFBUTtBQUFBLFFBQ1Y7QUFBQSxNQUNGO0FBRUEsYUFBTyxDQUFDO0FBQUEsSUFDVjtBQUFBLEVBQ0Y7QUFDRjtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBWSxHQUFHLGVBQWUsQ0FBQztBQUFBLEVBQ2xELFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLEtBQUs7QUFBQSxFQUNQO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
