FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/schema/package.json packages/schema/
COPY packages/cli/package.json packages/cli/
COPY packages/registry/package.json packages/registry/

RUN npm install

COPY packages/schema/ packages/schema/
COPY packages/registry/ packages/registry/

RUN npm run build -w packages/schema
RUN npm run build -w packages/registry

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/schema/package.json packages/schema/
COPY --from=builder /app/packages/schema/dist packages/schema/dist
COPY --from=builder /app/packages/schema/src/*.json packages/schema/src/
COPY --from=builder /app/packages/registry/package.json packages/registry/
COPY --from=builder /app/packages/registry/dist packages/registry/dist

RUN npm install --omit=dev

EXPOSE 3000
WORKDIR /app/packages/registry
CMD ["node", "dist/index.js"]
