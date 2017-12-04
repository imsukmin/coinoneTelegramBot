var TelegramBot = require('node-telegram-bot-api'),
    Coinone = require('coinone-api'),
    coinone = new Coinone(), // public API only
    fs = require('fs')

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

// Create a bot that uses 'polling' to fetch new updates
var bot = new TelegramBot(config.token, { polling: true })

// global list
var nowCurrency = {
  btc: 0,
  bch: 0,
  eth: 0,
  etc: 0,
  xrp: 0,
  qtum: 0,
  ltc: 0,
  init: function () {
    coinone.ticker('all')
    .then(function (response) {
      nowCurrency.btc = response.data.btc.last
      nowCurrency.bch = response.data.bch.last
      nowCurrency.eth = response.data.eth.last
      nowCurrency.etc = response.data.etc.last
      nowCurrency.xrp = response.data.xrp.last
      nowCurrency.qtum = response.data.qtum.last
      nowCurrency.ltc = response.data.ltc.last
    })
    .catch(function (error) {
      console.log('[nowCurrency.init]',error);
    })
  }
}
nowCurrency.init()

// input listener object seem like 'alarmList[coin][price].push(chatID)'
var alarmList
// for attend info data
if(fs.existsSync(ALARMLISTPATH)){
  alarmList = JSON.parse(fs.readFileSync(ALARMLISTPATH, 'utf8'))
} else {
  alarmList = JSON.parse(fs.readFileSync(ALARMLISTDEFAULTPATH, 'utf8'))
}

