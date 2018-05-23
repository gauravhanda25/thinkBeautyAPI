'use strict';

const app = require('../server.js');
var async = require('async');
const moment = require('moment');
var voucher_codes = require('voucher-code-generator');
module.exports = function(Booking) {
	Booking.cancelBooking = function(bookingId, userId, cb) {
		const {Voucher} = app.models;
		Booking.findOne({where : {id : bookingId}}, function(err, booking){
			booking.bookingStatus = 'cancelled';
			booking.cancelledBy =  userId;
			booking.save();

			var voucherCode = voucher_codes.generate({
							    prefix: "TB",
							    postfix: "-"+ moment().year()
							});

			var currentDate = moment(new Date());
			var expiredOn = moment(currentDate).add(1, 'Y').format('YYYY/mm/dd');
			Voucher.create({"userId" : booking.userId, "artistId" : booking.artistId, "amount" : booking.totalPrice, bookingId: bookingId, bookingDate: booking.bookingDate, "expiredOn": expiredOn, voucherCode : voucherCode[0], status : "active" })

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
	

	Booking.bookAndPay = function(data, cb) {
		console.log('asdasda---------');
		Booking.findOne({where : {id : data.bookingId}}, function(err, booking){
			if(booking) {
				/* save other booking parameters */
				booking.transactionId = data.transactionId;
				booking.transactionStatus = data.transactionStatus;
				booking.servicePrice = data.servicePrice;
				booking.commission = data.commission;
				booking.totalPrice = data.totalPrice;
				booking.amountPaid = data.amountPaid;
				booking.amountRemaining = data.amountRemaining;
				booking.fixedCharge = data.fixedCharge;
				booking.voucherId = data.voucherId;
				booking.discountedPrice = data.discountedPrice;

				booking.save(); /*save booking here*/


				const {CustomerPoint, Artistservices, BookingSlot, Voucher} = app.models;
	    		CustomerPoint.create({"userId" : booking.userId, "artistId" : booking.artistId, "points" : parseInt(booking.totalPrice), bookingId: booking.id, bookingDate: booking.bookingDate });

	    		if(booking.serviceType !== 'gcc') {
	    			var slots = [];
	    			console.log(booking.artistServiceId)
	    			async.eachSeries(booking.artistServiceId,  function (item, callback) {
	    			//booking.artistServiceId.forEach(function(item) {
	    			   var whereObj = {
	    			   	"where" : {
	    			   		"id" : item.serviceId
	    			   	}
	    			   }

					   Artistservices.findOne(whereObj, function(err, data){
					   	console.log(data);
					   	var durationString = (data.duration) ? data.duration : '';
					   	
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
						if(booking.voucherId) {
							Voucher.findOne({where : {id : booking.voucherId}}, function(err, voucher){
								voucher.status = 'false';
								voucher.save();
							})
						}
					   	cb(null, {"message" : "Booking is successfully made", "status" : 1});				   		
					});
					//console.log(slots);
	    		} else {
	    			BookingSlot.create({"userId" : booking.userId, "artistId" : booking.artistId, "slots" : [], bookingId: booking.id, bookingDate: booking.bookingDate }, function(err, data){
	    				if(!err) {
	    					next();
	    				}
	    			});
	    		}
			} else {
				cb(null, {"message" : "No Booking found with this booking id", "status" : 0});
			}
		});	
	}


	Booking.verifyBooking = function(data, cb) {
		console.log(data);
		const {BookingSlot, Artistservices} = app.models;
		if(data.servicetype == 'gcc') {
			console.log('I am in if');
			BookingSlot.findOne({where : {bookingDate : data.bookingDate, artistId : data.artistId}}, function(err, slotData){
				console.log(err, data);
				if(slotData) {
					cb(null, {"message" : "Artist is already booked for this date", "status" : 0});
				} else {
					data.status = 'pending';
					Booking.create(data, function(err, createdData){
						console.log(err, createdData)
						if(!err) {
							cb(null, createdData);							
						}
					})
					//cb(null, {"message" : "No booking found on this date", "status" : 1});
				}
			})
		} else{
			
			BookingSlot.findOne({where : {bookingDate : data.bookingDate, artistId : data.artistId}}, function(err, slotsData){
				if(slotsData) {
					console.log('here i am');
					Artistservices.findOne({where:{id : data.artistServiceId[0].serviceId}}, function(err, serviceData){
						if(serviceData) {
							var durationString = (serviceData.duration) ? serviceData.duration : '';
					   		if(durationString != '') {
					   			console.log('here i am asd');
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
					   			} else if(durationString.indexOf(' hr') > -1  &&  durationString.indexOf('hrs') == -1 && durationString.indexOf('mins') == -1){
					   				var hours = parseInt(durationString.replace(' hr', ''));
					   				console.log(hours);
					   				var totalHours = hours;
					   			}
					   			console.log("duration -- " + totalHours);

					   			var startHour = moment(data.bookingStartTime, ["h:mm A"]).format("HH"); 
					   			var endHour = moment(data.bookingStartTime, ["h:mm A"]).add(totalHours, 'hours');
					   			var endHourFormatted = moment(endHour, ["h:mm A"]).format("HH"); 
					            var startHourMinute = moment(data.bookingStartTime, ["h:mm A"]).format("mm"); 
					              
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
								
								let slots = slotsData.slots;
								let found = timeStops.some(r=> slots.includes(r));
								console.log(slots, found)
								if(found) {
									cb(null, {"message" : "Artist is already booked for this date", "status" : 0});
								} else {
									data.status = 'pending';
									Booking.create(data, function(err, createdData){
										console.log(err, createdData)
										if(!err) {
											cb(null, createdData);							
										}
									})
								}
					   		} else {
					   			data.status = 'pending';
					   			Booking.create(data, function(err, createdData){
					   				console.log(err, createdData)
									if(!err) {
										cb(null, createdData);							
									}
								})
					   		}
				   		} else {
				   				data.status = 'pending';
					   			Booking.create(data, function(err, createdData){
					   				console.log(err, createdData)
									if(!err) {
										cb(null, createdData);							
									}
								})
				   		}	
					})
					// check slots are matching bookingTime
				} else {
					Booking.create(data, function(err, createdData){
						console.log(err, createdData)
						if(!err) {
							cb(null, createdData);							
						}
					})
			}
		})
	}
}
	Booking.remoteMethod('verifyBooking', {
          http: {path: '/verifyBooking', verb: 'post'},
          accepts: [
              {arg: '', type: 'object', http: { source: 'body' }}],
          returns: {arg: 'data', type: 'json'}
    });

    Booking.remoteMethod('bookAndPay', {
          http: {path: '/bookAndPay', verb: 'post'},
          accepts: [
              {arg: '', type: 'object', http: { source: 'body' }}],
          returns: {arg: 'data', type: 'json'}
    });


    Booking.applyVoucher = function(data, cb) {
		const {Voucher} = app.models;
		Voucher.findOne({where : {id : data.id, artistId : data.artistId, userId: data.userId}}, function(err, data){
			if(data) {
				var date = new Date();
				var expiryDate = new Date(data.expiredOn);
				if(expiryDate > date){
					cb(null, {"message" : "Voucher exists", price : data.amount, status : 1});
				} else {
					cb(null, {"message" : "Voucher expired.", price : data.amount, status : 0});
				}
				
			} else {
				cb(null, {"message" : "Applied voucher do not exists .", price : 0, status : 3});
			}
		})
	}
	Booking.remoteMethod('applyVoucher', {
          http: {path: '/applyVoucher', verb: 'post'},
          accepts: [
              {arg: '', type: 'object', http: { source: 'body' }}],
          returns: {arg: 'data', type: 'json'}
    });
};
