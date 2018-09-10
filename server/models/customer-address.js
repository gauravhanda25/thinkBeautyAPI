'use strict';

module.exports = function(Customeraddress) {
	Customeraddress.getAddresses = function(memberId, cb) {
    if(memberId) {
      Customeraddress.find({where: {memberId : memberId}}, function(err, addresses){
          if(addresses) {
            cb(null, addresses);
          }
      })
    } else {
        cb(null, {status : 0, message : "User Id is required"});
    }
      
  }

  Customeraddress.remoteMethod('getAddresses', {
          http: {path: '/getAddresses', verb: 'get'},
          accepts: [
              {arg: 'memberId', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });
};
