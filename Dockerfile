# 作为存储依赖的容器
FROM node:16-bullseye-slim as pre

WORKDIR /app

# 安装pnpm
RUN apt-get update && apt-get install -y curl
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY pnpm-lock.yaml package.json .npmrc ./
RUN pnpm fetch

# 构建容器
FROM pre as build

COPY . .

RUN pnpm i

# /app/out
RUN pnpm build

# 移除测试环境的依赖，减少体积
RUN pnpm prune --prod

FROM pre as puppeteer

RUN \
  apt-get install \
  fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf libxss1 \
  chromium -y --no-install-recommends

RUN rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# 实际上代码运行的环境
# FROM ghcr.io/puppeteer/puppeteer:19.3.0
FROM puppeteer

ENV TZ="Asia/Shanghai"

WORKDIR /home/node/app

# RUN apt-get update && apt-get install -y vim

USER node

ENV NODE_ENV=production

# 本地打包好
# https://stackoverflow.com/questions/44766665/how-do-i-docker-copy-as-non-root
COPY --chown=node:node pnpm-lock.yaml package.json ./
COPY --from=build --chown=node:node /app/out/ ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules

CMD ["node", "index.js"]
# CMD ["tail", "-f", "/dev/null"]
