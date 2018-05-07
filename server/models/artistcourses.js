'use strict';

module.exports = function(Artistcourses) {
	Artistcourses.getArtistWithCourses = function(date, country, cb) {
		let whereCondition = {};
		if(date) {
			whereCondition = {"startfrom" : new Date(date)};
		}
		let whereCountry = {include:"countries"};
		if(country) {
			whereCountry = {include:"countries", where: {country : country}}
		}

		Artistcourses.find(
				{
					include: [{
						relation: 'members',
						scope: whereCountry
			        },
			        {
			        	relation: 'filestorages', // include the owner object
           				scope: { 
            				where: {uploadType: 'course', status : 'active'} 
           
          				}}],
			        where : whereCondition
		      }, function(err, results){
		      cb(null, results);
        });
	}

	Artistcourses.getCourseById = function(id, date, country, cb) {
		let whereCondition = {};
		if(date) {
			whereCondition = {"startfrom" : new Date(date)};
		}
		let whereCountry = {include:"countries"};
		if(country) {
			whereCountry = {include:"countries", where: {country : country}}
		}

		Artistcourses.find(
				{
					include: [{
						relation: 'members',
						scope: whereCountry
			        },
			        {
			        	relation: 'filestorages', // include the owner object
           				scope: { 
            				where: {uploadType: 'course', status : 'active'} 
           
          				}}],
			        where : {and :[{id : id} ,whereCondition]}
		      }, function(err, results){
			if(result) {
				let resultData =  JSON.stringify(result);
				let finalData = JSON.parse(resultData);
				var newArray = finalData.filter(function (el) {
					var startHour = moment(el.timeslotFrom, ["h:mm A"]).format("HH"); 
					var startHourMinute = moment(el.timeslotFrom, ["h:mm A"]).format("mm"); 

					var endHour = moment(el.timeslotTo, ["h:mm A"]).format("HH"); 
					var endHourMinute = moment(el.timeslotTo, ["h:mm A"]).format("mm");
					var startTime = moment().utc().set({hour:startHour,minute:startHourMinute});
              		var endTime = moment().utc().set({hour:endHour,minute:endHourMinute});
              		var timeStops = [];
              		while(startTime <= endTime) {
		                timeStops.push(new moment(startTime).format('HH:mm'));
		                startTime.add(30, 'minutes');
		              }
		            newArray[0].availabilitySlots = timeStops;
					return true;  
				});
			}
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

  	Artistcourses.remoteMethod('getCourseById', {
          http: {path: '/getCourseById', verb: 'post'},
          accepts: [
          		{arg: 'id', type: 'string'},
          		{arg: 'date', type: 'string'},
              	{arg: 'country', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });
};
