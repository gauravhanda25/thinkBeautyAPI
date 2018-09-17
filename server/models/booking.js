'use strict';

const app = require('../server.js');
var async = require('async');
var apn = require('apn');
var gcm = require('node-gcm');
var fcmArtistKey = new gcm.Sender(app.get('fcmArtistKey'));
var fcmUserKey = new gcm.Sender(app.get('fcmUserKey'));
const moment = require('moment');
var voucher_codes = require('voucher-code-generator');
const inlineCss = require('inline-css');
const bookingTemp = require('../templates/emails/booking.js');
module.exports = function(Booking) {
    Booking.myBookings = function(userId, cb) {

        let currencyCodes = {
            "Kuwait": "KWD",
            "Bahrain": "BHD",
            "UAE": "AED",
            "Oman": "OMR"
        }
        var d = new Date();
        d.setDate(d.getDate() - 1);
        if (userId) {
            Booking.find({
                where: {
                    bookingDate: {
                        lt: d
                    },
                    userId: userId,
                },
                order: 'created asc',
                include: [{
                        relation: 'members', // include the owner object
                        scope: {
                            include: [{
                                    "relation": "countries",
                                },
                                {
                                    "relation": "filestorages",
                                    scope: {
                                        where: {
                                            status: "active",
                                            uploadType: "profile"
                                        }
                                    }
                                }, {
                                    "relation": "provinces"
                                }
                            ]
                        }
                    },
                    {
                        relation: 'artists', // include the owner object
                        scope: {
                            include: [{
                                    "relation": "countries"
                                },
                                {
                                    "relation": "filestorages",
                                    scope: {
                                        where: {
                                            status: "active",
                                            uploadType: "profile"
                                        }
                                    }
                                }, {
                                    "relation": "provinces"
                                }
                            ]
                        }
                    },
                    {
                        relation: "artistcourses"
                    }
                ]
            }, function(err, previousBookings) {
                Booking.find({
                    where: {
                        bookingDate: {
                            gte: d,
                        },
                        bookingStatus: "success",
                        userId: userId
                    },
                    order: 'created asc',
                    include: [{
                            relation: 'members', // include the owner object
                            scope: {
                                include: [{
                                        "relation": "countries",
                                    },
                                    {
                                        "relation": "filestorages",
                                        scope: {
                                            where: {
                                                status: "active",
                                                uploadType: "profile"
                                            }
                                        }
                                    }, {
                                        "relation": "provinces"
                                    }
                                ]
                            }
                        },
                        {
                            relation: 'artists', // include the owner object
                            scope: {
                                include: [{
                                        "relation": "countries",
                                    },
                                    {
                                        "relation": "filestorages",
                                        scope: {
                                            where: {
                                                status: "active",
                                                uploadType: "profile"
                                            }
                                        }
                                    },
                                    {
                                        "relation": "provinces"
                                    }
                                ]
                            }
                        },
                        {
                            relation: "artistcourses"
                        }
                    ]
                }, function(err, upcomingBookings) {
                    let upData = JSON.stringify(upcomingBookings);
                    let finalData = JSON.parse(upData);
                    upcomingBookings = finalData.filter(function(el) {
                        if (el.artists) {
                            if (el.artists.countries.name == 'Saudi Arabia') {
                                el.currencyCode = 'SAR';
                            } else {
                                el.currencyCode = currencyCodes[el.artists.countries.name];
                            }
                        }
                        return true;
                    })

                    let prevData = JSON.stringify(previousBookings);
                    let finalPrevData = JSON.parse(prevData);
                    previousBookings = finalPrevData.filter(function(el) {
                        if (el.artists) {
                            if (el.artists.countries.name == 'Saudi Arabia') {
                                el.currencyCode = 'SAR';
                            } else {
                                el.currencyCode = currencyCodes[el.artists.countries.name];
                            }
                        }
                        return true;
                    })
                    let bookings = {
                        upcoming: upcomingBookings,
                        previous: previousBookings
                    };
                    cb(null, bookings);
                });
            });
        } else {
            cb(null, {
                message: "UserId is required!"
            });
        }
    }



    Booking.cancelBooking = function(bookingId, userId, cb) {
        const {
            Voucher,
            BookingSlot,
            DeviceToken
        } = app.models;
        Booking.findOne({
            where: {
                id: bookingId
            }
        }, function(err, booking) {
            if (booking) {
                booking.bookingStatus = 'cancelled';
                booking.cancelledBy = userId;
                booking.save();

                var voucherCode = voucher_codes.generate({
                    prefix: "TB"
                });
                console.log(booking);
                var currentDate = moment(new Date());
                var expiredOn = moment(currentDate).add(1, 'Y').format('YYYY-MM-DD');
                Voucher.create({
                    "userId": booking.userId,
                    "artistId": booking.artistId,
                    "amount": parseFloat(booking.amountPaid),
                    bookingId: bookingId,
                    bookingDate: booking.bookingDate,
                    "expiredOn": expiredOn,
                    voucherCode: voucherCode[0],
                    status: "active"
                }, function(err, voucher) {
                    BookingSlot.destroyAll({bookingId : bookingId});
                    DeviceToken.findOne({where : {memberId : booking.artistId, osType: 'ios'}}, function(err, token){
                        if (token) {
                            var options = {
                              cert: app.get("artist_cert"),
                              key: app.get("artist_key"),
                              passphrase : app.get("artist_passphrase"),
                              production : true
                            };
                            var apnProvider =  new apn.Provider(options);

                            let deviceToken = token.deviceToken;

                            var note = new apn.Notification();

                            note.expiry = Math.floor(Date.now() / 1000) + 3600;
                            note.badge = 1;
                            note.sound = "ping.aiff";
                            note.alert = "Your appointment on "+moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY')+" at "+booking.bookingStartTime+" has been cancelled by the customer. ";
                            note.payload = {'messageFrom': 'ThinkBeauty'};
                            note.topic = 'com.ios.Think';
                            apnProvider.send(note, deviceToken).then( (result) => {
                              console.log(result);
                              console.log(result.failed);
                            });
                        } 
                    })
                    DeviceToken.findOne({where : {memberId : booking.artistId, osType: 'android'}}, function(err, token){
                        if(token) {
                            var message = new gcm.Message({
                                notification: {
                                  title : "Booking Cancelled"  ,
                                  icon : "ic_launcher",
                                  body : "Your appointment on "+moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY')+" at "+booking.bookingStartTime+" has been cancelled by the customer. "
                                } 
                            });
                             
                            // Specify which registration IDs to deliver the message to
                            var regTokens = [token];
                             
                            // Actually send the message
                            sender.send(message, { registrationTokens: regTokens }, function (err, response) {
                                if (err) console.error(err);
                                else console.log(response);
                            });
                        }
                    })

                    cb(null, {
                        'message': 'booking cancelled successfully!',
                        "voucher": voucher
                    })
                })
            } else {
                cb(null, {
                    'message': 'No Booking found with this booking id!'
                })
            }
        })
    }

    Booking.remoteMethod('cancelBooking', {
        http: {
            path: '/cancelBooking',
            verb: 'get'
        },
        accepts: [{
                arg: 'bookingId',
                type: 'string'
            },
            {
                arg: 'userId',
                type: 'string'
            }
        ],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });


    Booking.cancelBookingByArtist = function(bookingId, cb) {
        const {
            Voucher,
            BookingSlot,
            DeviceToken
        } = app.models;
        Booking.findOne({
            where: {
                id: bookingId
            }
        }, function(err, booking) {
            if (booking) {
                booking.bookingStatus = 'cancelled';
                booking.cancelledBy = booking.artistId;
                booking.save();
                BookingSlot.destroyAll({bookingId : bookingId});
                if(booking.userId) {

                DeviceToken.findOne({where : {memberId : booking.userId, osType: 'ios'}}, function(err, token){
                    if(token) {
                        var options = {
                          cert: app.get("user_cert"),
                          key: app.get("user_key"),
                          passphrase : app.get("user_passphrase"),
                          production : true
                        };
                        var apnProvider =  new apn.Provider(options);

                        let deviceToken = token.deviceToken;

                        var note = new apn.Notification();

                        note.expiry = Math.floor(Date.now() / 1000) + 3600;
                        note.badge = 1;
                        note.sound = "ping.aiff";

                        note.alert = "Hello beautiful, your appointment on "+moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY')+"  has been cancelled. The artist will contact you soon for refund!";
                        note.payload = {'messageFrom': 'ThinkBeauty'};
                        note.topic = 'com.iOS.FootyFan';
                        apnProvider.send(note, deviceToken).then( (result) => {
                          console.log(result);
                          console.log(result.failed);
                        });
                    }
                        
                    })
                }
                cb(null, {
                        'message': 'booking cancelled successfully!',
                    })
                /*var voucherCode = voucher_codes.generate({
                    prefix: "TB"
                });
                console.log(booking);
                var currentDate = moment(new Date());
                var expiredOn = moment(currentDate).add(1, 'Y').format('YYYY-MM-DD');
                Voucher.create({
                    "userId": booking.userId,
                    "artistId": booking.artistId,
                    "amount": parseFloat(booking.amountPaid),
                    bookingId: bookingId,
                    bookingDate: booking.bookingDate,
                    "expiredOn": expiredOn,
                    voucherCode: voucherCode[0],
                    status: "active"
                }, function(err, voucher) {*/

                    
               // })
            } else {
                cb(null, {
                    'message': 'No Booking found with this booking id!'
                })
            }
        })
    }

    Booking.remoteMethod('cancelBookingByArtist', {
        http: {
            path: '/cancelBookingByArtist',
            verb: 'get'
        },
        accepts: [{
                arg: 'bookingId',
                type: 'string'
            }
        ],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });

    Booking.bookAndPay = function(data, cb) {
        const {
            CustomerPoint,
            Artistservices,
            BookingSlot,
            DeviceToken,
            Voucher,
            bookingStatus
        } = app.models;

        let currencyCodes = {
            "Kuwait": "KD",
            "Bahrain": "BHD",
            "UAE": "AED",
            "Oman": "OMR"
        }


        Booking.findOne({
            where: {
                id: data.bookingId
            }
        }, function(err, booking) {
            if (booking) {
                BookingSlot.findOne({
                    where: {
                        bookingDate: new Date(booking.bookingDate),
                        artistId: booking.artistId
                    }
                }, function(err, slotData) {
                    if (slotData && booking.serviceType == 'gcc') {
                        cb(null, {
                            "message": "Artist is already booked for this date",
                            "status": 0
                        })
                    } else {
                        console.log("slotsData >> "+slotData);
                        if((slotData && slotData.slots.indexOf(booking.bookingStartTime) == -1) || !slotData ){                                            
                                            /* save other booking parameters */
                                            booking.transactionId = data.transactionId;
                                            booking.transactionStatus = data.transactionStatus;
                                            /*booking.servicePrice = data.servicePrice;
                                            booking.commission = data.commission;
                                            booking.totalPrice = data.totalPrice;
                                            booking.amountPaid = data.amountPaid;
                                            booking.amountRemaining = data.amountRemaining;*/
                                            //booking.updateAttribute({amountPaid:data.amountPaid});
                                            booking.amountPaid = data.amountPaid;
                                            booking.amountRemaining = data.amountRemaining;
                                            booking.fixedCharge = data.fixedCharge;
                                            booking.voucherId = data.voucherId;
                                            /*booking.discountedPrice = data.discountedPrice;*/
                                            booking.bookingStatus = 'success';
                                            booking.address = data.address;
                                            //booking.userId = data.userId;
                                            booking.guestName = data.guestName;
                                            booking.guestEmail = data.guestEmail;
                                            booking.bookingFrom = data.bookingFrom;
                                            booking.type = 'service';
                                            var text = "";
                                            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
                    
                                            for (var i = 0; i < 8; i++) {
                                                text += possible.charAt(Math.floor(Math.random() * possible.length));
                                            }
                    
                                            booking.bookingReference = text;
                    
                                            booking.save(); /*save booking here*/
                                            console.log('#######################');
                                            console.log('#######################');
                                            //console.log(booking);
                    
                                            const {
                                                CustomerPoint,
                                                Artistservices,
                                                BookingSlot,
                                                Voucher,
                                                Member
                                            } = app.models;
                    
                                            if (booking.amountPaid && booking.bookingFrom == 'user') {
                                                CustomerPoint.create({
                                                    "userId": booking.userId,
                                                    "artistId": booking.artistId,
                                                    "points": booking.amountPaid,
                                                    bookingId: booking.id,
                                                    bookingDate: booking.bookingDate,
                                                    serviceType: booking.serviceType,
                                                    service: booking.service
                                                });
                                            }
                    
                                            if (booking.serviceType !== 'gcc') {
                    
                                                let serviceAmount = 0;
                                                let voucherAmount = 0;
                                                var slots = [];
                                                var serviceData = 'Service: ';
                                                console.log(booking.artistServiceId)
                                                async.eachSeries(booking.artistServiceId, function(item, callback) {
                                                    //booking.artistServiceId.forEach(function(item) {
                                                    var whereObj = {
                                                        "where": {
                                                            "id": item.serviceId
                                                        }
                                                    }
                    
                                                    Artistservices.findOne(whereObj, function(err, data) {
                                                        //console.log(data);
                                                        var durationString = (data.duration) ? data.duration : '';
                                                        serviceAmount += parseInt(data.price);
                                                        if (durationString != '') {
                                                            console.log("this is durationString >> "+durationString);
                                                            serviceData += item.subServiceName;
                                                            // booking is in hours and mins combination
                                                            if (durationString.indexOf('hr ') > -1 && durationString.indexOf('mins') > -1) {
                                                                durationString = durationString.replace(' hr ', '|');
                                                                durationString = durationString.replace(' mins', '');
                                                                durationString = durationString.split('|');
                    
                                                                var hours = parseInt(durationString[0]);
                                                                var mins = parseInt(durationString[1]);
                                                                //console.log(hours, mins);
                                                                var totalHours = hours + (mins / 60);
                                                            } else if (durationString.indexOf('hr ') == -1 && durationString.indexOf('hrs') == -1 && durationString.indexOf('mins') > -1) {
                                                                var mins = parseInt(durationString.replace(' mins', ''));
                                                                //console.log(mins);
                                                                var totalHours = (mins / 60);
                                                            } else if (durationString.indexOf('hr ') == -1 && durationString.indexOf('hrs') > -1 && durationString.indexOf('mins') > -1) {
                                                                durationString = durationString.replace(' hrs', '|');
                                                                durationString = durationString.replace(' mins', '');
                                                                durationString = durationString.split('|');
                    
                                                                var hours = parseInt(durationString[0]);
                                                                var mins = parseInt(durationString[1]);
                                                                console.log(hours, mins);
                    
                                                                var totalHours = hours + (mins / 60);
                                                            } else if (durationString.indexOf('hr ') == -1 && durationString.indexOf('hrs') > -1 && durationString.indexOf('mins') == -1) {
                                                                var hours = parseInt(durationString.replace(' hrs', ''));
                                                                console.log(hours);
                                                                var totalHours = hours;
                                                            } else if (durationString.indexOf('hr') > -1 && durationString.indexOf('hrs') == -1 && durationString.indexOf('mins') == -1) {
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
                    
                                                            var startTime = moment().utc().set({
                                                                hour: startHour,
                                                                minute: startHourMinute
                                                            });
                                                            var endTime = moment().utc().set({
                                                                hour: endHourFormatted,
                                                                minute: endHourMinute
                                                            });
                    
                                                            var timeStops = [];
                    
                                                            while (startTime <= endTime) {
                                                                timeStops.push(new moment(startTime).format('HH:mm'));
                                                                startTime.add(60, 'minutes');
                                                            }
                                                            //slots.push(timeStops);
                                                            
                                                            if(timeStops.length !=1 ){
                                                                timeStops.splice(-1, 1);    
                                                            }
                                                            
                                                            console.log('Timestops slots are >>>'+timeStops);
                                                            var slots = {
                                                                "artistId": booking.artistId,
                                                                "slots": timeStops,
                                                                bookingId: booking.id,
                                                                bookingDate: booking.bookingDate
                                                            }
                    
                                                            if (booking.bookingFrom == 'user') {
                                                                slots.userId = booking.userId
                                                            } else {
                                                                slots.userEmail = booking.guestEmail
                                                            }
                                                            /*slotData.slots.push(timeStops);
                                                            slotsData*/

                                                            BookingSlot.create(slots);
                                                            callback();
                                                            //console.log(timeStops);
                                                        } else {
                                                            console.log("I am in else")
                                                            var slots = {
                                                                "artistId": booking.artistId,
                                                                "slots": [],
                                                                bookingId: booking.id,
                                                                bookingDate: booking.bookingDate
                                                            }
                    
                                                            if (booking.bookingFrom == 'user') {
                                                                slots.userId = booking.userId
                                                            } else {
                                                                slots.userEmail = booking.guestEmail
                                                            }
                                                            BookingSlot.create(slots);
                                                            //BookingSlot.create({"userId" : booking.userId, "artistId" : booking.artistId, "slots" : [], bookingId: booking.id, bookingDate: booking.bookingDate });
                                                            callback();
                                                        }
                                                    })
                    
                                                }, function(error) {
                                                    if (booking.voucherId) {
                                                        var currentDate = moment(new Date());
                                                        var expiredOn = moment(currentDate).add(1, 'Y').format('YYYY-MM-DD');
                                                        Voucher.findOne({
                                                            where: {
                                                                id: booking.voucherId
                                                            }
                                                        }, function(err, voucher) {
                                                            voucher.status = 'false';
                                                            voucher.save();
                                                            voucherAmount = parseInt(voucher.amount);
                                                            serviceAmount = parseInt(serviceAmount);
                                                            if (voucherAmount > serviceAmount) {
                                                                var voucherCode = voucher_codes.generate({
                                                                    prefix: "TB"
                                                                });
                                                                Voucher.create({
                                                                    "userId": voucher.userId,
                                                                    "artistId": voucher.artistId,
                                                                    "amount": parseFloat(voucherAmount - serviceAmount),
                                                                    bookingId: voucher.bookingId,
                                                                    bookingDate: voucher.bookingDate,
                                                                    "expiredOn": expiredOn,
                                                                    voucherCode: voucherCode[0],
                                                                    status: "active"
                                                                });
                                                            }
                                                        })
                                                    }
                    
                                                    if (booking.userId) {
                                                        Member.findOne({
                                                            where: {
                                                                id: booking.userId
                                                            }
                                                        }, function(err, userData) {
                                                            if (booking.serviceType == 'salon') {
                                                                Member.findOne({
                                                                    where: {
                                                                        id: booking.artistId
                                                                    },
                                                                    include: ['countries', 'provinces']
                                                                }, function(err, artistData) {
                                                                    let data = JSON.stringify(artistData);
                                                                    artistData = JSON.parse(data)
                                                                    console.log(artistData);
                                                                    let currencyCode = '';
                                                                    if (artistData.countries.name == 'Saudi Arabia') {
                                                                        currencyCode = 'SAR';
                                                                    } else {
                                                                        currencyCode = currencyCodes[artistData.countries.name];
                                                                    }
                                                                    console.log(currencyCode);
                                                                    var locationStr = artistData.villa + ', ' + artistData.road + ', ' + artistData.block + ', ' + artistData.provinces.name + ', ' + artistData.countries.name;
                                                                    var name = booking.guestName.charAt(0).toUpperCase() + booking.guestName.slice(1);
                                                                    const template = bookingTemp(booking, moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY'), serviceData + ' by ' + artistData.name.charAt(0).toUpperCase() + artistData.name.slice(1), name, locationStr, currencyCode);
                    
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


                                                                                DeviceToken.findOne({where : {memberId : booking.artistId, osType: 'ios'}}, function(err, token){
                                                                                if (token) { var options = {
                                                                                  cert: app.get("artist_cert"),
                                                                                  key: app.get("artist_key"),
                                                                                  passphrase : app.get("artist_passphrase"),
                                                                                  production : true
                                                                                };
                                                                                var apnProvider =  new apn.Provider(options);

                                                                                let deviceToken = token.deviceToken;

                                                                                var note = new apn.Notification();

                                                                                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                                                                                note.badge = 1;
                                                                                note.sound = "ping.aiff";
                                                                                note.alert = "You have got a new booking for "+serviceData+" on "+moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY')+" at "+booking.bookingStartTime;
                                                                                note.payload = {'messageFrom': 'ThinkBeauty'};
                                                                                note.topic = 'com.ios.Think';
                                                                                apnProvider.send(note, deviceToken).then( (result) => {
                                                                                  console.log(result);
                                                                                  console.log(result.failed);
                                                                                });
                                                                            }
                                                                            })
                                                                                //next();
                                                                            });
                                                                        });
                                                                    cb(null, {
                                                                        "message": "Booking is successfully made",
                                                                        "status": 1,
                                                                        "pointsEarned": booking.amountPaid,
                                                                        "referenceId": booking.bookingReference
                                                                    });
                                                                })
                                                            } else {
                                                                if (booking.serviceType == 'salon') {
                                                                    Member.findOne({
                                                                        where: {
                                                                            id: booking.artistId
                                                                        },
                                                                        include: ['countries', 'provinces']
                                                                    }, function(err, artistData) {
                                                                        let data = JSON.stringify(artistData);
                                                                        artistData = JSON.parse(data)
                                                                        let currencyCode = '';
                                                                        if (artistData.countries.name == 'Saudi Arabia') {
                                                                            currencyCode = 'SAR';
                                                                        } else {
                                                                            currencyCode = currencyCodes[artistData.countries.name];
                                                                        }
                                                                        var locationStr = artistData.villa + ', ' + artistData.road + ', ' + artistData.block + ', ' + artistData.provinces.name + ', ' + artistData.countries.name;
                                                                        var name = booking.guestName.charAt(0).toUpperCase() + booking.guestName.slice(1);
                                                                        const template = bookingTemp(booking, moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY'), serviceData + ' by ' + artistData.name.charAt(0).toUpperCase() + artistData.name.slice(1), name, locationStr, currencyCode);
                    
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
                                                                                    DeviceToken.findOne({where : {memberId : booking.artistId, osType: 'ios'}}, function(err, token){
                                                                                if (token) { var options = {
                                                                                  cert: app.get("artist_cert"),
                                                                                  key: app.get("artist_key"),
                                                                                  passphrase : app.get("artist_passphrase"),
                                                                                  production : true
                                                                                };
                                                                                var apnProvider =  new apn.Provider(options);

                                                                                let deviceToken = token.deviceToken;

                                                                                var note = new apn.Notification();

                                                                                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                                                                                note.badge = 1;
                                                                                note.sound = "ping.aiff";
                                                                                note.alert = "You have got a new booking for "+serviceData+" on "+moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY')+" at "+booking.bookingStartTime;
                                                                                note.payload = {'messageFrom': 'ThinkBeauty'};
                                                                                note.topic = 'com.ios.Think';
                                                                                apnProvider.send(note, deviceToken).then( (result) => {
                                                                                  console.log(result);
                                                                                  console.log(result.failed);
                                                                                });
                                                                            }
                                                                            })
                                                                                    //next();
                                                                                });
                                                                            });
                                                                        cb(null, {
                                                                            "message": "Booking is successfully made",
                                                                            "status": 1,
                                                                            "pointsEarned": booking.amountPaid,
                                                                            "referenceId": booking.bookingReference
                                                                        });
                                                                    })
                                                                } else {
                                                                    Member.findOne({
                                                                        where: {
                                                                            id: booking.artistId
                                                                        },
                                                                        include: ['countries', 'provinces']
                                                                    }, function(err, artistData) {
                                                                        let data = JSON.stringify(artistData);
                                                                        artistData = JSON.parse(data)
                                                                        let currencyCode = '';
                                                                        if (artistData.countries.name == 'Saudi Arabia') {
                                                                            currencyCode = 'SAR';
                                                                        } else {
                                                                            currencyCode = currencyCodes[artistData.countries.name];
                                                                        }
                                                                        var name = booking.guestName.charAt(0).toUpperCase() + booking.guestName.slice(1);
                                                                        const template = bookingTemp(booking, moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY'), serviceData + ' by ' + artistData.name.charAt(0).toUpperCase() + artistData.name.slice(1), name, '', currencyCode);
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
                                                                                    DeviceToken.findOne({where : {memberId : booking.artistId, osType: 'ios'}}, function(err, token){
                                                                                if (token) { var options = {
                                                                                  cert: app.get("artist_cert"),
                                                                                  key: app.get("artist_key"),
                                                                                  passphrase : app.get("artist_passphrase"),
                                                                                  production : true
                                                                                };
                                                                                var apnProvider =  new apn.Provider(options);

                                                                                let deviceToken = token.deviceToken;

                                                                                var note = new apn.Notification();

                                                                                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                                                                                note.badge = 1;
                                                                                note.sound = "ping.aiff";
                                                                                note.alert = "You have got a new booking for "+serviceData+" on "+moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY')+" at "+booking.bookingStartTime;
                                                                                note.payload = {'messageFrom': 'ThinkBeauty'};
                                                                                note.topic = 'com.ios.Think';
                                                                                apnProvider.send(note, deviceToken).then( (result) => {
                                                                                  console.log(result);
                                                                                  console.log(result.failed);
                                                                                });
                                                                            }
                                                                            })
                                                                                    //next();
                                                                                });
                                                                            });
                                                                        cb(null, {
                                                                            "message": "Booking is successfully made",
                                                                            "status": 1,
                                                                            "pointsEarned": booking.amountPaid,
                                                                            "referenceId": booking.bookingReference
                                                                        });
                                                                    });
                                                                }
                    
                                                            }
                    
                                                        })
                                                    } else {
                                                        Member.findOne({
                                                            where: {
                                                                id: booking.artistId
                                                            },
                                                            include: ['countries', 'provinces']
                                                        }, function(err, artistData) {
                                                            let data = JSON.stringify(artistData);
                                                            artistData = JSON.parse(data)
                                                            let currencyCode = '';
                                                            if (artistData.countries.name == 'Saudi Arabia') {
                                                                currencyCode = 'SAR';
                                                            } else {
                                                                currencyCode = currencyCodes[artistData.countries.name];
                                                            }
                                                            var locationStr = '';
                                                            if (booking.serviceType == 'salon') {
                                                                locationStr = artistData.villa + ', ' + artistData.road + ', ' + artistData.block + ', ' + artistData.provinces.name + ', ' + artistData.countries.name;
                                                            }
                    
                    
                                                            var name = booking.guestName.charAt(0).toUpperCase() + booking.guestName.slice(1);
                                                            const template = bookingTemp(booking, moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY'), serviceData + ' by ' + artistData.name.charAt(0).toUpperCase() + artistData.name.slice(1), name, locationStr, currencyCode);
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

                                                                        DeviceToken.findOne({where : {memberId : booking.artistId, osType: 'ios'}}, function(err, token){
                                                                                if (token) { var options = {
                                                                                  cert: app.get("artist_cert"),
                                                                                  key: app.get("artist_key"),
                                                                                  passphrase : app.get("artist_passphrase"),
                                                                                  production : true
                                                                                };
                                                                                var apnProvider =  new apn.Provider(options);

                                                                                let deviceToken = token.deviceToken;

                                                                                var note = new apn.Notification();

                                                                                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                                                                                note.badge = 1;
                                                                                note.sound = "ping.aiff";
                                                                                note.alert = "You have got a new booking for "+serviceData+" on "+moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY')+" at "+booking.bookingStartTime;
                                                                                note.payload = {'messageFrom': 'ThinkBeauty'};
                                                                                note.topic = 'com.ios.Think';
                                                                                apnProvider.send(note, deviceToken).then( (result) => {
                                                                                  console.log(result);
                                                                                  console.log(result.failed);
                                                                                });
                                                                            }
                                                                            })
                                                                        //next();
                                                                    });
                                                                });
                                                            cb(null, {
                                                                "message": "Booking is successfully made",
                                                                "status": 1,
                                                                "pointsEarned": booking.amountPaid,
                                                                "referenceId": booking.bookingReference
                                                            });
                                                        });
                                                    }
                    
                                                });
                                                //console.log(slots);
                                                checkBookingStatus(booking);
                                            } else {
                                                let serviceAmount = 0;
                                                let voucherAmount = 0;
                                                bookingStatus.create({
                                                    date: moment(new Date(booking.bookingDate)).format('YYYY-MM-DD'),
                                                    artistId: booking.artistId,
                                                    fullyBooked: true
                                                });
                                                var serviceData = 'Service: ';
                                                async.eachSeries(booking.artistServiceId, function(item, callback) {
                                                    //booking.artistServiceId.forEach(function(item) {
                                                    var whereObj = {
                                                        "where": {
                                                            "id": item.serviceId
                                                        }
                                                    }
                    
                                                    Artistservices.findOne(whereObj, function(err, data) {
                                                        serviceData += item.subServiceName + ' x ' + item.persons + ', ';
                                                        serviceAmount += parseInt(data.price);
                                                        callback();
                                                    })
                                                }, function(err) {
                                                    serviceData = serviceData.replace(/,\s*$/, "");
                                                    if (booking.voucherId) {
                                                        var currentDate = moment(new Date());
                                                        var expiredOn = moment(currentDate).add(1, 'Y').format('YYYY-MM-DD');
                                                        Voucher.findOne({
                                                            where: {
                                                                id: booking.voucherId
                                                            }
                                                        }, function(err, voucher) {
                                                            voucher.status = 'false';
                                                            voucher.save();
                                                            voucherAmount = parseInt(voucher.amount);
                                                            serviceAmount = parseInt(serviceAmount) / 2;
                                                            if (voucherAmount > serviceAmount) {
                                                                var voucherCode = voucher_codes.generate({
                                                                    prefix: "TB"
                                                                });
                                                                Voucher.create({
                                                                    "userId": voucher.userId,
                                                                    "artistId": voucher.artistId,
                                                                    "amount": parseFloat(voucherAmount - serviceAmount),
                                                                    bookingId: voucher.bookingId,
                                                                    bookingDate: voucher.bookingDate,
                                                                    "expiredOn": expiredOn,
                                                                    voucherCode: voucherCode[0],
                                                                    status: "active"
                                                                });
                                                            }
                                                        })
                                                    }
                                                })
                                                var slots = {
                                                    "artistId": booking.artistId,
                                                    "slots": [],
                                                    bookingId: booking.id,
                                                    bookingDate: booking.bookingDate
                                                }
                    
                                                if (booking.bookingFrom == 'user') {
                                                    slots.userId = booking.userId
                                                } else {
                                                    slots.userEmail = booking.guestEmail
                                                }
                                                BookingSlot.create(slots, function(err, data) {
                                                    if (booking.userId) {
                                                        Member.findOne({
                                                            where: {
                                                                id: booking.userId
                                                            }
                                                        }, function(err, userData) {
                                                            Member.findOne({
                                                                where: {
                                                                    id: booking.artistId
                                                                },
                                                                include: ['countries', 'provinces']
                                                            }, function(err, artistData) {
                                                                let data = JSON.stringify(artistData);
                                                                artistData = JSON.parse(data)
                                                                let currencyCode = '';
                                                                if (artistData.countries.name == 'Saudi Arabia') {
                                                                    currencyCode = 'SAR';
                                                                } else {
                                                                    currencyCode = currencyCodes[artistData.countries.name];
                                                                }
                                                                var name = booking.guestName.charAt(0).toUpperCase() + booking.guestName.slice(1);
                                                                const template = bookingTemp(booking, moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY'), serviceData + ' by ' + artistData.name.charAt(0).toUpperCase() + artistData.name.slice(1), name, '', currencyCode);
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

                                                                            DeviceToken.findOne({where : {memberId : booking.artistId, osType: 'ios'}}, function(err, token){
                                                                                if (token) { var options = {
                                                                                  cert: app.get("artist_cert"),
                                                                                  key: app.get("artist_key"),
                                                                                  passphrase : app.get("artist_passphrase"),
                                                                                  production : true
                                                                                };
                                                                                var apnProvider =  new apn.Provider(options);

                                                                                let deviceToken = token.deviceToken;

                                                                                var note = new apn.Notification();

                                                                                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                                                                                note.badge = 1;
                                                                                note.sound = "ping.aiff";
                                                                                note.alert = "You have got a new booking for "+serviceData+" on "+moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY')+" at "+booking.bookingStartTime;
                                                                                note.payload = {'messageFrom': 'ThinkBeauty'};
                                                                                note.topic = 'com.ios.Think';
                                                                                apnProvider.send(note, deviceToken).then( (result) => {
                                                                                  console.log(result);
                                                                                  console.log(result.failed);
                                                                                });
                                                                            }
                                                                            })
                                                                            //next();
                                                                        });
                                                                    });
                                                                cb(null, {
                                                                    "message": "Booking is successfully made",
                                                                    "status": 1,
                                                                    "pointsEarned": booking.amountPaid,
                                                                    "referenceId": booking.bookingReference
                                                                });
                                                            });
                                                        });
                                                    } else {
                                                        Member.findOne({
                                                            where: {
                                                                id: booking.artistId
                                                            },
                                                            include: ['countries', 'provinces']
                                                        }, function(err, artistData) {
                                                            let data = JSON.stringify(artistData);
                                                            artistData = JSON.parse(data)
                                                            let currencyCode = '';
                                                            if (artistData.countries.name == 'Saudi Arabia') {
                                                                currencyCode = 'SAR';
                                                            } else {
                                                                currencyCode = currencyCodes[artistData.countries.name];
                                                            }
                                                            var name = booking.guestName.charAt(0).toUpperCase() + booking.guestName.slice(1);
                                                            const template = bookingTemp(booking, moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY'), serviceData, name, '', currencyCode);
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
                                                                        DeviceToken.findOne({where : {memberId : booking.artistId, osType: 'ios'}}, function(err, token){
                                                                                if (token) { var options = {
                                                                                  cert: app.get("artist_cert"),
                                                                                  key: app.get("artist_key"),
                                                                                  passphrase : app.get("artist_passphrase"),
                                                                                  production : true
                                                                                };
                                                                                var apnProvider =  new apn.Provider(options);

                                                                                let deviceToken = token.deviceToken;

                                                                                var note = new apn.Notification();

                                                                                note.expiry = Math.floor(Date.now() / 1000) + 3600;
                                                                                note.badge = 1;
                                                                                note.sound = "ping.aiff";
                                                                                note.alert = "You have got a new booking for "+serviceData+" on "+moment(new Date(booking.bookingDate)).format('dddd DD MMMM, YYYY')+" at "+booking.bookingStartTime;
                                                                                note.payload = {'messageFrom': 'ThinkBeauty'};
                                                                                note.topic = 'com.ios.Think';
                                                                                apnProvider.send(note, deviceToken).then( (result) => {
                                                                                  console.log(result);
                                                                                  console.log(result.failed);
                                                                                });
                                                                            }
                                                                            })
                                                                        //next();
                                                                    });
                                                                });
                                                            cb(null, {
                                                                "message": "Booking is successfully made",
                                                                "status": 1,
                                                                "pointsEarned": booking.amountPaid,
                                                                "referenceId": booking.bookingReference
                                                            });
                                                        });
                                                    }
                                                });
                                                /*BookingSlot.create({"userId" : booking.userId, "artistId" : booking.artistId, "slots" : [], bookingId: booking.id, bookingDate: booking.bookingDate }, function(err, data){
                                                    if(!err) {
                                                        cb(null, {"message" : "Booking is successfully made", "status" : 1 ,"pointsEarned" : booking.amountPaid});
                                                    }
                                                });*/
                                            }
                    
                                        } else {
                                            cb(null, {
                                                "message": "Artist is already booked for this time.",
                                                "status": 0
                                            });
                                        }
                                    }
                })

            } else {
                cb(null, {
                    "message": "No Booking found with this booking id",
                    "status": 0
                });
            }
        });
    }

    function checkBookingStatus(data) {
        const {
            BookingSlot,
            bookingStatus,
            Artistservices
        } = app.models;
        BookingSlot.findOne({
            where: {
                bookingDate: data.bookingDate,
                artistId: data.artistId
            }
        }, function(err, slotsData) {
            if (slotsData) {
                console.log('here i am');
                Artistservices.findOne({
                    where: {
                        id: data.artistServiceId[0].serviceId
                    }
                }, function(err, serviceData) {
                    if (serviceData) {
                        var durationString = (serviceData.duration) ? serviceData.duration : '';
                        if (durationString != '') {
                            console.log('here i am asd');
                            // booking is in hours and mins combination
                            if (durationString.indexOf('hr ') > -1 && durationString.indexOf('mins') > -1) {
                                durationString = durationString.replace(' hr ', '|');
                                durationString = durationString.replace(' mins', '');
                                durationString = durationString.split('|');

                                var hours = parseInt(durationString[0]);
                                var mins = parseInt(durationString[1]);
                                console.log(hours, mins);
                                var totalHours = hours + (mins / 60);
                            } else if (durationString.indexOf('hr ') == -1 && durationString.indexOf('hrs') == -1 && durationString.indexOf('mins') > -1) {
                                var mins = parseInt(durationString.replace(' mins', ''));
                                console.log(mins);
                                var totalHours = (mins / 60);
                            } else if (durationString.indexOf('hr ') == -1 && durationString.indexOf('hrs') > -1 && durationString.indexOf('mins') > -1) {
                                durationString = durationString.replace(' hrs', '|');
                                durationString = durationString.replace(' mins', '');
                                durationString = durationString.split('|');

                                var hours = parseInt(durationString[0]);
                                var mins = parseInt(durationString[1]);
                                console.log(hours, mins);

                                var totalHours = hours + (mins / 60);
                            } else if (durationString.indexOf('hr ') == -1 && durationString.indexOf('hrs') > -1 && durationString.indexOf('mins') == -1) {
                                var hours = parseInt(durationString.replace(' hrs', ''));
                                console.log(hours);
                                var totalHours = hours;
                            } else if (durationString.indexOf(' hr') > -1 && durationString.indexOf('hrs') == -1 && durationString.indexOf('mins') == -1) {
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

                            var startTime = moment().utc().set({
                                hour: startHour,
                                minute: startHourMinute
                            });
                            var endTime = moment().utc().set({
                                hour: endHourFormatted,
                                minute: endHourMinute
                            });

                            var timeStops = [];

                            while (startTime <= endTime) {
                                timeStops.push(new moment(startTime).format('HH:mm'));
                                startTime.add(60, 'minutes');
                            }
                            timeStops.splice(-1,1);
                            //slots.push(timeStops);

                            /*var breakStartHour = moment(newArray[0].artistavailabilities[0].breakfrom, ["h:mm A"]).format("HH");
                            var breakStartHourMinute = moment(newArray[0].artistavailabilities[0].breakfrom, ["h:mm A"]).format("mm");
                            var breakEndHour = moment(newArray[0].artistavailabilities[0].breakto, ["h:mm A"]).format("HH");
                            var breakEndHourMinute = moment(newArray[0].artistavailabilities[0].breakto, ["h:mm A"]).format("mm");

                            var startTime = moment().utc().set({
                                hour: breakStartHour,
                                minute: breakStartHourMinute
                            });
                            var endTime = moment().utc().set({
                                hour: breakEndHour,
                                minute: breakEndHourMinute
                            });

                            var breakTimeStops = [];

                            while (startTime <= endTime) {
                                breakTimeStops.push(new moment(startTime).format('HH:mm'));
                                startTime.add(60, 'minutes');
                            }

                            timeStops = timeStops.filter( ( el ) => !breakTimeStops.includes( el ) );*/
                            slotsData = JSON.stringify(slotsData);
                            slotsData = JSON.parse(slotsData);
                            var finalSlots = [];

                            if(slotsData.length) {
                                slotData = slotsData.filter(function(el) {
                                    finalSlots = finalSlots.concat(el.slots);
                                    return true;
                                })    
                            }
                            
                            let slots = finalSlots;
                            let found = timeStops.some(r => slots.includes(r));
                            console.log(slots, found)
                            if (found) {
                                bookingStatus.findOne({
                                    where: {
                                        date: moment(new Date(data.bookingDate)).format('YYYY-MM-DD'),
                                        artistId: data.artistId
                                    }
                                }, function(err, bookedStatus) {
                                    if (bookedStatus && bookedStatus.fullyBooked == false) {
                                        bookedStatus.fullyBooked = true;
                                        bookedStatus.save();
                                    } else {
                                        bookingStatus.create({
                                            date: moment(new Date(data.bookingDate)).format('YYYY-MM-DD'),
                                            artistId: data.artistId,
                                            fullyBooked: true
                                        });
                                    }
                                });
                            } else {
                                data.status = 'pending';
                                bookingStatus.findOne({
                                    where: {
                                        date: moment(new Date(data.bookingDate)).format('YYYY-MM-DD'),
                                        artistId: data.artistId
                                    }
                                }, function(err, bookedStatus) {
                                    if (!bookedStatus) {
                                        bookingStatus.create({
                                            date: moment(new Date(data.bookingDate)).format('YYYY-MM-DD'),
                                            artistId: data.artistId,
                                            fullyBooked: false
                                        });
                                    }
                                });
                               
                            }
                        } else {
                            data.status = 'pending';
                           /* bookingStatus.create({
                                date: moment(new Date(data.bookingDate)).format('YYYY-MM-DD'),
                                artistId: data.artistId,
                                fullyBooked: false
                            });*/
                        }
                    }
                    /* else {
                                            data.status = 'pending';
                                            bookingStatus.create({
                                                date: moment(new Date(data.bookingDate)).format('YYYY-MM-DD'),
                                                artistId: data.artistId,
                                                fullyBooked: false
                                            });
                                        }*/
                })
                // check slots are matching bookingTime
            } else {
                bookingStatus.findOne({
                    where: {
                        date: moment(new Date(data.bookingDate)).format('YYYY-MM-DD'),
                        artistId: data.artistId
                    }
                }, function(err, bookedStatus) {
                    if (!bookedStatus) {
                        bookingStatus.create({
                            date: moment(new Date(data.bookingDate)).format('YYYY-MM-DD'),
                            artistId: data.artistId,
                            fullyBooked: false
                        });
                    }
                });
            }
        })
    }

    Booking.verifyBooking = async function(data, cb) {
        const {
            BookingSlot,
            Artistservices,
            Artistavailability
        } = app.models;

        if (data.servicetype == 'gcc') {
            let slotData = await BookingSlot.findOne({
                where: {
                    bookingDate: data.bookingDate,
                    artistId: data.artistId
                }
            })

            if (slotData) {
                return {
                    "message": "Artist is already booked for this date",
                    "status": 0
                }
            } else {
                data.status = 'pending';
                let createdData = await Booking.create(data)
                return createdData;
                //cb(null, {"message" : "No booking found on this date", "status" : 1});
            }
        } else {
            let artistavailabilities = await Artistavailability.find({
                where: {
                    date: data.bookingDate,
                    memberId: data.artistId
                }
            });

            if (!artistavailabilities) {
                let dayNumber = moment(data.date).day();
                let weekends = [5, 6];
                let whereDate = {}
                if (weekends.indexOf(dayNumber) > -1) {
                    whereDate = {
                        where: {
                            memberId: data.artistId,
                            days: "weekend"
                        }
                    }
                } else {
                    whereDate = {
                        where: {
                            memberId: data.artistId,
                            days: "working"
                        }
                    }
                }
                let artistavailabilities = await Artistavailability.find(whereDate);
            }

            if (artistavailabilities) { //artist is available
                let slotsData = await BookingSlot.find({
                    where: {
                        bookingDate: data.bookingDate,
                        artistId: data.artistId
                    }
                });
                if (slotsData) {
                    if (artistavailabilities.length) {
                        var startHour = moment(artistavailabilities[0].hoursfrom, ["h:mm A"]).format("HH");
                        var startHourMinute = moment(artistavailabilities[0].hoursfrom, ["h:mm A"]).format("mm");

                        var endHour = moment(artistavailabilities[0].hoursto, ["h:mm A"]).format("HH");
                        var endHourMinute = moment(artistavailabilities[0].hoursto, ["h:mm A"]).format("mm");


                        var startTime = moment().utc().set({
                            hour: startHour,
                            minute: startHourMinute
                        });
                        var endTime = moment().utc().set({
                            hour: endHour,
                            minute: endHourMinute
                        });

                        var timeStops = [];

                        while (startTime <= endTime) {
                            timeStops.push(new moment(startTime).format('HH:mm'));
                            startTime.add(60, 'minutes');
                        }


                        var breakStartHour = moment(artistavailabilities[0].breakfrom, ["h:mm A"]).format("HH");
                        var breakStartHourMinute = moment(artistavailabilities[0].breakfrom, ["h:mm A"]).format("mm");
                        var breakEndHour = moment(artistavailabilities[0].breakto, ["h:mm A"]).format("HH");
                        var breakEndHourMinute = moment(artistavailabilities[0].breakto, ["h:mm A"]).format("mm");

                        var startTime = moment().utc().set({
                            hour: breakStartHour,
                            minute: breakStartHourMinute
                        });
                        var endTime = moment().utc().set({
                            hour: breakEndHour,
                            minute: breakEndHourMinute
                        });

                        var breakTimeStops = [];

                        while (startTime <= endTime) {
                            breakTimeStops.push(new moment(startTime).format('HH:mm'));
                            startTime.add(60, 'minutes');
                        }
                    }

                    var finalSlots = [];
                    slotsData = slotsData.filter(function(el) {
                        finalSlots = finalSlots.concat(el.slots);
                        return true;
                    })

                    console.log(finalSlots);
                    console.log('here i am');

                    let serviceData = Artistservices.findOne({
                        where: {
                            id: data.artistServiceId[0].serviceId
                        }
                    })
                    if (serviceData) {
                        var durationString = (serviceData.duration) ? serviceData.duration : '';
                        if (durationString != '') {
                            console.log('here i am asd');
                            // booking is in hours and mins combination
                            if (durationString.indexOf('hr ') > -1 && durationString.indexOf('mins') > -1) {
                                durationString = durationString.replace(' hr ', '|');
                                durationString = durationString.replace(' mins', '');
                                durationString = durationString.split('|');

                                var hours = parseInt(durationString[0]);
                                var mins = parseInt(durationString[1]);
                                console.log(hours, mins);
                                var totalHours = hours + (mins / 60);
                            } else if (durationString.indexOf('hr ') == -1 && durationString.indexOf('hrs') == -1 && durationString.indexOf('mins') > -1) {
                                var mins = parseInt(durationString.replace(' mins', ''));
                                console.log(mins);
                                var totalHours = (mins / 60);
                            } else if (durationString.indexOf('hr ') == -1 && durationString.indexOf('hrs') > -1 && durationString.indexOf('mins') > -1) {
                                durationString = durationString.replace(' hrs', '|');
                                durationString = durationString.replace(' mins', '');
                                durationString = durationString.split('|');

                                var hours = parseInt(durationString[0]);
                                var mins = parseInt(durationString[1]);
                                console.log(hours, mins);

                                var totalHours = hours + (mins / 60);
                            } else if (durationString.indexOf('hr ') == -1 && durationString.indexOf('hrs') > -1 && durationString.indexOf('mins') == -1) {
                                var hours = parseInt(durationString.replace(' hrs', ''));
                                console.log(hours);
                                var totalHours = hours;
                            } else if (durationString.indexOf(' hr') > -1 && durationString.indexOf('hrs') == -1 && durationString.indexOf('mins') == -1) {
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

                            var startTime = moment().utc().set({
                                hour: startHour,
                                minute: startHourMinute
                            });
                            var endTime = moment().utc().set({
                                hour: endHourFormatted,
                                minute: endHourMinute
                            });

                            var timeStops1 = [];

                            while (startTime <= endTime) {
                                timeStops1.push(new moment(startTime).format('HH:mm'));
                                startTime.add(60, 'minutes');
                            }
                            //slots.push(timeStops);
                            if (timeStops) {
                                if (timeStops.length < timeStops1.length) {

                                    return {
                                        "message": "Artist is not available for this service.",
                                        "status": 0
                                    }
                                    //return true;
                                } else {
                                    let slots = slotsData.slots;
                                    let found = timeStops.some(r => finalSlots.includes(r));
                                    if (found) {
                                        return {
                                            "message": "Artist is already booked for this date",
                                            "status": 0
                                        }
                                    } else {
                                        data.status = 'pending';
                                        let createdData = Booking.create(data)
                                        return createdData;

                                    }
                                }
                            } else { //////////dont know/////////
                                return {
                                    "message": "Artist is not available for this service.",
                                    "status": 0
                                };
                            }
                        } else {
                            data.status = 'pending';
                            let createdData = Booking.create(data)
                            return createdData;
                        }
                    } else {
                        data.status = 'pending';
                        let createdData = Booking.create(data)
                        return createdData;
                    }
                }

            } else {
                return {
                    "message": "Artist is not available for this service.",
                    "status": 0
                }
            }
        }
    }

    Booking.remoteMethod('verifyBooking', {
        http: {
            path: '/verifyBooking',
            verb: 'post'
        },
        accepts: [{
            arg: '',
            type: 'object',
            http: {
                source: 'body'
            }
        }],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });

    Booking.remoteMethod('bookAndPay', {
        http: {
            path: '/bookAndPay',
            verb: 'post'
        },
        accepts: [{
            arg: '',
            type: 'object',
            http: {
                source: 'body'
            }
        }],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });


    Booking.applyVoucher = function(data, cb) {
        const {
            Voucher
        } = app.models;
        Voucher.findOne({
            where: {
                id: data.id,
                artistId: data.artistId,
                userId: data.userId
            }
        }, function(err, data) {
            if (data) {
                var date = new Date();
                var expiryDate = new Date(data.expiredOn);
                if (expiryDate > date) {
                    cb(null, {
                        "message": "Voucher exists",
                        price: data.amount,
                        status: 1
                    });
                } else {
                    cb(null, {
                        "message": "Voucher expired.",
                        price: data.amount,
                        status: 0
                    });
                }

            } else {
                cb(null, {
                    "message": "Applied voucher do not exists .",
                    price: 0,
                    status: 3
                });
            }
        })
    }
    Booking.remoteMethod('applyVoucher', {
        http: {
            path: '/applyVoucher',
            verb: 'post'
        },
        accepts: [{
            arg: '',
            type: 'object',
            http: {
                source: 'body'
            }
        }],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });

    Booking.remoteMethod('myBookings', {
        http: {
            path: '/myBookings',
            verb: 'get'
        },
        accepts: [{
            arg: 'userId',
            type: 'string'
        }],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });



    Booking.artistBookings = function(artistId, date, dateFrom, dateTo, type, countryName, cb) {
        if (artistId) {
            let whereFilter = {}
            if (date) {
                whereFilter.bookingDate = new Date(date);
                whereFilter.artistId = artistId;
            } else if (dateFrom && dateTo) {
                whereFilter = {
                    and: [{
                        bookingDate: {
                            between: [new Date(dateFrom), new Date(dateTo)]
                        }
                    }, {
                        artistId: artistId
                    }]
                };
                //whereFilter.bookingDate = {and :[{lt :new Date(dateTo)}]};
                //whereFilter.artistId = artistId;
                console.log(whereFilter.bookingDate);
            } else {
                if (type == 'upcoming') {
                    whereFilter.bookingDate = {
                        gt: new Date()
                    };
                    whereFilter.bookingStatus = "success";
                } else {
                    whereFilter.bookingDate = {
                        lt: new Date()
                    };
                }
                whereFilter.artistId = artistId;
            }

            let currencyCodes = {
                "Kuwait": "KWD",
                "Bahrain": "BHD",
                "UAE": "AED",
                "Oman": "OMR"
            }

            var currencyCode = '';
            if (countryName == 'Saudi Arabia') {
                currencyCode = 'SAR';
            } else {
                currencyCode = currencyCodes[countryName];
            }
            whereFilter.bookingStatus = 'success';
            console.log(whereFilter);
            Booking.find({
                where: whereFilter,
                order: 'bookingDate asc',

            }, function(err, previousBookings) {
                var res = {}
                res.data = previousBookings;
                res.currencyCode = currencyCode;
                cb(null, res);
            });
        } else {
            cb(null, {
                message: "ArtistId is required!"
            });
        }
    }

    Booking.getWallet = async function(data, cb) {
        const {
            Artistservices,
            Member
        } = app.models;
        let currencyCodes = {
            "Kuwait": "KWD",
            "Bahrain": "BHD",
            "UAE": "AED",
            "Oman": "OMR"
        }
        if (data.artistId) {
            let artistData = await Member.findOne({where:{id : data.artistId}, include:"countries"});
            let currencyCode = '';
            console.log(artistData);
            artistData = JSON.stringify(artistData);
            artistData = JSON.parse(artistData);
            console.log(artistData.countries);
            if (artistData.countries.name == 'Saudi Arabia') {
                currencyCode = 'SAR';
            } else {
                currencyCode = currencyCodes[artistData.countries.name];
            }

            var
                bookingDateFilter = {},
                whereFilter = {};

            if (data.dateFrom && data.dateTo) {
                bookingDateFilter = {
                    bookingDate: {
                        between: [new Date(data.dateFrom), new Date(data.dateTo)]
                    }
                }
            } else if (data.date) {
                bookingDateFilter = {
                    bookingDate: new Date(data.date)
                }
            }

            whereFilter = {
                and: [bookingDateFilter, {
                    artistId: data.artistId
                },{bookingStatus : 'success'}]
            };

            var bookings = await Booking.find({
                where: whereFilter,
                order: 'created asc'
            });

            if (bookings) {
                let resultData = JSON.stringify(bookings);
                let finalData = JSON.parse(resultData);
                let serviceAmount = 0;
                var serviceIdsArr = [];
                var customersArr = [];
                //var newArray = finalData;
                var newArray = finalData.filter(function(el) {
                    if (el && el.artistServiceId) {
                        customersArr.push(el.userId);
                        var serviceIds = el.artistServiceId.filter(function(item) {
                            serviceIdsArr.push(item.serviceId);
                            return true;
                        })
                        return true;
                    }
                })
                var unique = serviceIdsArr.filter(function(value, index, self) {
                    return self.indexOf(value) === index;
                });
                var uniqueCustomers = customersArr.filter(function(value, index, self) {
                    return self.indexOf(value) === index;
                });
                var count = {};
                serviceIdsArr.forEach(function(i) {
                    count[i] = (count[i] || 0) + 1;
                });

                console.log("Returning amount >>" + unique);
                var prices = await Artistservices.find({
                    where: {
                        id: {
                            inq: unique
                        }
                    },
                    fields: {
                        id: true,
                        price: true
                    }
                });

                let priceData = JSON.stringify(prices);
                let priceArr = JSON.parse(priceData);

                priceArr = priceArr.filter(function(arr) {
                    serviceAmount += parseInt(arr.price) * count[arr.id];
                })
                return {
                    currencyCode : currencyCode,
                    amount: serviceAmount,
                    customers: uniqueCustomers.length
                };

            }
        }
    }

    Booking.remoteMethod('getWallet', {
        http: {
            path: '/getWallet',
            verb: 'post'
        },
        accepts: [{
            arg: '',
            type: 'object',
            http: {
                source: 'body'
            }
        }],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });


    Booking.remoteMethod('artistBookings', {
        http: {
            path: '/artistBookings',
            verb: 'get'
        },
        accepts: [{
                arg: 'artistId',
                type: 'string'
            },
            {
                arg: 'date',
                type: 'string'
            },
            {
                arg: 'dateFrom',
                type: 'string'
            },
            {
                arg: 'dateTo',
                type: 'string'
            },
            {
                arg: 'type',
                type: 'string'
            },
            {
                arg: 'countryName',
                type: 'string'
            }
        ],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });
};