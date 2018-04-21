'use strict';
const app = require('../server.js');
const moment = require('moment');
var voucher_codes = require('voucher-code-generator');
module.exports = function(Booking) {
	Booking.cancelBooking = function(bookingId, userId, cb) {
		const {Voucher} = app.models;
		Booking.findOne({where : {id : bookingId}}, function(err, booking){
			booking.updateAttribute('bookingStatus', 'cancelled');
			booking.updateAttribute('cancelledBy', userId);

			var voucherCode = voucher_codes.generate({
							    prefix: "TB-",
							    postfix: "-"+ moment().year()
							});

			var currentDate = moment(new Date());
			var expiredOn = moment(currentDate).add(1, 'Y');
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
		const {CustomerPoint} = app.models;
    	if (ctx.isNewInstance){
    		CustomerPoint.create({"userId" : booking.userId, "artistId" : booking.artistId, "points" : parseInt(booking.totalPrice), bookingId: booking.id, bookingDate: booking.bookingDate })
    	}
    });

};
