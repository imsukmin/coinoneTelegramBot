var TelegramBot = require('node-telegram-bot-api'),
    axios = require('axios'),
    Coinone = require('coinone-api')
    coinone = new Coinone() // public API only

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

// Create a bot that uses 'polling' to fetch new updates
var bot = new TelegramBot(config.token, { polling: true })

// global list
var nowCurrency = {
  btc: 0,
  eth: 0,
  etc: 0,
  xrp: 0,
  init: function () {
    coinone.ticker('all')
    .then(function (response) {
      nowCurrency.btc = response.data.btc.last
      nowCurrency.eth = response.data.eth.last
      nowCurrency.etc = response.data.etc.last
      nowCurrency.xrp = response.data.xrp.last
    })
    .catch(function (error) {
      console.log(error);
    })
  }
}
nowCurrency.init()

var alermList = {
  btc: {},
  eth: {},
  etc: {},
  xrp: {}
} // input listener object seem like 'alermList[coinType][price].push(chatID)'

// chatID List
const adminAccountID = config.adminAccountID
const groupChatID = config.groupChatID

const coinoneCurrency = function () {
  coinone.ticker('all')
  .then(function (response) {
    var data = response.data
    for (var coin in alermList) {
      for (var price in alermList[coin]) {
        for (var i in alermList[coin][price]) {
          var chatID = alermList[coin][price][i]
          if ((nowCurrency[coin] >= price && data[coin].last <= price) || 
              (nowCurrency[coin] <= price && data[coin].last >= price)) {
            bot.sendMessage(chatID, '[!ALERM!]: ' + coin + '\'s currency is ' + data[coin].last)
            alermList[coin][price].splice(i, 1)
            if (alermList[coin][price].length === 0) {
              alermList[coin][price] = undefined
            }
          }
        }


      }
    }

    console.log(JSON.stringify(alermList))

    nowCurrency.btc = data.btc.last
    nowCurrency.eth = data.eth.last
    nowCurrency.etc = data.etc.last
    nowCurrency.xrp = data.xrp.last
    // console.log(data, data.result)
    // console.log('btcNow:', btcNow, 'ethNow:', ethNow, 'etcNow:', etcNow)
  })
  .catch(function (error) {
    console.log(error);
  })
}

const coinoneRecentCompletedOrders = function (currency, chatID) {
  if(currency !== 'btc' && currency !== 'eth' && currency !== 'etc' && currency !== 'xrp' ) {
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
    // console.log(data, data.result)
  })
  .catch(function (error) {
    console.log(error);
  })
}

const coinoneCurrentOrders = function (currency, chatID) {
  if(currency !== 'btc' && currency !== 'eth' && currency !== 'etc' && currency !== 'xrp' ) {
    console.warn('coinoneCurrentOrders: currency type is NOT correct! [ currency: ' + currency + ']')
    currency = 'btc'
  }
  coinone.orderbook(currency)
  .then(function (response) {
    var recentCount = 10
    var data = response.data
    // console.log(data, data.result)
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
    console.log(error);
  })
}

const registerAlerm = function (message, chatID) {
  var messageArray = message.split(' ')
  var coinType = messageArray[1]
  var price = messageArray[2]

  if (coinType !== 'btc' && coinType !== 'eth' && coinType !== 'etc' && coinType !== 'xrp' ) {
    console.warn('registerAlerm: coinType type is NOT correct! [ coinType: ' + coinType + ']')
    return false
  }

  alermList[chatID]
  if(!Array.isArray(alermList[coinType][price])){
    alermList[coinType][price] = []
  }
  alermList[coinType][price].push(config.adminAccountID)
  return true
}

const serializeObject = function (object) { 
  if (isEmpty(object)) {
    return ''
  }

  var data = [];
  for(var p in object) {
    if (object.hasOwnProperty(p)) {
      data.push(encodeURIComponent(p) + "=" + encodeURIComponent(object[p]))
    }
  }
  return '?' + data.join("&");
}

