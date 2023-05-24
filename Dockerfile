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

# 实际上代码运行的环境
FROM ghcr.io/puppeteer/puppeteer:19.3.0

ENV TZ="Asia/Shanghai"

WORKDIR /home/pptruser/app

USER root

# 安装vim 便于 debugger
RUN apt-get update && apt-get install -y vim

USER node

#这里是为了将容器内已存在的chromium配置进行声明
ENV PUPPETEER_CACHE_DIR=/home/pptruser/.cache/puppeteer
ENV PUPPETEER_CHROMIUM_REVISION=1056772

# 本地打包好
# copy 过去后的文件属于 root 用户，得改成当前
# https://stackoverflow.com/questions/44766665/how-do-i-docker-copy-as-non-root
COPY --chown=node:node pnpm-lock.yaml package.json ./
COPY --from=build --chown=node:node /app/out/ ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules

CMD ["node", "src/index.js"]
