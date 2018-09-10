'use strict';

module.exports = function(Customerpoint) {

	Customerpoint.getPoints = function(userId, cb) {
		if(userId) {
			Customerpoint.find({where : {userId : userId}, order : 'id desc', include : [
					{
			          relation: 'members', // include the owner object
			          scope: { 
			            include : [
			            {
			            	"relation" : "countries",
			            },
			            {
			            	"relation" : "filestorages",
			            	scope : {
			            		where : {status : "active", uploadType : "profile"}	
			            	}
			            }, {"relation" : "provinces"}]
			          }
			      	},
			      	{
			          relation: 'artists', // include the owner object
			          scope: { 
			            include : [
			            {"relation" : "countries"},
			            {
			            	"relation" : "filestorages",
			            	scope : {
			            		where : {status : "active", uploadType : "profile"}	
			            	}
			            }, {"relation" : "provinces"}]
			          }
			      	}]}, function(err, points){
				if(points) {
					cb(null, points);
				} else {
					cb(null,{status : 0, message : 'No Points available for this user!'});
				}
			});
		} else {
			cb(null,{status : 0, message : 'Userid is required!'});
		}
	}

	Customerpoint.remoteMethod('getPoints', {
          http: {path: '/getPoints', verb: 'get'},
          accepts: [{arg: 'userId', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });
};
