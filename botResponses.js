module.exports = {
  help: "You can only set one locatiuon for prayer time notifications. Set it by sending the bot a location.",
  addChannelSuccessful: (loc) => `Great! I will now notify this channel at prayer times for the location ${loc.name}
   with coordinates [lat: ${loc.coord.lat}, long: ${loc.coord.long}]`,
  channelAlreadyConfigured: (loc) => `You have already configured the bot to the location ${loc.name}
   with coordinates [lat: ${loc.coord.lat}, long: ${loc.coord.long}].  Use the command /deactivate first then send a new location.`,
  deactivated:
    "Deactivated. The bot will no longer send prayer notifications to this channel/group. To activate it again, just send the desired location for prayer times!",
};
