var config = require('../config');
if (config.SUGGESTIONBOX){
  var winston = require('winston'),
    formidable = require('formidable');
  const { Octokit  } = require('@octokit/rest'),
    github = new Octokit({
        auth: 'TOKEN'
      });

  exports.newIssue = function (req, resp) {
    try {
      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields) {

        var labels = [];
        if (fields.bug)
          labels.push(fields.bug);
        if (fields.enhancement)
          labels.push(fields.enhancement);
        if (fields.question)
          labels.push(fields.question);
        if (!fields['g-recaptcha-response'].length){
          resp.end('Invalid Captcha Response. Please return to the previous page.');
          return;
        }
        github.issues.create({
          owner: 'REPO-OWNER',
          repo: 'REPO-NAME',
          title: fields.title,
          body: fields.body,
          labels: labels
        });
        if (fields['g-recaptcha-response'].length)
          resp.end('<script>window.close();</script>');
      });
    }
    catch (e) {
      winston.error('formidable threw ' + e);
      resp.end('Unknown error, please inform host.');
    }
  }
}
