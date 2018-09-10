'use strict';

module.exports = function(Country) {
	Country.getCitiesWithCountries = function(cb) {
		Country.find({include : 'provinces'}, function(err, countries){
			if(countries) {
				cb(null, countries);
			} else {
				cb(null,{status : 0, message : 'No Country found!'});
			}
		});		
	}

	Country.remoteMethod('getCitiesWithCountries', {
          http: {path: '/getCitiesWithCountries', verb: 'get'},
          accepts: [],
          returns: {arg: 'data', type: 'json'}
    });
};
