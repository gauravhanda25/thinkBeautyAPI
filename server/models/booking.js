'use strict';

const app = require('../server.js');
var async = require('async');
const moment = require('moment');
var voucher_codes = require('voucher-code-generator');
module.exports = function(Booking) {
	Booking.cancelBooking = function(bookingId, userId, cb) {
		const {Voucher} = app.models;
		Booking.findOne({where : {id : bookingId}}, function(err, booking){
			booking.updateAttribute('bookingStatus', 'cancelled');
			booking.updateAttribute('cancelledBy', userId);

			var voucherCode = voucher_codes.generate({
							    prefix: "TB",
							    postfix: "-"+ moment().year()
							});

			var currentDate = moment(new Date());
			var expiredOn = moment(currentDate).add(1, 'Y').format('YYYY/mm/dd');
			Voucher.create({"userId" : booking.userId, "artistId" : booking.artistId, "amount" : booking.totalPrice, bookingId: bookingId, bookingDate: booking.bookingDate, "expiredOn": expiredOn, voucherCode : voucherCode[0] })

			cb(null, {'message' : 'booking cancelled successfully!'})
		})
	}

	Booking.remoteMethod('cancelBooking', {
          http: {path: '/cancelBooking', verb: 'get'},
          accepts: [
              {arg: 'bookingId', type: 'string'},
              {arg: 'userId', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });

    Booking.observe('after save',  function(ctx, next)
	{
		const booking = ctx.instance || ctx.data;
		const {CustomerPoint, Artistservices, BookingSlot} = app.models;
    	if (ctx.isNewInstance){
    		CustomerPoint.create({"userId" : booking.userId, "artistId" : booking.artistId, "points" : parseInt(booking.totalPrice), bookingId: booking.id, bookingDate: booking.bookingDate });

    		if(booking.serviceType !== 'gcc') {
    			var slots = [];
    			console.log(booking.artistServiceId)
    			async.eachSeries(booking.artistServiceId,   function (item, callback) {
    			//booking.artistServiceId.forEach(function(item) {
    			   var whereObj = {
    			   	"where" : {
    			   		"id" : item.serviceId
    			   	}
    			   }

				   Artistservices.findOne(whereObj, function(err, data){
				   	console.log(data);
				   	var durationString = '';
				   	if(booking.serviceType == 'home') {
				   		durationString = data.homeduration;
				   	} else if(booking.serviceType == 'salon') {
				   		durationString = data.salonduration;
				   	}
				   		if(durationString != '') {
				   			console.log(durationString);

				   			// booking is in hours and mins combination
				   			if(durationString.indexOf('hr ') > -1  && durationString.indexOf('mins') > -1) {
				   				durationString = durationString.replace(' hr ', '|');
				   				durationString = durationString.replace(' mins', '');
				   				durationString = durationString.split('|');

				   				var hours = parseInt(durationString[0]);
				   				var mins = parseInt(durationString[1]);
				   				console.log(hours, mins);
				   				var totalHours = hours + (mins/60);
				   			} else if(durationString.indexOf('hr ') == -1  &&  durationString.indexOf('hrs') == -1 && durationString.indexOf('mins') > -1){
				   				var mins = parseInt(durationString.replace(' mins', ''));
				   				console.log( mins);
				   				var totalHours = (mins/60);
				   			} else if(durationString.indexOf('hr ') == -1  &&  durationString.indexOf('hrs') > -1 && durationString.indexOf('mins') > -1){
				   				durationString = durationString.replace(' hrs', '|');
				   				durationString = durationString.replace(' mins', '');
				   				durationString = durationString.split('|');

				   				var hours = parseInt(durationString[0]);
				   				var mins = parseInt(durationString[1]);
				   				console.log(hours, mins);
				   				
				   				var totalHours = hours + (mins/60);
				   			} else if(durationString.indexOf('hr ') == -1  &&  durationString.indexOf('hrs') > -1 && durationString.indexOf('mins') == -1){
				   				var hours = parseInt(durationString.replace(' hrs', ''));
				   				console.log(hours);
				   				var totalHours = hours;
				   			} else if(durationString.indexOf('hr ') > -1  &&  durationString.indexOf('hrs') == -1 && durationString.indexOf('mins') == -1){
				   				var hours = parseInt(durationString.replace(' hr', ''));
				   				console.log(hours);
				   				var totalHours = hours;
				   			}
				   			console.log("duration -- " + totalHours);

				   			var startHour = moment(booking.bookingStartTime, ["h:mm A"]).format("HH"); 
				   			var endHour = moment(booking.bookingStartTime, ["h:mm A"]).add(totalHours, 'hours');
				   			var endHourFormatted = moment(endHour, ["h:mm A"]).format("HH"); 
				            var startHourMinute = moment(booking.bookingStartTime, ["h:mm A"]).format("mm"); 
				              
				            //console.log(startHour, endHour, endHourFormatted)
				            var endHourMinute = moment(endHour, ["h:mm A"]).format("mm");

				   			var startTime = moment().utc().set({hour:startHour,minute:startHourMinute});
							var endTime = moment().utc().set({hour:endHourFormatted,minute:endHourMinute});

							var timeStops = [];

							while(startTime <= endTime) {
								timeStops.push(new moment(startTime).format('HH:mm'));
								startTime.add(30, 'minutes');
							}
							//slots.push(timeStops);
							console.log("I am in if")
							BookingSlot.create({"userId" : booking.userId, "artistId" : booking.artistId, "slots" : timeStops, bookingId: booking.id, bookingDate: booking.bookingDate });
							callback();
							//console.log(timeStops);
				   		} else {
				   			console.log("I am in else")
				   			BookingSlot.create({"userId" : booking.userId, "artistId" : booking.artistId, "slots" : [], bookingId: booking.id, bookingDate: booking.bookingDate });
							callback();
				   		}
				   })
				   
				}, function(error){
				   	next();				   		
				});
				//console.log(slots);
    		}
    	}
    });
};
