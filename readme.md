## 配置

```
{
  "dytt": {
    "entey": "https://www.dydytt.net/index2.htm"
  },
  "aria2": {
    "rpc": "http://<your-aria2-ip:port>/jsonrpc",
    "destDir": "/mnt/nas/video",
    "token": "your token"
  }
}
```

## 部署

docker-compose

```
version: '3.5'

services:
  moviewfinder:
    image: moviewfinder
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
