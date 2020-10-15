"use strict";
const NandBox = require("nandbox-bot-api/src/NandBox");
const Nand = require("nandbox-bot-api/src/NandBoxClient");
const TextOutMessage = require("nandbox-bot-api/src/outmessages/TextOutMessage");
const Utility = require("nandbox-bot-api/src/util/Utility");
const botResponses = require("./botResponses");
const NandBoxClient = Nand.NandBoxClient;
const configFile = require("./config.json");
const TOKEN = configFile.token;
const config = {
  URI: configFile.URI,
  DownloadServer: configFile.DownloadServer,
  UploadServer: configFile.UploadServer,
};
const funcs = require("./funcs");

/**
 * todo: handle sending location again from user  
 remove the channel when the admin removes the bot.
 * 
 */

var client = NandBoxClient.get(config);
var nandbox = new NandBox();
var nCallBack = nandbox.Callback;

let bot = null;
var api = null;

nCallBack.onConnect = (_api, { name, ID }) => {
  bot = { name, id: ID };
  api = _api;
  console.log("Authenticated");
  funcs.setNextPrayerTimeouts()
  funcs.setTimeoutCallback((locId) => {
    funcs.sendNotification(locId, api);
  });
};
function sendTextToAdmin(chatId, text, toUserId) {
  const msg = new TextOutMessage();
  msg.reference = Utility.Id();
  msg.text = text;
  msg.chat_id = chatId;
  msg.chat_settings = 1;
  msg.to_user_id = toUserId;
  api.send(JSON.stringify(msg));
}

nCallBack.onReceive = (incomingMsg) => {
  console.log(incomingMsg);
  const { type, chat, chat_settings, from_admin, location, text, from } = incomingMsg;
  const fromChannelOrGroupAdmin = chat.type.match(/Channel|Group/) && from_admin === 1 && chat_settings === 1;
  const fromContact = chat.type === "Contact";
  if (fromContact) {
    api.sendText(chat.id, botResponses.help);
  } else if (fromChannelOrGroupAdmin) {
    switch (type) {
      case "location":
        let loc = funcs.channelExists(chat.id);
        if (loc === undefined) {
          loc = funcs.addChannel(chat.id, Number(location.latitude), Number(location.longitude));
          console.log(loc);
          sendTextToAdmin(chat.id, botResponses.addChannelSuccessful(loc), from.id);
        } else {
          sendTextToAdmin(chat.id, botResponses.channelAlreadyConfigured(loc), from.id);
        }
        break;
      case "text":
        if (text === "/help") {
          sendTextToAdmin(chat.id, botResponses.help, from.id);
        }
        if (text === "/deactivate") {
          funcs.removeChannel(chat.id);
          sendTextToAdmin(chat.id, botResponses.deactivated, from.id);
        }
    }
  }
};

// implement other nandbox.Callback() as per your bot need
nCallBack.onReceiveObj = (obj) => console.log("received object: ", obj);
nCallBack.onClose = () => console.log("ONCLOSE");
nCallBack.onError = () => console.log("ONERROR");
nCallBack.onChatMenuCallBack = (chatMenuCallback) => {};
nCallBack.onInlineMessageCallback = (inlineMsgCallback) => {};
nCallBack.onMessagAckCallback = (msgAck) => {};
nCallBack.onUserJoinedBot = (user) => {};
nCallBack.onChatMember = (chatMember) => {
  if (chatMember.user.id===bot.id   && chatMember.status == "Removed") {
    funcs.removeChannel(chatMember.chat.id);
  }
};
nCallBack.onChatAdministrators = (chatAdministrators) => {};
nCallBack.userStartedBot = (user) => {};
nCallBack.onMyProfile = (user) => {};
nCallBack.onUserDetails = (user) => {};
nCallBack.userStoppedBot = (user) => {};
nCallBack.userLeftBot = (user) => {};
nCallBack.permanentUrl = (permenantUrl) => {};
nCallBack.onChatDetails = (chat) => {};
nCallBack.onInlineSearh = (inlineSearch) => {};

client.connect(TOKEN, nCallBack);
