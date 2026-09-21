FROM oven/bun:1.3.14

WORKDIR /app

COPY package.json bun.lock bunfig.toml tsconfig.json components.json ./
RUN bun install --production --frozen-lockfile

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8081
EXPOSE 8081

USER bun
CMD ["bun", "run", "start"]