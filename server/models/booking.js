'use strict';
const app = require('../server.js');
const moment = require('moment');
module.exports = function(Booking) {
	Booking.cancelBooking = function(bookingId, userId, cb) {
		const {Voucher} = app.models;
		Booking.findOne({where : {id : bookingId}}, function(err, booking){
			booking.updateAttribute('bookingStatus', 'cancelled');
			booking.updateAttribute('cancelledBy', userId);


			var currentDate = moment(new Date());
			var expiredOn = moment(currentDate).add(1, 'Y');
			Voucher.create({"userId" : booking.userId, "artistId" : booking.artistId, "amount" : booking.totalPrice, "expiredOn": expiredOn })

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

};