const isEmpty = function (obj) {
    return Object.keys(obj).length === 0;
}

// system message
const sendHelpMessage = function (chatID) {
  var sendMessageText = '안녕하세요 코인원 핼퍼입니다. 명령어 설명드리겠습니다.\n\n'
                        + '/help : 현재 보고 계시는 명령어를 보실 수 있습니다.\n'
                        + '/btcnow : 비트코인의 현재가격을 보여줍니다.\n'
                        + '/ethnow : 이더리움의 현재가격을 보여줍니다.\n'
                        + '/etcnow : 이더리움클래식의 현재가격을 보여줍니다.\n'
                        + '/xrpnow : 리플의 현재가격을 보여줍니다.\n'
                        + '/btctraded : 비트코인의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/ethtraded : 이더리움의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/etctraded : 이더리움클래식의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/xrptraded : 리플의 최근 거래내역 10개를 보여줍니다.\n'
                        + '/btcorder : 비트코인의 현재 시장상황을 보여줍니다.\n'
                        + '/ethorder : 이더리움의 현재 시장상황을 보여줍니다.\n'
                        + '/etcorder : 이더리움클래식의 현재 시장상황을 보여줍니다.\n'
                        + '/xrporder : 리플의 현재 시장상황을 보여줍니다.\n'
                        + '\n이상입니다 채팅창에 "/" 표시를 누르시면 사용하기 편리하니 참고해주세요.'

  bot.sendMessage(chatID, sendMessageText)
} 

setInterval(coinoneCurrency, 1000*1)

// Listen for any kind of message. There are different kinds of messages.
bot.on('message', function (msg) {
  // console.log('message', msg)
  try {
    var chatID = msg.chat.id
    var message = msg.text
    if (msg.document) {
      // message with file
    } else if (msg.photo) {
      // message with photo
    } else if (message) {
      var name = msg.from.first_name
      if (msg.from.last_name !== undefined){
        name = name + ' ' + msg.from.last_name
      }

      if (/\/start/.test(message)) {
        sendHelpMessage(msg.chat.id)
      } else if (/\/help/.test(message)) {
        sendHelpMessage(msg.chat.id)
      } else if (/\/btcnow/.test(message)) {
        bot.sendMessage(chatID, 'BTC now currenct: ' + nowCurrency.btc)
      } else if (/\/ethnow/.test(message)) {
        bot.sendMessage(chatID, 'ETH now currenct: ' + nowCurrency.eth)
      } else if (/\/etcnow/.test(message)) {
        bot.sendMessage(chatID, 'ETC now currenct: ' + nowCurrency.etc)
      } else if (/\/xrpnow/.test(message)) {
        bot.sendMessage(chatID, 'XRP now currenct: ' + nowCurrency.xrp)
      } else if (/\/btctraded/.test(message)) {
        coinoneRecentCompletedOrders('btc', chatID)
      } else if (/\/ethtraded/.test(message)) {
        coinoneRecentCompletedOrders('eth', chatID)
      } else if (/\/etctraded/.test(message)) {
        coinoneRecentCompletedOrders('etc', chatID)
      } else if (/\/xrptraded/.test(message)) {
        coinoneRecentCompletedOrders('xrp', chatID)
      } else if (/\/btcorder/.test(message)) {
        coinoneCurrentOrders('btc', chatID)
      } else if (/\/ethorder/.test(message)) {
        coinoneCurrentOrders('eth', chatID)
      } else if (/\/etcorder/.test(message)) {
        coinoneCurrentOrders('etc', chatID)
      } else if (/\/xrporder/.test(message)) {
        coinoneCurrentOrders('xrp', chatID)
      } else if (/addAlerm/.test(message)) {
        var result = registerAlerm(message, chatID)
        if (result) {
          bot.sendMessage(chatID, '알림이 등록 되었습니다.')
        } else {
          bot.sendMessage(chatID, '알림등록에 실패하였습니다.')
        }
      }
    }
  } catch (error) {
    console.warn(error)
  }
})
