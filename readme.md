## 配置

```
{
  "dytt": {
    "entey": "https://www.dydytt.net/index2.htm"
  },
  "aria2": {
    "rpc": "http://<your-aria2-ip:port>/jsonrpc",
    "destDir": "/mnt/nas/video",
    "token": "<your-token>"
  }
}
```

注意，需要将aria2 配置里`<xxx>`内的部分替换成你自己的。

## 本地开发

首先新增配置文件`config/config.json`，内容如上。接着，安装依赖：
```bash
pnpm i
```
然后，启动调试即可。

本项目使用vscode 进行开发调试，调试前，先打开`src/index.ts`文件，然后按F5启动调试。

## 版本发布

github actions 自动化。另外，项目`demo`文件夹下，有一份基于 docker compose 的部署配置，使用方法如下：

``` bash
cd demo
docker compose up -d
```

注意，使用 docker compose 命令前，需要配置好相关环境。

## 部署

docker-compose

```
version: '3.5'

services:
  moviewfinder:
    image: ghcr.io/manooog/moviewfinder:latest
    container_name: moviewfinder
    cap_add:
      - SYS_ADMIN
    environment:
      - START_ON_ENTER=true
    volumes:
      - ./moviewfinder:/home/pptruser/app/config
```

docker

```
docker run \
-d \
--cap-add=SYS_ADMIN \
--name=moviewfinder \
-e START_ON_ENTER=true \
-v=./moviewfinder:/home/pptruser/app/config \
moviewfinder
```

## 备选电影网站

https://www.loldytt.com/Juqingdianying/SDDBW/
https://www.bt-tt.com/html/6/27763.html
