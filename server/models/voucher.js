'use strict';

module.exports = function(Voucher) {
	Voucher.getPoints = function(userId, cb) {
		if(userId) {
			Voucher.find({where : {userId : userId}, include : ['members' , 'artists']}, function(err, points){
				if(points) {
					cb(null, points);
				} else {
					cb(null,{status : 0, message : 'No Voucher available for this user!'});
				}
			});
		} else {
			cb(null,{status : 0, message : 'User Id is required!'});
		}
	}

	Voucher.remoteMethod('getVouchers', {
          http: {path: '/getVouchers', verb: 'get'},
          accepts: [{arg: 'userId', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });
};
