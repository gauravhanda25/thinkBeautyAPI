'use strict';

module.exports = function(Voucher) {
	Voucher.getVouchers = function(userId, cb) {
		if(userId) {
			let currencyCodes = {
	            "Kuwait": "KD",
	            "Bahrain": "BHD",
	            "UAE": "AED",
	            "Oman": "OMR"
	        }

			Voucher.find({where : {userId : userId, status : "active"},  include: [
					{
                    	relation: 'members'
                    },
                    {
	                    relation: 'artists',
	                    scope: {
	                        
	                        include: {
	                            "relation": "countries"
	                        }
	                    }
            	    }],
            	    order : 'id desc'
            }, function(err, points){
				if(points) {
					
					let data = JSON.stringify(points);
                    let finalPoints = JSON.parse(data);
                    var newPoints;
                    newPoints = finalPoints.filter(function(elInner) {
                        if (elInner.artists) {
                        	var el = elInner.artists;
                            //elInner.subServiceName = elInner[data.service].name;
                            if (el.countries.name == 'Saudi Arabia') {
                                elInner.currencyCode = 'SAR';
                            } else {
                                elInner.currencyCode = currencyCodes[el.countries.name];
                            }
                            return true;
                        } 
                    })
                    cb(null, newPoints);
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
