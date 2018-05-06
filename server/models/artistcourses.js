'use strict';

module.exports = function(Artistcourses) {
	Artistcourses.getArtistWithServices = function(date, country, cb) {
		let whereCondition = {};
		if(date) {
			whereCondition = {"startfrom" : new Date(date)};
		}
		let whereCountry = {};
		if(country) {
			whereCountry = {where: {country : country}}
		}

		Artistcourses.find(
				{
					include: [{
						relation: 'members',
						scope: whereCountry
			        }],
			        where : whereCondition
		      }, function(err, results){
		      cb(null, newArray);
        });
	}
	Artistcourses.remoteMethod('getArtistWithCourses', {
          http: {path: '/getArtistWithCourses', verb: 'get'},
          accepts: [
              {arg: 'date', type: 'string'},
              {arg: 'country', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });

  	Artistcourses.remoteMethod('getArtistById', {
          http: {path: '/getArtistById', verb: 'post'},
          accepts: [
              {arg: '', type: 'object', http: { source: 'body' }}],
          returns: {arg: 'data', type: 'json'}
    });
};
