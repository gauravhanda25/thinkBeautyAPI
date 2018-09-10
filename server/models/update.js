'use strict';
const app = require('../server.js');
var apn = require('apn');

module.exports = function(Update) {
	Update.whatsNew = function(userId, cb) {
		if(userId) {
    		const {Favorites, Member} = app.models;
    		var whereFavorite = {}
			var favoriteRelation = []

			var whereFavorite = {
			  where: {
			    userId : userId,
			    flag : true
			  }
			}
			favoriteRelation = [{
			  relation : "favourites",
			  scope : whereFavorite
			}, {relation : "updates"}, {
	             "relation" : "filestorages",
	             scope: { 
		            where: {uploadType: 'profile', status : 'active'} 
		           
		          }
	         	}]

			Member.find({
				include: favoriteRelation,
			    order: "updated_on DESC"
			}, function(err, updates){
				if(updates) {

					let data =  JSON.stringify(updates);
			        let finalData = JSON.parse(data)
			        			        
			        var response = [];
			        var artistIdArr = [];
			        var newArray = finalData.filter(function (el) {
			        	return el.favourites.length > 0;
			        });
			        

			        var finalArr = newArray.filter(function (elOuter) {
			        	console.log(elOuter.updates);
			        	console.log(elOuter.favourites);
			        	if(elOuter.updates.length && elOuter.favourites.length) {
				        	let data =  JSON.stringify(elOuter.updates);
				        	let finalData = JSON.parse(data)
			        		console.log(finalData);
			        		var newArrayFinal = finalData.filter(function (el) {
				        	if(el.artistId) {
					          	//if(artistIdArr.indexOf(el.artistId) == -1) {
					          	//	artistIdArr.push(el.artistId);
					          		response.push({
										"title": el.title,
										"description": el.description,
										"status": el.status,
										"created_on": el.created_on,
										"updated_on": el.updated_on,
										"artistName": elOuter.name,
										"filePath": (elOuter.filestorages.length) ? elOuter.filestorages[0].filePath : '',
										"fileName": (elOuter.filestorages.length) ? elOuter.filestorages[0].fileName : '',
										"artistId" : el.artistId
					          		})
					          		return true;
					          	//}
				        	}
				        });
			        	}
			        });
			        cb(null, response);
				}
			})
		} else {
			Update.find({"order" : "updated_on DESC", "include" : [
			{					
	          relation: 'members', // include the owner object
	          scope: { 
	            include : {
	             "relation" : "filestorages",
	             scope: { 
		            where: {uploadType: 'profile', status : 'active'} 
		           
		          }
	         	}
	          }
	        }
					]}, function(err, updates){
				if(updates) {
					let data =  JSON.stringify(updates);
			        let finalData = JSON.parse(data)
			        var artistIdArr = [];
			        var response = [];
			        var newArray = finalData.filter(function (el) {
			        	if(el.artistId) {
				          	//if(artistIdArr.indexOf(el.artistId) == -1) {
				          		artistIdArr.push(el.artistId);
				          		response.push({
									"title": el.title,
									"description": el.description,
									"status": el.status,
									"created_on": el.created_on,
									"updated_on": el.updated_on,
									"artistName": el.members.name,
									"filePath": (el.members.filestorages.length) ? el.members.filestorages[0].filePath : '',
									"fileName": (el.members.filestorages.length) ? el.members.filestorages[0].fileName : ''
				          		})
				          		return true;
				          	//}
			        	}
			        });
			        cb(null, response);			        
				}
			})
		}
	}

	Update.observe('after save', async function(ctx, next) {
        const update = ctx.instance || ctx.data;
        const { Member, DeviceToken } = app.models;

        const artist = await Member.findOne({where : {id : update.artistId}});
        if(ctx.isNewInstance) {
        	const tokens = await DeviceToken.find({where : {userType : "user"}});
        	let data =  JSON.stringify(tokens);
	        let finalTokens = JSON.parse(data);		
	        console.log(finalTokens);
        	var newArrayFinal = finalTokens.filter(function (el) {
        		if(el) {
	                var options = {
	                  cert: app.get("user_cert"),
	                  key: app.get("user_key"),
	                  passphrase : app.get("user_passphrase"),
	                  production : true
	                };


	                console.log(el, app.get("user_cert"));
	                var apnProvider =  new apn.Provider(options);
	                let deviceToken = el.deviceToken;
	                var note = new apn.Notification();

	                note.expiry = Math.floor(Date.now() / 1000) + 3600;
	                note.badge = 1;
	                note.sound = "ping.aiff";

	                note.alert = "Hey beautiful! Check out "+artist.name+" latest update!";
	                note.payload = {'messageFrom': 'ThinkBeauty'};
	                note.topic = 'com.iOS.FootyFan';
	                apnProvider.send(note, deviceToken).then( (result) => {
	                  console.log(result);
	                  console.log(result.failed);
	                });
	            }
	        })        
            
        }
    });

	Update.whatsNewArtist = function(artistId, cb) {
		if(artistId) {
			Update.find({where:{artistId : artistId}}, function(err, updates){
				cb(null, updates);
			})
		} else {
			cb(null, {"message" : "Artist Id required."})
		}
	}
	Update.remoteMethod('whatsNew', {
          http: {path: '/whatsNew', verb: 'get'},
          accepts: [
              {arg: 'userId', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });

    Update.remoteMethod('whatsNewArtist', {
          http: {path: '/whatsNewArtist', verb: 'get'},
          accepts: [
              {arg: 'artistId', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });
};
