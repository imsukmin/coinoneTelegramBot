코인원 API를 이용한 코인원 거래정보를 조회 할수 있도록 만들어진 telegramBot입니다.

텔래그램에서 [@coinoneHelpBot](http://t.me/coinoneHelpBot)이라고 검색하면 사용해 보실 수 있습니다.

## 설치

``` bash
git clone https://github.com/imsukmin/coinoneTelegramBot.git
cd coinoneTelegramBot
npm install
cp config/index.sample.js config/index.js
# 아래의 추가과정 1 적용
node server.js

```

### 추가과정 1

#### Bot 생성하기

이 프로그램을 실행 해보기전에 Telegram 내의 @botfather를 이용하여 봇을 생성해야합니다.

- 탤레그램을 실행시키고 검색창에 `@botfather`라고 검색하면 봇파더를 찾을 수 있습니다. 

- 봇파더를 이용하여 봇을 생성하면 `Use this token to access the HTTP API:`라는 문구 아래 봇의 토큰이 있습니다.

#### Bot 적용하기

`config/index.js`에는 telegram bot token을 입력하는 부분이 있으며 해당하는 부분에 본인이 만든 bot token을 입력해야 해당 봇이 정상적으로 돌아갑니다.
