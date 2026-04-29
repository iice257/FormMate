FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
ENV VITE_DEV_HOST=0.0.0.0
ENV FORMMATE_API_BIND_HOST=0.0.0.0
COPY . .
EXPOSE 5173 3000
CMD ["npm", "run", "dev:stack"]

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV FORMMATE_DOCKER_HOST=0.0.0.0
ENV FORMMATE_DOCKER_PORT=8080
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY api ./api
COPY scripts ./scripts
EXPOSE 8080
CMD ["npm", "run", "start:docker"]
