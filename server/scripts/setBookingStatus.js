'use strict';


const Fs = require('fs');
var async = require('async');
var moment = require('moment');
const app = require('../server.js');
var schedule = require('node-schedule');
//var schedule = require('node-schedule');

const {bookingStatus, Member, Artistavailability} = app.models;
var j = schedule.scheduleJob('*/5 * * * * *', function(){
	// Wait for every model to finish loading

	console.log('asd');
	process.nextTick(async () =>
	{	
		// Fetch all admins
		const bookingStatusData = await bookingStatus.find({where : {"fullyBooked": false}});
		let bookingStatusFinalData = JSON.stringify(bookingStatusData);
        bookingStatusFinalData = JSON.parse(bookingStatusFinalData);
        var finalSlots = [];

        if(bookingStatusFinalData.length) {
            bookingStatusFinalData.forEach(function (bStatus, index, array) {
            	let filterWithDate = {}
            	let whereDate = {}
            	Artistavailability.find({where: {date: new Date(bStatus.date), memberId : bStatus.artistId}}, function(err, avail){
            		console.log(avail);
            		if(avail.length == 0) {
		    			let dayNumber = moment(bStatus.date).day();
		                let weekends = [5,6];
		                
		                if (weekends.indexOf(dayNumber) > -1) {
		                    whereDate = {
		                        where: {
		                            days: "weekend"
		                        }
		                    }
		                } else {
		                    whereDate = {
		                        where: {
		                            days: "working"
		                        }
		                    }
		                }
		                
			        } else {
			        	whereDate = {where: {date: bStatus.date, days: "specificDate"}};
			        }

			    filterWithDate = {
			                relation: 'artistavailabilities',
			                scope : whereDate
			            };

			    console.log(filterWithDate);
                Member.find({
                include: [	filterWithDate, 
                			{
		                        relation: 'bookingslots', // include the owner object
		                        scope: {
		                            where: {
		                                bookingDate: new Date(bStatus.date)
		                            }
		                        }
	                   		}],
	                   	where : {
	                   		id : bStatus.artistId
	                   	}
	                   }
	                   	, function(err, result){
	                   		let data = JSON.stringify(result);
			            	let finalData = JSON.parse(data);

			            	var newArray = finalData.filter(function(el) {
			            		let slotsData = JSON.stringify(el.bookingslots);
	                            slotsData = JSON.parse(slotsData);
	                            var finalSlots = [];

	                            if(slotsData.length) {
	                                let slotData = slotsData.filter(function(el) {
	                                    finalSlots = finalSlots.concat(el.slots);
	                                    return true;
	                                })    
	                            }
	                            console.log(el.artistavailabilities);
	                            finalSlots = finalSlots.filter((x, i, a) => a.indexOf(x) == i);
	                            var timeStops = [];
			            		let artistavailabilities = JSON.stringify(el.artistavailabilities);
				                artistavailabilities = JSON.parse(artistavailabilities)
				                artistavailabilities = artistavailabilities.filter(function(elInner) {
				                	console.log(elInner);
				                	var startHour = moment(elInner.hoursfrom, ["h:mm A"]).format("HH");
		                        var startHourMinute = moment(elInner.hoursfrom, ["h:mm A"]).format("mm");

		                        var endHour = moment(elInner.hoursto, ["h:mm A"]).format("HH");
		                        var endHourMinute = moment(elInner.hoursto, ["h:mm A"]).format("mm");


		                        var startTime = moment().utc().set({
		                            hour: startHour,
		                            minute: startHourMinute
		                        });
		                        var endTime = moment().utc().set({
		                            hour: endHour,
		                            minute: endHourMinute
		                        });

		                        

		                        while (startTime <= endTime) {
		                            timeStops.push(new moment(startTime).format('HH:mm'));
		                            startTime.add(60, 'minutes');
		                        }

		                        timeStops.splice(-1,1);

		                        var breakStartHour = moment(elInner.breakfrom, ["h:mm A"]).format("HH");
		                        var breakStartHourMinute = moment(elInner.breakfrom, ["h:mm A"]).format("mm");
		                        var breakEndHour = moment(elInner.breakto, ["h:mm A"]).format("HH");
		                        var breakEndHourMinute = moment(elInner.breakto, ["h:mm A"]).format("mm");

		                        var startTime = moment().utc().set({
		                            hour: breakStartHour,
		                            minute: breakStartHourMinute
		                        });
		                        var endTime = moment().utc().set({
		                            hour: breakEndHour,
		                            minute: breakEndHourMinute
		                        });
		                        var inputDate = new Date(data.date);
		                        var todaysDate = new Date();
		                        if(inputDate.setHours(0,0,0,0) == todaysDate.setHours(0,0,0,0)) {
		                            
		                            //console.log(n);
		                            timeStops = timeStops.filter(function(el) {
		                                
		                                return parseInt(el) > parseInt(data.currentHour);
		                            });

		                        }

		                        var breakTimeStops = [];

		                        while (startTime <= endTime) {
		                            breakTimeStops.push(new moment(startTime).format('HH:mm'));
		                            startTime.add(60, 'minutes');
		                        }

		                        breakTimeStops.splice(-1,1);
		                        timeStops = timeStops.filter(function(el) {
		                            return breakTimeStops.indexOf(el) < 0;
		                        });
				                })

				                timeStops = timeStops.filter((x, i, a) => a.indexOf(x) == i);
				                console.log(finalSlots);
				                console.log(timeStops);
				                if(timeStops.length == finalSlots.length) {
				                	console.log(bStatus);
				                	bookingStatus.findOne({where : {id : bStatus.id}}, function(err, res){
				                		res.fullyBooked = true;
				                		res.save();
				                	});
				                }
				                return true;
			            	})
	                   	});
            	});
        	})    
        }
    })
})

		