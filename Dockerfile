FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm run build && mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV API_HOST=0.0.0.0 API_PORT=4000
EXPOSE 4000
CMD ["node", "server/start.mjs"]
