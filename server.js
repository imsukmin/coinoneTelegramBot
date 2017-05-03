var fs = require('fs'),
  TelegramBot = require('node-telegram-bot-api'),
  moment = require('moment'),
  Promise = require('bluebird'),
  axios = require('axios')

moment.locale()

var config = require('./config')

// Create a bot that uses 'polling' to fetch new updates
var bot = new TelegramBot(config.token, { polling: true })

// CONST list
const IMAGELOOT = 'images'
const TARGETIMAGE = 'images/recent.png'
const ATTENDFILEPATH = 'data/attend.json'
const ATTENDDEFAULTFILEPATH = 'data/attend_default.json'

// chatID List
const adminAccountID = config.adminAccountID
const groupChatID = config.groupChatID

const coinoneAPI = function (commend, parameter) {
  var getParameter = serializeObject(parameter)
  // console.log('getParameter', getParameter)

  axios.get('https://api.coinone.co.kr/' + commend + '/' + getParameter)
  .then(function (response) {
    var data = response.data
    // console.log(data, data.result)
    console.log(btcNow, ethNow, etcNow)
  })
  .catch(function (error) {
    console.log(error);
  })
}

const coinoneCurrency = function (currency, chatID) {
  if(currency !== 'btc' && currency !== 'eth' && currency !== 'etc' && currency !== 'all' ) {
    console.warn('coinoneCurrency: currency type is NOT correct! [ currency: ' + currency + ']')
    currency = 'btc'
  }
  var apiParameter = {
    'currency': 'all' // Default value: btc, Allowed values: btc, eth, etc, all
  }
  var getParameter = serializeObject(apiParameter)
  // console.log('getParameter', getParameter)

  axios.get('https://api.coinone.co.kr/ticker/' + getParameter)
  .then(function (response) {
    var data = response.data
    var btcNow = data.btc.last
    var ethNow = data.eth.last
    var etcNow = data.etc.last
    // console.log(data, data.result)
    switch (currency) {
      case 'btc': bot.sendMessage(chatID, 'BTC now currenct: ' + btcNow); break;
      case 'eth': bot.sendMessage(chatID, 'ETH now currenct: ' + ethNow); break;
      case 'etc': bot.sendMessage(chatID, 'ETC now currenct: ' + etcNow); break;
    }
    // console.log('btcNow:', btcNow, 'ethNow:', ethNow, 'etcNow:', etcNow)
  })
  .catch(function (error) {
    console.log(error);
  })
}

const coinoneRecentCompletedOrders = function (currency, chatID) {
  if(currency !== 'btc' && currency !== 'eth' && currency !== 'etc' ) {
    console.warn('coinoneRecentCompletedOrders: currency type is NOT correct! [ currency: ' + currency + ']')
    currency = 'btc'
  }

  var apiParameter = {
    'currency': currency, // Default value: btc, Allowed values: btc, eth, etc
    'period': 'hour' // Default value: hour, Allowed values: hour, day
  }
  var getParameter = serializeObject(apiParameter)
  // console.log('getParameter', getParameter)

  axios.get('https://api.coinone.co.kr/trades/' + getParameter)
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
  if(currency !== 'btc' && currency !== 'eth' && currency !== 'etc' ) {
    console.warn('coinoneRecentCompletedOrders: currency type is NOT correct! [ currency: ' + currency + ']')
    currency = 'btc'
  }

  var apiParameter = {
    'currency': currency, // Default value: btc, Allowed values: btc, eth, etc
    'period': 'hour' // Default value: hour, Allowed values: hour, day
  }
  var getParameter = serializeObject(apiParameter)
  // console.log('getParameter', getParameter)

  axios.get('https://api.coinone.co.kr/orderbook/' + getParameter)
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
  sendMessageText += '/help : 현재 보고 계시는 명령어를 보실 수 있습니다.\n'
  sendMessageText += '/btcnow : 비트코인의 현재가격을 보여줍니다.\n'
  sendMessageText += '/ethnow : 이더리움의 현재가격을 보여줍니다.\n'
  sendMessageText += '/etcnow : 이더리움클래식의 현재가격을 보여줍니다.\n'
  sendMessageText += '/btctraded : 비트코인의 최근 거래내역 10개를 보여줍니다.\n'
  sendMessageText += '/ethtraded : 이더리움의 최근 거래내역 10개를 보여줍니다.\n'
  sendMessageText += '/etctraded : 이더리움클래식의 최근 거래내역 10개를 보여줍니다.\n'
  sendMessageText += '/btcorder : 비트코인의 현재 시장상황을 보여줍니다.\n'
  sendMessageText += '/ethorder : 이더리움의 현재 시장상황을 보여줍니다.\n'
  sendMessageText += '/etcorder : 이더리움클래식의 현재 시장상황을 보여줍니다.\n'
  sendMessageText += '\n이상입니다 채팅창에 "/" 표시를 누르시면 사용하기 편리하니 참고해주세요.'

  bot.sendMessage(chatID, sendMessageText)
} 


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
        coinoneCurrency('btc', chatID)
      } else if (/\/ethnow/.test(message)) {
        coinoneCurrency('eth', chatID)
      } else if (/\/etcnow/.test(message)) {
        coinoneCurrency('etc', chatID)
      } else if (/\/btctraded/.test(message)) {
        coinoneRecentCompletedOrders('btc', chatID)
      } else if (/\/ethtraded/.test(message)) {
        coinoneRecentCompletedOrders('eth', chatID)
      } else if (/\/etctraded/.test(message)) {
        coinoneRecentCompletedOrders('etc', chatID)
      } else if (/\/btcorder/.test(message)) {
        coinoneCurrentOrders('btc', chatID)
      } else if (/\/ethorder/.test(message)) {
        coinoneCurrentOrders('eth', chatID)
      } else if (/\/etcorder/.test(message)) {
        coinoneCurrentOrders('etc', chatID)
      }
    }
  } catch (error) {
    console.warn(error)
  }
})
