var config = require('../config');
if (config.SUGGESTIONBOX){
  var winston = require('winston'),
      formidable = require('formidable'),
      gh = require('github'),
      github = new gh({
        version: '3.0.0'
      });

  github.authenticate({
    type: 'basic',
    username: 'USERNAMEHERE',
    password: 'PASSWORDHERE'
  });

  exports.newIssue = function (req, resp) {
    try {
      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields) {
        github.issues.create({
          user: 'USERNAMEHERE',
          repo: 'REPONAMEHERE',
          title: fields.title,
          body: fields.body,
          labels: ( fields.labels ? fields.labels.split(' ') : [] )
        });
      });
    }
    catch (e) {
      winston.error('formidable threw ' + e);
    }
    resp.end('Submitted~ Please close this window.');
  }
}
