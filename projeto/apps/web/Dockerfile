# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/web/package.json apps/web/
RUN npm install
COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN npm run build --workspace=@commercialpipe/shared-types \
  && npm run build --workspace=@commercialpipe/web

FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
