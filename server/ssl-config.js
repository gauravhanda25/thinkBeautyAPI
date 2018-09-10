// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: loopback-example-ssl
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var path = require('path');
var fs = require('fs');

exports.privateKey = fs.readFileSync('/etc/apache2/ssl/thinkbeauty.key').toString();
exports.certificate = fs.readFileSync('/etc/apache2/ssl/c7599b59788d7b8f.crt').toString();
