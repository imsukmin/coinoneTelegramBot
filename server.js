var TelegramBot = require('node-telegram-bot-api'),
    Coinone = require('coinone-api'),
    coinone = new Coinone(), // public API only
    fs = require('fs'),
    axios = require('axios')

var config = require('./config')

// polyfill
Number.isInteger = Number.isInteger || function(value) {
  return typeof value === "number" && 
         isFinite(value) && 
         Math.floor(value) === value
}

if (!Array.isArray) {
  Array.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

// const
const ALARMLISTPATH = 'data/alarmList.json'
const ALARMLISTDEFAULTPATH = 'data/alarmList.default.json'
const APIINFOLISTPATH = 'data/apiInfo.json'
const APIINFOLISTDEFAULTPATH = 'data/apiInfo.default.json'
const PERSONAL_API_OBJECT = {}

// Create a bot that uses 'polling' to fetch new updates
var bot = new TelegramBot(config.token, { polling: true })

class Currency {
  constructor(now, before) {
    this._now = now
    this._before = before
  }
  set now(newData) {
    this._now = newData
  }
  set before(newData) {
    this._before = newData
  }
  get now() {
    return this._now
  }
  get before() {
    return this._before
  }
  get deltaPrice () {
    return (this._now - this._before)
  }
  get deltaRate () {
    return (this._now - this._before) / this._before * 100
  }
  get isUp() {
    return (this._now - this._before) > 0
  }
}

// global list
const currencys = {
  btc: new Currency(0, 0),
  bch: new Currency(0, 0),
  btg: new Currency(0, 0),
  eth: new Currency(0, 0),
  etc: new Currency(0, 0),
  xrp: new Currency(0, 0),
  qtum: new Currency(0, 0),
  ltc: new Currency(0, 0),
  iota: new Currency(0, 0),
  omg: new Currency(0, 0),
  eos: new Currency(0, 0),
  data: new Currency(0, 0),
  zil: new Currency(0, 0),
  update: (apiData) => {
    currencys.btc.now = parseInt(apiData.btc.last)
    currencys.btc.before = parseInt(apiData.btc.yesterday_last)
    currencys.bch.now = parseInt(apiData.bch.last)
    currencys.bch.before = parseInt(apiData.bch.yesterday_last)
    currencys.btg.now = parseInt(apiData.btg.last)
    currencys.btg.before = parseInt(apiData.btg.yesterday_last)
    currencys.eth.now = parseInt(apiData.eth.last)
    currencys.eth.before = parseInt(apiData.eth.yesterday_last)
    currencys.etc.now = parseInt(apiData.etc.last)
    currencys.etc.before = parseInt(apiData.etc.yesterday_last)
    currencys.xrp.now = parseInt(apiData.xrp.last)
    currencys.xrp.before = parseInt(apiData.xrp.yesterday_last)
    currencys.qtum.now = parseInt(apiData.qtum.last)
    currencys.qtum.before = parseInt(apiData.qtum.yesterday_last)
    currencys.ltc.now = parseInt(apiData.ltc.last)
    currencys.ltc.before = parseInt(apiData.ltc.yesterday_last)
    currencys.iota.now = parseInt(apiData.iota.last)
    currencys.iota.before = parseInt(apiData.iota.yesterday_last)
    currencys.omg.now = parseInt(apiData.omg.last)
    currencys.omg.before = parseInt(apiData.omg.yesterday_last)
    currencys.eos.now = parseInt(apiData.eos.last)
    currencys.eos.before = parseInt(apiData.eos.yesterday_last)
    currencys.data.now = parseInt(apiData.data.last)
    currencys.data.before = parseInt(apiData.data.yesterday_last)
    currencys.zil.now = parseInt(apiData.zil.last)
    currencys.zil.before = parseInt(apiData.zil.yesterday_last)
  }
}

var nowCurrency = {
  btc: 0,
  bch: 0,
  btg: 0,
  eth: 0,
  etc: 0,
  xrp: 0,
  qtum: 0,
  ltc: 0,
  iota: 0,
  omg: 0,
  eos: 0,
  data: 0,
  zil: 0,
  init: function () {
    coinone.ticker('all')
    .then(function (response) {
      if (response === undefined || response.status !== 200) {
        // do Nothing
      } else {
        nowCurrency.btc = response.data.btc.last
        nowCurrency.bch = response.data.bch.last
        nowCurrency.btg = response.data.btg.last
        nowCurrency.eth = response.data.eth.last
        nowCurrency.etc = response.data.etc.last
        nowCurrency.xrp = response.data.xrp.last
        nowCurrency.qtum = response.data.qtum.last
        nowCurrency.ltc = response.data.ltc.last
        nowCurrency.iota = response.data.iota.last
        nowCurrency.omg = response.data.omg.last
        nowCurrency.eos = response.data.eos.last
        nowCurrency.data = response.data.data.last
        nowCurrency.zil = response.data.zil.last
        
        currencys.update(response.data)
      }
    })
    .catch(function (error) {
      console.log('[nowCurrency.init]', error);
    })
  }
}
nowCurrency.init()

var beforeCurrency = {
  btc: 0,
  bch: 0,
  btg: 0,
  eth: 0,
  etc: 0,
  xrp: 0,
  qtum: 0,
  ltc: 0,
  iota: 0,
  omg: 0,
  eos: 0,
  data: 0,
  zil: 0
}

var isServerGood = true
var serverErrorCounter = 0
var isSendServerErrorStatus = false
var serverStatusVariableReset = function () {
  isServerGood = true
  serverErrorCounter = 0
  isSendServerErrorStatus = false
}

// util
const isCurrency = function (c) {
  // console.log('isCurrency', c)
  return /^(btc|btg|bch|eth|etc|xrp|qtum|ltc|iota|omg|eos|data|zil)$/.test(c)
}

const changeCoinNameKoreanToEnglish = function (coinName) {
  return coinName.replace('비트', 'btc').replace('비캐', 'bch').replace('비골', 'btg')
                 .replace('이더', 'eth').replace('이클', 'etc').replace('리플', 'xrp')
                 .replace('퀀텀', 'qtum').replace('라코', 'ltc').replace('아이오타', 'iota')
                 .replace('오미세고', 'omg').replace('이오스', 'eos').replace('데이타', 'data')
                 .replace('질리카', 'zil')
}

// const serializeObject = function (object) {
//   if (isEmpty(object)) {
//     return ''
//   }
//
//   var data = [];
//   for(var p in object) {
//     if (object.hasOwnProperty(p)) {
//       data.push(encodeURIComponent(p) + "=" + encodeURIComponent(object[p]))
//     }
//   }
//   return '?' + data.join("&");
// }

// const isEmpty = function (obj) {
//     return Object.keys(obj).length === 0;
// }

// const searchInArray = function (element, targetArray) {
//   var indices = []
//   var idx = targetArray.indexOf(element);
//   while (idx != -1) {
//     indices.push(idx)
//     idx = targetArray.indexOf(element, idx + 1)
//   }
//   return indices
// }

// input listener object seem like 'alarmList[coin][price].push(chatID)'
var alarmList
// for attend info data
if(fs.existsSync(ALARMLISTPATH)){
  alarmList = JSON.parse(fs.readFileSync(ALARMLISTPATH, 'utf8'))
} else {
  alarmList = JSON.parse(fs.readFileSync(ALARMLISTDEFAULTPATH, 'utf8'))
}

var apiInfoList
// for attend info data
if(fs.existsSync(APIINFOLISTPATH)){
  apiInfoList = JSON.parse(fs.readFileSync(APIINFOLISTPATH, 'utf8'))
} else {
  apiInfoList = JSON.parse(fs.readFileSync(APIINFOLISTDEFAULTPATH, 'utf8'))
}

// setting personal API Object when init
for (var index in apiInfoList) {
  PERSONAL_API_OBJECT[index] = new Coinone(apiInfoList[index].token, apiInfoList[index].key)
}

const coinoneCurrency = function () {
  coinone.ticker('all')
  .then(function (response) {
    if(response === undefined || response.status !== 200) {
      if (isServerGood) {
        isServerGood = false
        console.log('!==API ERROR==!')
        bot.sendMessage(config.adminAccountID, '[coinoneCurrency] ticker is block!')
      } else {
        if (serverErrorCounter > 60) {
          isServerGood = true
          serverErrorCounter = 0
        }
        serverErrorCounter += 1
      }
      return
    }
    if (!isServerGood) {
      serverStatusVariableReset()
      bot.sendMessage(config.adminAccountID, '[coinoneCurrency] Server status is now OK')
    }

    var data = response.data
    for (var coin in alarmList) {
      for (var price in alarmList[coin]) {
        for (var i in alarmList[coin][price]) {
          var chatID = alarmList[coin][price][i]
          if ((nowCurrency[coin] >= price && data[coin].last <= price) || 
              (nowCurrency[coin] <= price && data[coin].last >= price)) {
            bot.sendMessage(chatID, '[!ALARM!]: ' + coin + ' currency is ' + data[coin].last)
            alarmList[coin][price].splice(i, 1)
            if (alarmList[coin][price].length === 0) {
              alarmList[coin][price] = undefined
            }
            fs.writeFile(ALARMLISTPATH, JSON.stringify(alarmList), (err) => {
              if (err) throw err
              console.log('The file ' + ALARMLISTPATH + ' has been saved!')
            })
          }
        }
      }
    }

    currencys.update(data)

    nowCurrency.btc = data.btc.last
    nowCurrency.bch = data.bch.last
    nowCurrency.btg = data.btg.last
    nowCurrency.eth = data.eth.last
    nowCurrency.etc = data.etc.last
    nowCurrency.xrp = data.xrp.last
    nowCurrency.qtum = data.qtum.last
    nowCurrency.ltc = data.ltc.last
    nowCurrency.iota = data.iota.last
    nowCurrency.omg = data.omg.last
    nowCurrency.eos = data.eos.last
    nowCurrency.data = data.data.last
    nowCurrency.zil = data.zil.last

    beforeCurrency.btc = data.btc.yesterday_last
    beforeCurrency.bch = data.bch.yesterday_last
    beforeCurrency.btg = data.btg.yesterday_last
    beforeCurrency.eth = data.eth.yesterday_last
    beforeCurrency.etc = data.etc.yesterday_last
    beforeCurrency.xrp = data.xrp.yesterday_last
    beforeCurrency.qtum = data.qtum.yesterday_last
    beforeCurrency.ltc = data.ltc.yesterday_last
    beforeCurrency.iota = data.iota.yesterday_last
    beforeCurrency.omg = data.omg.yesterday_last
    beforeCurrency.eos = data.eos.yesterday_last
    // console.log(data.result, JSON.stringify(alarmList))
  })
  .catch(function (error) {
    console.log('[coinoneCurrency]', error)
    // bot.sendMessage(config.adminAccountID, '[coinoneCurrency] ticker is error!')
  })
}

const coinoneRecentCompletedOrders = function (currency, chatID) {
  if(!isCurrency(currency)) {
    console.warn('coinoneRecentCompletedOrders: currency type is NOT correct! [ currency: ' + currency + ']')
    currency = 'btc'
  }
  coinone.recentCompleteOrders(currency)
  .then(function (response) {
    var recentCount = 10
    var data = response.data
    var tradeList = data.completeOrders
    var recentTradeList = tradeList.splice(tradeList.length - recentCount, recentCount)
    var sendMessageText = ''
    for (var key in recentTradeList) {
      sendMessageText += ( 'price: ' + recentTradeList[key].price + ', qty: ' + recentTradeList[key].qty + '\n' )
    }
    bot.sendMessage(chatID, sendMessageText)
  })
  .catch(function (error) {
    console.log('[coinoneRecentCompletedOrders]', error);
  })
}

const coinoneCurrentOrders = function (currency, chatID) {
  if (!isCurrency(currency)) {
    console.warn('coinoneCurrentOrders: currency type is NOT correct! [ currency: ' + currency + ']')
    currency = 'btc'
  }
  coinone.orderbook(currency)
  .then(function (response) {
    var recentCount = 10
    var data = response.data
    var getBuyerList = data.bid
    var getSellerList = data.ask
    var buyerList = getBuyerList.splice(0, recentCount)
    var sellerList = getSellerList.splice(0, recentCount)
    var sendMessageText = '--------------------[SELLER]\n'
    for (var i = sellerList.length - 1; i >= 0; i--) {
      sendMessageText += ( 'price: ' + sellerList[i].price + ', qty: ' + sellerList[i].qty + '\n' )
    }
    sendMessageText += '--------------------[BUYER]\n'
    for (var i = 0; i < buyerList.length; i++) {
      sendMessageText += ( 'price: ' + buyerList[i].price + ', qty: ' + buyerList[i].qty + '\n' )
    }

    // console.log(sendMessageText)
    bot.sendMessage(chatID, sendMessageText)
  })
  .catch(function (error) {
    console.log('[coinoneCurrentOrders]', error);
  })
}

const registerAlarm = function (message, chatID) {
  var messageArray = message.split(' ')
  if(messageArray.length !== 3) {
    console.warn('registerAlarm: format is not correct [ message: ' + message + ']')
    return false
  }
  var coin = changeCoinNameKoreanToEnglish(messageArray[1])
  var price = parseInt(messageArray[2])

  if (isCurrency(coin)) {
    console.warn('registerAlarm: coin is NOT correct! [ coin: ' + coin + ']')
    return false
  }

  if (!price) {
    console.warn('registerAlarm: price is NOT Number! [ price: ' + messageArray[2] + ']')
    return false
  }

  if(!Array.isArray(alarmList[coin][price])){
    alarmList[coin][price] = []
  }
  alarmList[coin][price].push(chatID)
  fs.writeFile(ALARMLISTPATH, JSON.stringify(alarmList), (err) => {
    if (err) {
      throw err
    }
    console.log('The file ' + ALARMLISTPATH + ' has been saved!')
  })
  return true
}

const searchInAlarmList = function (chatID) {
  var resultText = '< My Alarm List >\n'
  for (var coin in alarmList) {
    resultText += '-----[' + coin.toUpperCase() + ']-------------------------\n['
    for (var price in alarmList[coin]) {
      if (alarmList[coin][price] && alarmList[coin][price].indexOf(parseInt(chatID)) >= 0) {
        resultText += price + ', '
      }
    }
    if (resultText.indexOf(',') >= 0) {
      resultText = resultText.slice(0, -2)
      resultText += ']\n'
    } else {
      resultText = resultText.slice(0, -1)
    }
  }
  return resultText
}

const deleteAlarmFromAlarmList = function (message, chatID) {
  var messageArray = message.split(' ')
  if(messageArray.length !== 3) {
    console.warn('deleteAlarmFromAlarmList: format is not correct [ message: ' + message + ']')
    return 'format'
  }
  var coin = changeCoinNameKoreanToEnglish(messageArray[1])
  var price = parseInt(messageArray[2])

  if (isCurrency(coin)) {
    console.warn('deleteAlarmFromAlarmList: coin is NOT correct! [ coin: ' + coin + ']')
    return 'coin'
  }

  if (!price) {
    console.warn('deleteAlarmFromAlarmList: price is NOT Number! [ price: ' + messageArray[2] + ']')
    return 'price'
  }


  var chatIDindex = -1
  if (alarmList[coin][price]) {
    chatIDindex = alarmList[coin][price].indexOf(parseInt(chatID))
  }
  if (chatIDindex >= 0) {
    alarmList[coin][price].splice(chatIDindex, 1)
    if (alarmList[coin][price].length === 0) {
      alarmList[coin][price] = undefined
    }
    fs.writeFile(ALARMLISTPATH, JSON.stringify(alarmList), (err) => {
      if (err) {
        throw err
      }
      console.log('The file ' + ALARMLISTPATH + ' has been saved!')
    })
    return true
  } else {
    return 'not found'
  }
}

const registerAPIkey = function (message, chatID) {
  var messageArray = message.split(' ')
  console.log(message, messageArray)
  if(messageArray.length !== 3) {
    console.warn('registerAPIkey: format is not correct [ message: ' + message + ']')
    return false
  }
  var key = messageArray[1]
  var token = messageArray[2]

  if (apiInfoList[chatID] === undefined) {
    apiInfoList[chatID] = {}
  }

  apiInfoList[chatID]['key'] = key
  apiInfoList[chatID]['token'] = token
  
  PERSONAL_API_OBJECT[chatID] = new Coinone(token, key) // with personal API

  fs.writeFile(APIINFOLISTPATH, JSON.stringify(apiInfoList), (err) => {
    if (err) {
      throw err
    }
    console.log('The file ' + APIINFOLISTPATH + ' has been saved!')
  })
  return true
}

const showMyAccountInfo = function (chatID, isOnlyShowTotal) {
  var resultText = '< MY ACCOUNT INFO >\n'
  
  PERSONAL_API_OBJECT[chatID].balance().then(function (response) {
    var data = response.data
    var totalBalance = (parseInt(data.krw.balance) 
    + parseInt(data.btc.balance) * parseFloat(nowCurrency.btc)
    + parseInt(data.bch.balance) * parseFloat(nowCurrency.bch)
    // + parseInt(data.btg.balance) * parseFloat(nowCurrency.btg) // can not use btg checked at 20171215
    + parseInt(data.eth.balance) * parseFloat(nowCurrency.eth)
    + parseInt(data.etc.balance) * parseFloat(nowCurrency.etc)
    + parseInt(data.xrp.balance) * parseFloat(nowCurrency.xrp)
    + parseInt(data.qtum.balance) * parseFloat(nowCurrency.qtum)
    + parseInt(data.ltc.balance) * parseFloat(nowCurrency.ltc)
    + parseInt(data.iota.balance) * parseFloat(nowCurrency.iota)
    + parseInt(data.omg.balance) * parseFloat(nowCurrency.omg)
    + parseInt(data.eos.balance) * parseFloat(nowCurrency.eos)
    + parseInt(data.eos.balance) * parseFloat(nowCurrency.data)
    + parseInt(data.eos.balance) * parseFloat(nowCurrency.zil))
    resultText += 'Your total balance : ₩'  + parseInt(totalBalance).toLocaleString()  + '\n'
    if(!isOnlyShowTotal) {
      resultText += '[BTC]     ₩' + parseInt(data.btc.balance * currencys.btc.now).toLocaleString() + ' / ' 
                              + data.btc.balance + '\n'
      resultText += '[BCH]    ₩' + parseInt(data.bch.balance * currencys.bch.now).toLocaleString() + ' / ' 
                              + data.bch.balance + '\n'
      // resultText += '[BTG]    ₩' parseInt(+ data.btg.balance * currencys.btg.).toLocaleString()now + ' / ' 
      //                        + data.btg.balance + '\n' // can not use btg  checked at 20171215
      resultText += '[ETH]     ₩' + parseInt(data.eth.balance * currencys.eth.now).toLocaleString() + ' / ' 
                              + data.eth.balance + '\n'
      resultText += '[ETC]     ₩' + parseInt(data.etc.balance * currencys.etc.now).toLocaleString() + ' / ' 
                              + data.etc.balance + '\n'
      resultText += '[XRP]     ₩' + parseInt(data.xrp.balance * currencys.xrp.now).toLocaleString() + ' / ' 
                              + data.xrp.balance + '\n'
      resultText += '[QTUM] ₩' + parseInt(data.qtum.balance * currencys.qtum.now).toLocaleString() + ' / ' 
                              + data.qtum.balance + '\n'
      resultText += '[LTC]     ₩' + parseInt(data.ltc.balance * currencys.ltc.now).toLocaleString() + ' / ' 
                              + data.ltc.balance + '\n'
      resultText += '[IOTA]   ₩' + parseInt(data.iota.balance * currencys.iota.now).toLocaleString() + ' / ' 
                              + data.iota.balance + '\n'
      resultText += '[OMG]   ₩' + parseInt(data.omg.balance * currencys.omg.now).toLocaleString() + ' / ' 
                              + data.omg.balance + '\n'
      resultText += '[EOS]   ₩' + parseInt(data.eos.balance * currencys.eos.now).toLocaleString() + ' / ' 
                              + data.eos.balance + '\n'
      resultText += '[DATA]   ₩' + parseInt(data.data.balance * currencys.data.now).toLocaleString() + ' / ' 
                              + data.data.balance + '\n'
      resultText += '[ZIL]   ₩' + parseInt(data.zil.balance * currencys.zil.now).toLocaleString() + ' / ' 
                              + data.zil.balance
    }
    bot.sendMessage(chatID, resultText)
  }).catch(function(error) {
    console.log(error)
    bot.sendMessage(chatID, '[showMyAccountInfo] API TOKEN or API KEY is WRONG')
  })
}

const sendNowCurrencyToChannel = function() {
  if (isServerGood && !isSendServerErrorStatus) {
    var currencyNowText = ''
    for ( var key in currencys ) {
      if (key === 'update') {
        continue;
      }
      let value = currencys[key]
      let isUP = value.isUp
      let valueSign = isUP ? '%2B' : '-' // %2B === '+'
      let percent = Math.abs(value.deltaRate).toFixed(2)
      
      currencyNowText += makeNowText( isUP, valueSign + percent + ' '.repeat(7 - percent.length), key.toUpperCase() + ' '.repeat(key === 'qtum' ? 1 : (key === 'iota' ? 4 : 6)), value.now, valueSign + Math.abs(value.deltaPrice))
    }
    var url = 'https://api.telegram.org/bot' + config.token + '/sendMessage?chat_id=' + config.channelID + '&parse_mode=Markdown&disable_notification=true&text=' + currencyNowText
    axios.get(url)
    // .then(function (response) {
    //   console.log(response)
    // })
  } else if(!isServerGood && !isSendServerErrorStatus) {
    isSendServerErrorStatus = true
    bot.sendMessage(config.channelID , '코인원 API 서버가 정상작동하지 않아 비교정보를 보낼 수 없습니다.') // sendMessageTo @channelName
    return
  } else {
    // nothing
  }
  // console.log('currencyNowText', currencyNowText)
}

const makeNowText = (up, percent, currency, nowPrice, deltaPrice) => {
  const emoji = (up ? '\xF0\x9F\x93\x88' : '\xF0\x9F\x93\x89')
  // console.log('makeNowText', up, percent, currency, nowPrice, deltaPrice)
  return `${emoji}\`${percent}\`*${currency}*${nowPrice}    (\`${deltaPrice}\`)\n`
}

// system message
const sendHelpMessage = function (chatID) {
  var sendMessageText = '안녕하세요 코인원 핼퍼입니다. 명령어 설명드리겠습니다.\n\n'
                        + '/help : 현재 보고 계시는 명령어를 보실 수 있습니다.\n'
                        + '/btcnow : 비트코인의 현재가격을 보여줍니다.\n'
                        + '/bchnow : 비트코인캐시의 현재가격을 보여줍니다.\n'
                        + '/btgnow : 비트코인골드의 현재가격을 보여줍니다.\n'
                        + '/ethnow : 이더리움의 현재가격을 보여줍니다.\n'
                        + '/etcnow : 이더리움클래식의 현재가격을 보여줍니다.\n'
                        + '/xrpnow : 리플의 현재가격을 보여줍니다.\n'
                        + '/qtumnow : 퀀텀의 현재가격을 보여줍니다.\n'
                        + '/ltcnow : 라이트코인의 현재가격을 보여줍니다.\n'
                        + '/iotanow : 아이오타의 현재가격을 보여줍니다.\n'
                        + '/omgnow : 오미세고의 현재가격을 보여줍니다.\n'
                        + '/eosnow : 이오스의 현재가격을 보여줍니다.\n'
                        + '/datanow : 데이타의 현재가격을 보여줍니다.\n'
                        + '/zilnow : 질리카의 현재가격을 보여줍니다.\n'
                        + '/btctraded : 비트코인의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/bchtraded : 비트코인캐시의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/btgtraded : 비트코인골드의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/ethtraded : 이더리움의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/etctraded : 이더리움클래식의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/xrptraded : 리플의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/qtumtraded : 퀀텀의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/ltctraded : 라이트코인의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/iotatraded : 아이오타의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/omgtraded : 오미세고의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/eostraded : 이오스의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/datatraded : 데이타의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/ziltraded : 질리카의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/btcorder : 비트코인의 현재 시장상황을 보여줍니다.\n'
                        + '/bchorder : 비트코인캐시의 현재 시장상황을 보여줍니다.\n'
                        + '/btgorder : 비트코인골드의 현재 시장상황을 보여줍니다.\n'
                        + '/ethorder : 이더리움의 현재 시장상황을 보여줍니다.\n'
                        + '/etcorder : 이더리움클래식의 현재 시장상황을 보여줍니다.\n'
                        + '/xrporder : 리플의 현재 시장상황을 보여줍니다.\n'
                        + '/qtumorder : 퀀텀의 현재 시장상황을 보여줍니다.\n'
                        + '/ltcorder : 라이트코인의 현재 시장상황을 보여줍니다.\n'
                        + '/iotaorder : 아이오타의 현재 시장상황을 보여줍니다.\n'
                        + '/omgorder : 오미세고의 현재 시장상황을 보여줍니다.\n'
                        + '/eosorder : 이오스의 현재 시장상황을 보여줍니다.\n'
                        + '/dataorder : 데이타의 현재 시장상황을 보여줍니다.\n'
                        + '/zilorder : 질리카의 현재 시장상황을 보여줍니다.\n'
                        + '알람확인 : 내가 등록한 코인의 종류를 알려줍니다.\n'
                        + '알람등록 [코인종류] [금액] : 코인종류 및 금액에 대한 알람을 등록합니다.\n'
                        + '알람삭제 [코인종류] [금액] : 코인종류 및 금액에 대한 알람을 삭제합니다.\n'
                        + '\n이상입니다 채팅창에 "/" 표시를 누르시면 사용하기 편리하니 참고해주세요.'

  bot.sendMessage(chatID, sendMessageText, {
      reply_markup: {
        keyboard: [
          [{text: '/btcnow'}, {text: '/bchnow'}, {text: '/btgnow'}],
          [{text: '/ethnow'}, {text: '/etcnow'}, {text: '/xrpnow'}],
          [{text: '/qtumnow'}, {text: '/ltcnow'}, {text: '/iotanow'}],
          [{text: '/omgnow'}, {text: '/eosnow'}, {text: '/datanow'}],
          [{text: '/zilnow'}, {text: '/help'}]
        ],
        resize_keyboard: true
      }
    })
} 

setInterval(coinoneCurrency, 1000 * 2.5)
setTimeout(function () {
  sendNowCurrencyToChannel()
}, 3000)
setInterval(sendNowCurrencyToChannel, 60 * 1000)


// Listen for any kind of message. There are different kinds of messages.
bot.on('message', function (msg) {
  try {
    var chatID = msg.chat.id
    var message = msg.text
    if (msg.document) {
      // message with file
    } else if (msg.photo) {
      // message with photo
    } else if (message) {
      // var name = msg.from.first_name
      // if (msg.from.last_name !== undefined){
      //   name = name + ' ' + msg.from.last_name
      // }
      if (!isServerGood) {
        bot.sendMessage(chatID, 'Coinone API Server Status: [NOT GOOD]')
      }
      if (/\/start/.test(message)) {
        sendHelpMessage(msg.chat.id)
      } else if (/\/help/.test(message)) {
        sendHelpMessage(msg.chat.id)
      } else if (/\/(btc|bch|btg|eth|etc|xrp|qtum|ltc|iota|omg|eos|data|zil)now/.test(message)) {
        var coinName = message.slice(1, message.indexOf('now'))
        // console.log(message, message.indexOf('now'), coinName)
        bot.sendMessage(chatID, coinName.toUpperCase() + ' now currenct: ' + currencys[coinName].now)
      } else if (/\/(btc|bch|btg|eth|etc|xrp|qtum|ltc|iota|omg|eos|data|zil)traded/.test(message)) {
        var coinName = message.slice(1, message.indexOf('traded'))
        // console.log(message, message.indexOf('traded'), coinName)
        coinoneRecentCompletedOrders(coinName, chatID)
      } else if (/\/(btc|bch|btg|eth|etc|xrp|qtum|ltc|iota|omg|eos|data|zil)order/.test(message)) {
        var coinName = message.slice(1, message.indexOf('order'))
        // console.log(message, message.indexOf('order'), coinName)
        coinoneCurrentOrders(coinName, chatID)
      } else if (/^(regApiKey|API키등록)/.test(message)) {
        registerAPIkey(message, chatID)
      } else if (/^(showMyAccount|내계좌보기|내계좌확인)$/.test(message)){
        showMyAccountInfo(chatID)
      } else if (/^내돈확인$/.test(message)){
        showMyAccountInfo(chatID, true)
      } else if (/^(showMyAlarm|내알람보기|알람확인)$/.test(message)) {
        bot.sendMessage(chatID, searchInAlarmList(chatID))
      } else if (/^(addAlarm|알람등록)/.test(message)) {
        if (registerAlarm(message, chatID)) {
          bot.sendMessage(chatID, 'SUCCESS: register alarm.')
        } else {
          bot.sendMessage(chatID, 'FAIL: register alarm. checkout your commend set\n[addAlarm "btc/bch/eth/etc/xrp/qtum/ltc/iota" "price"] or\n[알람등록 "비트/비캐/비골/이클/이더/리플/퀀텀/라코/아이오타" "가격"]')
        }
      } else if (/^(deleteAlarm|알람삭제)/.test(message)) {
        var result = deleteAlarmFromAlarmList(message, chatID)
        if (result === true) {
          bot.sendMessage(chatID, 'SUCCESS: delete alarm.')
        } else {
          var messageText = 'FAIL: delete alarm.\n'
          if(result === 'format' || result === 'coin' || result === 'price') {
            messageText += 'checkout your commend set\n[deleteAlarm "btc/bch/eth/etc/xrp/qtum/ltc/iota" "price"] or\n[알람삭제 "비트/비캐/비골/이클/이더/리플/퀀텀/라코/아이오타" "가격"]'
          } else if (result === 'not found') {
            messageText += 'alarm in commend is not registered\n' + searchInAlarmList(chatID)
          }
          bot.sendMessage(chatID, messageText)
        }
      }
    }
  } catch (error) {
    console.warn('[bot.on]', error)
  }
})
