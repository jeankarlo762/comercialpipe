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
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/apps/api/create-admin.mjs ./apps/api/create-admin.mjs
COPY --from=build /app/apps/api/seed-forms.mjs ./apps/api/seed-forms.mjs
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["sh", "-c", "node dist/shared/database/migrate.js && node create-admin.mjs && node seed-forms.mjs && node dist/server.js"]
