'use strict';
var data = require('sdk/self').data;

// Keep in sync with manifest.json.
// Using Add-on SDK because WebExtensions cannot run on AMO - bugzil.la/1310082
require('sdk/page-mod').PageMod({
  include: /https:\/\/addons\.mozilla\.org\/[^\/]+\/editors\/.*/,
  contentScriptFile: [
    data.url('zipinfo.js'),
    data.url('zipinfo_browser.js'),
    data.url('amo_editor_tools.js'),
  ],
  contentStyleFile: [
    data.url('amo_editor_tools.css'),
  ],
  contentScriptWhen: 'end',
  attachTo: ['existing', 'top'],
});
