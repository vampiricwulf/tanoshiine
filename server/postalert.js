var common = require("../common"),
  hooks = require("../hooks");

hooks.hook("clientSynced", function(info, cb) {
  var client = info.client;
  client.send([0, common.POST_ALERT_SYNC]);
  cb(null);
});
