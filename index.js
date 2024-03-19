require('dotenv').config()
const express = require('express')
const app = express()
var cron = require('node-cron')
const fs = require('fs')
let isRun = false
const port = process.env.PORT || 3003
let last = {}
let error = {}
cron.schedule('* * * * *', () => {
  if (isRun) {
    return
  }
  console.log(new Date())
  runCron().then()
})

async function runCron () {
  isRun = true
  const file = await fs.readFileSync('./list-api.json')
  const data = JSON.parse(file.toString())
  for (const item of data) {
    console.log(`Run with:${item.url}`)
    await request(item)
    await sleep(3)
  }
  isRun = false
}

async function sleep (second) {
  return new Promise((resolve) => {
    setTimeout(() => {
      return resolve(true)
    }, second * 1000)
  })
}

async function request (item) {
  try {
    let curl = await fetch(item.url, item.config)
    let status = curl.status
    let body = await curl.text()
    if (!curl.ok) {
      await sendToTelegram(item.url, status, body)
    }
    last = ({
      url: item.url,
      status: curl.status,
      time: new Date().toString(),
      error: {
        ...error
      }
    })
    return true
  } catch (e) {
    await sendToTelegram(item.url, 0, e.message)
    return false
  }

}

let sendToTelegram = async (url, status, body) => {
  try {
    let chatId = '-902454915'
    let token = process.env.TOKEN_TELEGRAM
    let api = `https://api.telegram.org/bot${token}/sendMessage`
    let params = new URLSearchParams({
      chat_id: chatId,
      text: `@dangtinh97\nurl: ${url}\nstatus: ${status}\nbody: ${body}`,
      parse_mode: 'HTML'
    }).toString()
    let curl = await fetch(`${api}?${params}`, {
      method: 'POST',
      body: JSON.stringify({})
    })
    return {
      status: status,
      body: await curl.text()
    }
  } catch (e) {
    error = {
      status: 'error',
      body: e.message
    }
    return error
  }

}
app.get('/', async (req, res) => {
  return res.json(last)
})
app.get('/send-telegram', async (req, res) => {
  let curl = await sendToTelegram('No url', 0, 'Check send-notification')
  return res.json(curl)
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
