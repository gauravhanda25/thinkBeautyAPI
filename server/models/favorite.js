'use strict';
const app = require('../server.js');
module.exports = function(Favorite) {

	Favorite.changeFavoriteStatus =  function(data, cb) {
      	Favorite.findOne({where: {userId: data.userId, memberId: data.memberId}}, function(err, fav){

      		if(fav) {
      			fav.flag = data.flag;
      			fav.save();
      			cb(null, {status : 1, message : "Status changed successfully!"});
      		} else {
      			console.log('In else');
      			Favorite.create(data, function(err, cr){
      				if(!err) {
     					cb(null, {status : 1, message : "Status changed successfully!"});
      				}
      			})
      		}
      	})
  	}

  	Favorite.getFavorite =  function(userId, cb) {
  		if(userId) {
	      	Favorite.find(
	  			{
		  			"where" : {"userId" : userId, flag : true},
		  			"include" : [{
		  				relation : "members",
		  				scope : { include : {
						        relation: 'filestorages', // include the owner object
						        scope: {
						          where: {
						            uploadType: 'profile',
						            status: 'active'
						          }
						        }
						    }
					      } 
					  }]
				 },

	      	 function(err, fav){
	      	 	console.log(fav);
	      		let resultData =  JSON.stringify(fav);
	          	let finalData = JSON.parse(resultData);
	          	var newArray = finalData;
	          	newArray = finalData.filter(function (el) {
	          		if(el.members) {
	          			el.artistName = el.members.name;
	          			el.villa = el.members.villa;
	          			el.road = el.members.road;
	          			el.city = el.members.city;
	          			el.countryname = el.members.countryname;
	          			el.artistId = el.members.id;
	          			if(el.members.filestorages) {
	          				if(el.members.filestorages.length) {
	          					let imageData =  JSON.stringify(el.members.filestorages);
		                		let finalImage = JSON.parse(imageData)
		                		console.log(el.members.filestorages);
		                		console.log(finalImage);
		          				el.profileImage = finalImage[0];
	          				} else {
	          					el.profileImage = [];
	          				}
	          				
	          			} else {
	          				el.profileImage = [];
	          			}
	          			delete el['members'];
	          			return true;
	          		}
	          	})
	                
	      		if(newArray) {
	      			
	      			cb(null, newArray);
	      		}
	      	})
	      } else {
	      	cb(null, {status : 0, "message" : "UserId is required!"});
	      }
  	}

	Favorite.remoteMethod('changeFavoriteStatus', {
          http: {path: '/changeFavoriteStatus', verb: 'post'},
          accepts: [
              {arg: '', type: 'object', http: { source: 'body' }}],
          returns: {arg: 'data', type: 'json'}
    });

    Favorite.remoteMethod('getFavorite', {
          http: {path: '/getFavorite', verb: 'get'},
          accepts: [
              {arg: 'userId', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });
};
