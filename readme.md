## 配置

```
{
  "dytt": {
    "entey": "https://www.dydytt.net/index2.htm"
  },
  "aria2": {
    "rpc": "http://192.168.3.2:6800/jsonrpc",
    "destDir": "/mnt/nas/video",
    "token": "your token"
  }
}
```


## Timeline
``` mermaid
graph LR;

a ---> b;

```


## 部署

docker-compose

```
  server-scripts:
    image: server-scripts
    cap_add:
      - SYS_ADMIN
    environment:
      - START_ON_ENTER: true
    volumes:
      - ./server-scripts/config:/home/pptruser/app/config
```

docker

```
docker run -e PGID=1000 -e PUID=1000 -e START_ON_ENTER=true server-scripts
```

## 备选电影网站

https://www.loldytt.com/Juqingdianying/SDDBW/
https://www.bt-tt.com/html/6/27763.html