const coinoneCurrency = function () {
  coinone.ticker('all')
  .then(function (response) {
    if(response === undefined) {
      console.log('!==API ERROR==!')
      bot.sendMessage(config.adminAccountID, '[coinoneCurrency] ticker is block!')
      return
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

    nowCurrency.btc = data.btc.last
    nowCurrency.bch = data.bch.last
    nowCurrency.eth = data.eth.last
    nowCurrency.etc = data.etc.last
    nowCurrency.xrp = data.xrp.last
    nowCurrency.qtum = data.qtum.last
    nowCurrency.ltc = data.ltc.last
    // console.log(data.result, JSON.stringify(alarmList))
  })
  .catch(function (error) {
    console.log('[coinoneCurrency]',error);
  })
}

const coinoneRecentCompletedOrders = function (currency, chatID) {
  if(currency !== 'btc' && currency !== 'bch' && currency !== 'eth' && currency !== 'etc' && currency !== 'xrp' && currency !== 'qtum' && currency !== 'ltc' ) {
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
  if(currency !== 'btc' && currency !== 'bch' && currency !== 'eth' && currency !== 'etc' && currency !== 'xrp' && currency !== 'qtum' && currency !== 'ltc' ) {
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
  var coin = messageArray[1]
  var price = parseInt(messageArray[2])

  coin = coin.replace('비트', 'btc').replace('이더', 'eth').replace('이클', 'etc').replace('리플', 'xrp').replace('캐시', 'bch').replace('퀀텀', 'qtum').replace('라코', 'ltc')

  if (coin !== 'btc' && coin !== 'eth' && coin !== 'etc' && coin !== 'xrp' && coin !== 'bch' && coin !== 'qtum' && coin !== 'ltc') {
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
  var coin = messageArray[1]
  var price = parseInt(messageArray[2])

  coin = coin.replace('비트', 'btc').replace('이더', 'eth').replace('이클', 'etc').replace('리플', 'xrp').replace('캐시', 'bch').replace('퀀텀', 'qtum').replace('라코', 'ltc')

  if (coin !== 'btc' && coin !== 'eth' && coin !== 'etc' && coin !== 'xrp' && coin !== 'bch' && coin !== 'qtum' && coin !== 'qtum') {
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

// system message
const sendHelpMessage = function (chatID) {
  var sendMessageText = '안녕하세요 코인원 핼퍼입니다. 명령어 설명드리겠습니다.\n\n'
                        + '/help : 현재 보고 계시는 명령어를 보실 수 있습니다.\n'
                        + '/btcnow : 비트코인의 현재가격을 보여줍니다.\n'
                        + '/bchnow : 비트코인캐시의 현재가격을 보여줍니다.\n'
                        + '/ethnow : 이더리움의 현재가격을 보여줍니다.\n'
                        + '/etcnow : 이더리움클래식의 현재가격을 보여줍니다.\n'
                        + '/xrpnow : 리플의 현재가격을 보여줍니다.\n'
                        + '/qtumnow : 퀀텀의 현재가격을 보여줍니다.\n'
                        + '/ltcnow : 라이트코인의 현재가격을 보여줍니다.\n'
                        + '/btctraded : 비트코인의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/bchtraded : 비트코인캐시의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/ethtraded : 이더리움의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/etctraded : 이더리움클래식의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/xrptraded : 리플의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/qtumtraded : 퀀텀의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/ltctraded : 라이트코인의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/btcorder : 비트코인의 현재 시장상황을 보여줍니다.\n'
                        + '/bchorder : 비트코인캐시의 현재 시장상황을 보여줍니다.\n'
                        + '/ethorder : 이더리움의 현재 시장상황을 보여줍니다.\n'
                        + '/etcorder : 이더리움클래식의 현재 시장상황을 보여줍니다.\n'
                        + '/xrporder : 리플의 현재 시장상황을 보여줍니다.\n'
                        + '/qtumorder : 퀀텀의 현재 시장상황을 보여줍니다.\n'
                        + '/ltcorder : 라이트코인의 현재 시장상황을 보여줍니다.\n'
                        + '알람확인 : 내가 등록한 코인의 종류를 알려줍니다.\n'
                        + '알람등록 [코인종류] [금액] : 코인종류 및 금액에 대한 알람을 등록합니다.\n'
                        + '알람삭제 [코인종류] [금액] : 코인종류 및 금액에 대한 알람을 삭제합니다.\n'
                        + '\n이상입니다 채팅창에 "/" 표시를 누르시면 사용하기 편리하니 참고해주세요.'

  bot.sendMessage(chatID, sendMessageText, {
      reply_markup: {
        keyboard: [
          [{text: '/btcnow'}, {text: '/bchnow'}, {text: '/ethnow'}],
          [{text: '/etcnow'}, {text: '/xrpnow'}, {text: '/qtumnow'}],
          [{text: '/ltcnow'}, {text: '알람확인'}, {text: '/help'}],
        ],
        resize_keyboard: true
      }
    })
} 

setInterval(coinoneCurrency, 1000*2.5)

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

      if (/\/start/.test(message)) {
        sendHelpMessage(msg.chat.id)
      } else if (/\/help/.test(message)) {
        sendHelpMessage(msg.chat.id)
      } else if (/\/btcnow/.test(message)) {
        bot.sendMessage(chatID, 'BTC now currenct: ' + nowCurrency.btc)
      } else if (/\/bchnow/.test(message)) {
        bot.sendMessage(chatID, 'BCH now currenct: ' + nowCurrency.bch)
      } else if (/\/ethnow/.test(message)) {
        bot.sendMessage(chatID, 'ETH now currenct: ' + nowCurrency.eth)
      } else if (/\/etcnow/.test(message)) {
        bot.sendMessage(chatID, 'ETC now currenct: ' + nowCurrency.etc)
      } else if (/\/xrpnow/.test(message)) {
        bot.sendMessage(chatID, 'XRP now currenct: ' + nowCurrency.xrp)
      } else if (/\/qtumnow/.test(message)) {
        bot.sendMessage(chatID, 'QTUM now currenct: ' + nowCurrency.qtum)
      } else if (/\/ltcnow/.test(message)) {
        bot.sendMessage(chatID, 'LTC now currenct: ' + nowCurrency.ltc)
      } else if (/\/btctraded/.test(message)) {
        coinoneRecentCompletedOrders('btc', chatID)
      } else if (/\/bchtraded/.test(message)) {
        coinoneRecentCompletedOrders('bch', chatID)
      } else if (/\/ethtraded/.test(message)) {
        coinoneRecentCompletedOrders('eth', chatID)
      } else if (/\/etctraded/.test(message)) {
        coinoneRecentCompletedOrders('etc', chatID)
      } else if (/\/xrptraded/.test(message)) {
        coinoneRecentCompletedOrders('xrp', chatID)
      } else if (/\/qtumtraded/.test(message)) {
        coinoneRecentCompletedOrders('qtum', chatID)
      } else if (/\/ltctraded/.test(message)) {
        coinoneRecentCompletedOrders('ltc', chatID)
      } else if (/\/btcorder/.test(message)) {
        coinoneCurrentOrders('btc', chatID)
      } else if (/\/bchorder/.test(message)) {
        coinoneCurrentOrders('bch', chatID)
      } else if (/\/ethorder/.test(message)) {
        coinoneCurrentOrders('eth', chatID)
      } else if (/\/etcorder/.test(message)) {
        coinoneCurrentOrders('etc', chatID)
      } else if (/\/xrporder/.test(message)) {
        coinoneCurrentOrders('xrp', chatID)
      } else if (/\/qtumorder/.test(message)) {
        coinoneCurrentOrders('qtum', chatID)
      } else if (/\/ltcorder/.test(message)) {
        coinoneCurrentOrders('ltc', chatID)
      } else if (/showMyAlarm/.test(message) || /내알람보기/.test(message) || /알람확인/.test(message)) {
        bot.sendMessage(chatID, searchInAlarmList(chatID))
      } else if (/addAlarm/.test(message) || /알람등록/.test(message)) {
        if (registerAlarm(message, chatID)) {
          bot.sendMessage(chatID, 'SUCCESS: register alarm.')
        } else {
          bot.sendMessage(chatID, 'FAIL: register alarm. checkout your commend set\n[addAlarm "btc/bch/eth/etc/xrp/qtum/ltc" "price"] or\n[알람등록 "비트/캐시/이클/이더/리플/퀀텀/라코" "가격"]')
        }
      } else if (/deleteAlarm/.test(message) || /알람삭제/.test(message)) {
        var result = deleteAlarmFromAlarmList(message, chatID)
        if (result === true) {
          bot.sendMessage(chatID, 'SUCCESS: delete alarm.')
        } else {
          var messageText = 'FAIL: delete alarm.\n'
          if(result === 'format' || result === 'coin' || result === 'price') {
            messageText += 'checkout your commend set\n[deleteAlarm "btc/bch/eth/etc/xrp/qtum/ltc" "price"] or\n[알람삭제 "비트/캐시/이클/이더/리플/퀀텀/라코" "가격"]'
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
