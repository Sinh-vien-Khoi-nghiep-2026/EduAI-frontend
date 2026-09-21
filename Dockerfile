FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock bunfig.toml tsconfig.json components.json ./
RUN bun install --production --frozen-lockfile

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000

USER bun
CMD ["bun", "run", "start"]