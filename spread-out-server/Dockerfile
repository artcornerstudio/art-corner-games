# Spread Out! server image. Build from the repository root:
#   docker build -f spread-out-server/Dockerfile .
# or straight from GitHub (what deploy/docker-compose.yml does):
#   docker build -f spread-out-server/Dockerfile https://github.com/artcornerstudio/art-corner-games.git#main
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DB_PATH=/data/purchases.sqlite \
    JWT_SECRET_FILE=/data/jwt_secret

WORKDIR /app/spread-out-server
COPY spread-out-server/package.json spread-out-server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY spread-out/ /app/spread-out/
COPY spread-out-server/ /app/spread-out-server/

# The purchase database and the signing secret live here (a named volume).
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --start-interval=2s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/me',{headers:{'x-forwarded-proto':'https'}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "--no-warnings=ExperimentalWarning", "server.js"]
