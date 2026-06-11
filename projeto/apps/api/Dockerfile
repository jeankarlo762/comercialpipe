# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
RUN npm install
COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN npm run build --workspace=@commercialpipe/shared-types \
  && npm run build --workspace=@commercialpipe/api

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared-types ./packages/shared-types
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/server.js"]
