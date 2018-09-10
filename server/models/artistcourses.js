'use strict';

const app = require('../server.js');
var async = require('async');
const moment = require('moment');
var voucher_codes = require('voucher-code-generator');
const bookingTemp = require('../templates/emails/booking.js');
const inlineCss = require('inline-css');

module.exports = function(Artistcourses) {
	Artistcourses.bookCourse = async function(data, cb) {
		const {Booking, CustomerPoint, Artistservices, BookingSlot, Voucher, Member} = app.models;
		if(data.courseId) {
			var totalGuests = 0;
			var course = await Artistcourses.findOne({where : {id : data.courseId}});
			let currencyCodes = {
	            "Kuwait": "KD",
	            "Bahrain": "BHD",
	            "UAE": "AED",
	            "Oman": "OMR"
	        }

			if(course) { // check if course is available or not
				var bookings = await Booking.find({where:{type : 'course', courseId : data.courseId, bookingStatus : "success"}});
				var artistData = await Member.findOne({where:{id : data.artistId},include : ['countries', 'provinces']});
				let dataArtist = JSON.stringify(artistData);
				artistData = JSON.parse(dataArtist)
				let currencyCode = '';
				if (artistData.countries.name == 'Saudi Arabia') {
                     currencyCode = 'SAR';
                } else {
                     currencyCode = currencyCodes[artistData.countries.name];
                }
				var courseStartFrom = moment(new Date(course.startfrom)).format('dddd DD MMMM, YYYY');
				var courseEndOn = moment(new Date(course.endon)).format('dddd DD MMMM, YYYY');
				var courseDate = courseStartFrom +" to "+ courseEndOn;
				var serviceData = "Course: "+ course.name + " by "+ artistData.name.charAt(0).toUpperCase() + artistData.name.slice(1);
				var name = data.guestName.charAt(0).toUpperCase() + data.guestName.slice(1);
				var locationStr = 'Location : '+artistData.villa+', '+artistData.road+', '+artistData.block+', '+artistData.provinces.name+', '+artistData.countries.name;

				var text = "";
				if(bookings) {  // if booking already made for this course
					let resultData =  JSON.stringify(bookings);
					let finalData = JSON.parse(resultData);
					var newArray = finalData.filter(function (el) {
						totalGuests = parseInt(totalGuests) + parseInt(el.guestNumber);
					})
					
					var guestsAvailableNumber = course.guestno - totalGuests;
					console.log(course.guestno, totalGuests, data.guestNumber );
					if(course.guestno > totalGuests && (course.guestno - totalGuests) >= data.guestNumber) {
						var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

						for (var i = 0; i < 8; i++){
						    text += possible.charAt(Math.floor(Math.random() * possible.length));
						}
						
						var booking = await Booking.create({
							userId : data.userId,
							courseId : data.courseId,
							guestNumber : data.guestNumber,
							type : "course",
							bookingStatus : "success",
							amountPaid : data.amountPaid,
							voucherId : data.voucherId,
							guestName : data.guestName,
							guestEmail : data.guestEmail,
							transactionId : data.transactionId,
							mobilenumber : data.mobilenumber,
							transactionStatus : data.transactionStatus,
							bookingReference : text,
							bookingDate : new Date(data.bookingDate),
							artistId : data.artistId
						});
							/*if(booking.amountPaid) {
								CustomerPoint.create({"userId" : data.userId, "artistId" : data.artistId, "points" : data.amountPaid, bookingId: booking.id, bookingDate: new Date(), type: "course"  });
							}*/
					booking.timeslotFrom = course.timeslotFrom;
					booking.timeslotTo = course.timeslotTo;
					const template = bookingTemp(booking, courseDate , serviceData , name, locationStr, currencyCode);

                    const {
                        Email
                    } = app.models;
                    const subject = 'Think Beauty: Booking confirmed!';
                    inlineCss(template, {
                            url: 'http://example.com/mushroom'
                        })
                        .then(function(html) {
                            Email.send({
                                to: booking.guestEmail,
                                from: app.get('email'),
                                subject,
                                html: html
                            }, (err) => {
                                if (err) {
                                    console.log('ERROR sending account verification', err);
                                }
                                // email sent
                                //return resolve();
                                console.log('> Email Sent to !! >>' + booking.guestEmail)
                                //next();
                            });
                        });
						return {"message" : "Booking is successfully made", "status" : 1 , 'bookingReference' : text};						
					} else {
						var seats = 'seats';
						if(guestsAvailableNumber > 1) {
							seats = 'Only '+guestsAvailableNumber+' seats available.';

						} else if(guestsAvailableNumber == 1) {
							seats = 'Only '+guestsAvailableNumber+' seat available.';
						} else {
							seats = 'No seats available.'
						}
						return {"message" : seats, "status" : 0, 'guestsAvailable' : guestsAvailableNumber};
					}
				} else {  // Course wasnt booked before ever
					var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

					for (var i = 0; i < 8; i++){
					    text += possible.charAt(Math.floor(Math.random() * possible.length));
					}

					var booking = await Booking.create({
						userId : data.userId,
						courseId : data.courseId,
						guestNumber : data.guestNumber,
						type : "course",
						bookingStatus : "success",
						amountPaid : data.amountPaid,
						voucherId : data.voucherId,
						guestName : data.guestName,
						guestEmail : data.guestEmail,
						transactionId : data.transactionId,
						transactionStatus : data.transactionStatus,
						bookingReference : text,
						bookingDate : data.bookingDate,
						artistId : data.artistId
					});
					booking.timeslotFrom = course.timeslotFrom;
					booking.timeslotTo = course.timeslotTo;

					const template = bookingTemp(booking, courseDate , serviceData +' by '+ artistData.name.charAt(0).toUpperCase() + artistData.name.slice(1), name, locationStr, currencyCode);

                    const {
                        Email
                    } = app.models;
                    const subject = 'Think Beauty: Booking confirmed!';
                    inlineCss(template, {
                            url: 'http://example.com/mushroom'
                        })
                    .then(function(html) {
                        Email.send({
                            to: booking.guestEmail,
                            from: app.get('email'),
                            subject,
                            html: html
                        }, (err) => {
                            if (err) {
                                console.log('ERROR sending account verification', err);
                            }
                            // email sent
                            //return resolve();
                            console.log('> Email Sent to !! >>' + booking.guestEmail)
                            //next();
                        });
                    });

					if(booking.amountPaid) {
						CustomerPoint.create({"userId" : booking.userId, "artistId" : booking.artistId, "points" : booking.amountPaid, bookingId: booking.id, bookingDate: booking.bookingDate, serviceType: booking.serviceType, service : booking.service  });
					}
					
						
						/*if(data.voucherId) {  // if voucher used for booking
							var currentDate = moment(new Date());
							var expiredOn = moment(currentDate).add(1, 'Y').format('YYYY-MM-DD');
							Voucher.findOne({where : {id : booking.voucherId}}, function(err, voucher){
								voucher.status = 'false';
								voucher.save();
								voucherAmount = parseInt(voucher.amount);
								serviceAmount = parseInt(course.price);
								if(voucherAmount > serviceAmount) {
									var voucherCode = voucher_codes.generate({
									    prefix: "TB"
									});
									Voucher.create({"userId" : voucher.userId, "artistId" : voucher.artistId, "amount" : voucherAmount-serviceAmount, bookingId: voucher.bookingId, bookingDate: voucher.bookingDate, "expiredOn": expiredOn, voucherCode : voucherCode[0], status : "active" });
								}
							})
						}*/
						return {"message" : "Booking is successfully made", "status" : 1 , 'bookingReference' : text};
					}			
				
			} else {
				return {"message" : "Course not found.", "status" : 0, 'guestsAvailable' : 0};
			}
		} else {
			return {"message" : "Course Id is required.", "status" : 0};
		}
	}

	Artistcourses.verifyCourse = function(courseId, cb) {
		const {Booking} = app.models;
		if(courseId) {
			var totalGuests = 0;
			Artistcourses.findOne({where : {id : courseId}}, function(err, course){
				if(course) {
					Booking.find({where:{type : 'course', artistCourseId : courseId}}, function(err, bookings){
						if(bookings) {
							let resultData =  JSON.stringify(bookings);
							let finalData = JSON.parse(resultData);
							var newArray = finalData.filter(function (el) {
								totalGuests += el.guestNumber;
							})
							if(course.guestno > totalGuests) {
								cb(null, {"message" : "Course is available.", "status" : 1, 'guestsAvailable' : course.guestno - totalGuests});
							} else {
								cb(null, {"message" : "Course is not available.", "status" : 0, 'guestsAvailable' : 0});
							}
						} else {
							cb(null, {"message" : "Course is available.", "status" : 1, 'guestsAvailable' : course.guestno});
						}				
					})
					
				} else {
					cb(null, {"message" : "Course is not available.", "status" : 0, 'guestsAvailable' : 0});
				}
			})
		} else {
			cb(null, {"message" : "Course Id is required.", "status" : 0});
		}
	}


	Artistcourses.getArtistWithCourses = async function(date, country, cb) {
		let currencyCodes = {
                        "Kuwait" : "KWD",
                        "Bahrain" : "BHD",
                        "UAE" : "AED",
                        "Oman" : "OMR"
                      }
		let whereCondition = {};
		if(date) {
			whereCondition = {"startfrom" : new Date(date)};
		}
		let whereCountry = {include:[{relation : "countries"},{
			            	"relation" : "filestorages",
			            	scope : {
			            		where : {status : "active", uploadType : "profile"}	
			            	}
			            }]}
		if(country) {
			whereCountry = {include:[{relation : "countries", where: {country : country}},{
			            	"relation" : "filestorages",
			            	scope : {
			            		where : {status : "active", uploadType : "profile"}	
			            	}
			            }]}
		}

		var results = await Artistcourses.find(
			{
				include: [{
					relation: 'members',
					scope: whereCountry
		        },
		        {
		        	relation: 'filestorages', // include the owner object
       				scope: { 
        				where: {uploadType: 'course', status : 'active'} 
       
      				}},
      			{
      				relation: 'bookings'
      			}],
		        where : whereCondition
	      });

      	let resultData =  JSON.stringify(results);
		let finalData = JSON.parse(resultData);
		var newArray = finalData.filter(function (el) {
			if(el.members) {
				if(el.members.countries.name == 'Saudi Arabia') {
					el.currencyCode = 'SAR';
				} else {
					el.currencyCode = currencyCodes[el.members.countries.name]; 
				}
				if(el.bookings) { // check if course is fully booked or not
				 	let bookingData =  JSON.stringify(el.bookings);
					let bookingFinalData = JSON.parse(bookingData);
					var totalGuests = 0;
					var newArray1 = bookingFinalData.filter(function (el) {
						totalGuests += parseInt(el.guestNumber);
					})
					console.log(el.guestno, totalGuests, 'for course'+ el.name);
					if(el.guestno > totalGuests) {
						return true;
					} else {
						return false;
					}
				} else {
					return true;	
				}
				
			}
		});
      	return  newArray;
	}

	Artistcourses.getCourseById = function(data, cb) {
		let currencyCodes = {
                        "Kuwait" : "KD",
                        "Bahrain" : "BHD",
                        "UAE" : "AED",
                        "Oman" : "OMR"
                      }
		let whereCondition = {};
		if(data.date) {
			whereCondition = {"startfrom" : new Date(data.date)};
		}
		let whereCountry = {include:"countries"};
		if(data.country) {
			whereCountry = {include:"countries", where: {country : data.country}}
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
			        where : {and :[{id : data.id} ,whereCondition]}
		      }, function(err, results){
			if(results) {
				console.log(results);
				let resultData =  JSON.stringify(results);
				let finalData = JSON.parse(resultData);
				var newArray = finalData.filter(function (el) {
	                
	                  if(el.members.countries.name == 'Saudi Arabia') {
	                    el.currencyCode = 'SAR';
	                  } else {
	                    el.currencyCode = currencyCodes[el.members.countries.name]; 
	                  }
	                      
	                           

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
		            el.availabilitySlots = timeStops;
		            if(el.members){
						return true;
					}
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
              {arg: '', type: 'object', http: { source: 'body' }}],
          returns: {arg: 'data', type: 'json'}
    });

    Artistcourses.remoteMethod('bookCourse', {
          http: {path: '/bookCourse', verb: 'post'},
          accepts: [
              {arg: '', type: 'object', http: { source: 'body' }}],
          returns: {arg: 'data', type: 'json'}
    });

    Artistcourses.remoteMethod('verifyCourse', {
          http: {path: '/verifyCourse', verb: 'get'},
          accepts: [
              {arg: 'courseId', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });

    
};
