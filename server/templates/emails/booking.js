module.exports = function(booking, date, serviceData, name, address, currencyCode)
{

  if(booking.type == 'course') {
    var timeStr = 'Time: '+ booking.timeslotFrom.toUpperCase()+' - '+ booking.timeslotTo.toUpperCase();
    var addressStr = address;
    var amount = 'Amount Paid: '+currencyCode+' '+booking.amountPaid;

  } else {
    var time = '';
    var timeStr = '';
    var addressStr = '';
    var amount = '';
    if(booking.bookingStartTime){
      time = parseInt(booking.bookingStartTime);
      if(time < 12) {
        timeStr = 'Time: '+time+':00 AM';
      } else {
        timeStr = 'Time: '+(time - 12)+':00 PM';
      }    
    }
    if(booking.serviceType == 'salon') {
      addressStr = 'Location: '+address;
      amount = 'Amount Paid: '+currencyCode+' '+booking.amountPaid+'<br>Amount Remaining: '+currencyCode+' '+booking.amountRemaining;
    } else {
      amount = 'Amount Paid: '+currencyCode+' '+booking.amountPaid;
      addressStr = 'Address: '+booking.address;
    }
  }
  if(booking.type == 'course') {
    return `<style>
   *{
      box-sizing: border-box;
      text-align: justify;
   }
   img{
      max-width: 100%;
   }
   a{
      text-decoration: none;
   }
   .logo {
       text-align: center;
       margin-bottom: 10px;
   }
   .logo img{
      width:30%;
      max-width: 200px;
   }
   .btn {
       padding: 10px 20px;
       background-color: #a78651;
       display: table;
       margin: 0 auto;
       color: #fff;
       width: auto;
       margin-bottom: 20px;
       border: none;
       border-radius: 5px;
       font-size: 17px;
       min-width: 200px;
       text-align: center;
   }
   p{
      color: #666;
      margin-top: 0;
      margin-bottom: 25px;
      line-height: 1.4;
   }
   .wrapper{
      width: 700px;
      max-width: 100%;
      background-color: #fff;
      margin: 20px auto;
      font-weight: 500;
   }
   .container{
      padding: 5% 10%;
   }
   .footer{
      width: 700px;
      max-width: 100%;
      margin: 0 auto;
      font-weight: 500;
   }
   body {
      background-color: #ceb26f;
      margin: 0;
      font-family: arial; 
      font-size: 14px;
   }
</style>
<meta name="viewport" content="width=device-width, initial-scale=1">
<body  style="">
   <div class="wrapper">
      <div class="header">
         <div class="container">
            <div class="logo">
               <img src="http://www.thinkbeauty.net/images/logo-email.png">
            </div>

            <div class="content">
               <img src="http://www.thinkbeauty.net/images/main-bg.png"><br>
               <p><b>Dear ${name},</b></p>
               <p style="">Thank you for making a booking with ThinkBeauty. Your appointment is confirmed..</p>
               <b>Booking Details:</b> <br>
               Reference/Booking ID: <b>${booking.bookingReference}</b><br>
               ${serviceData}<br>
               Date: ${date}<br>
               ${timeStr}<br>
               Persons: ${booking.guestNumber}<br>
               
               ${amount}<br>
               ${addressStr}<br><br>
               <p>
                  Please get in touch with us in case of any queries!
                  <br>
                  <br>Email us at info@thinkbeauty.net 
                  <br>Call us on +97339336690
                  <br>
                  Sincerely, 
                  <br>ThinkBeauty Team
              </p>
               
               
               <img src="http://www.thinkbeauty.net/images/footer.jpg">
               <p style="text-align: center; margin-top: 20px; margin-bottom: 0;"><strong><a style="color: #000;" href="http://www.thinkbeauty.net/">www.thinkbeauty.net</a></strong><br>Copyright 2018 Think Beauty. All right reserved</p>
            </div>
         </div>
      </div>
   </div>
   <div class="footer">
      <p style="text-align: center; color: #fff; font-size: 12px;">if you received this email because you're a valued Think Beauty customer. If you no longer wish  to receive  these cool and very infrequent email please <a style="color: #f00;" href="#">unsubscribe.</a> Copyright &copy; 2018 Think Beauty, Inc. All rights reserved.</p>
   </div>
</body>`;
} else { 
  return `<style>
   *{
      box-sizing: border-box;
      text-align: justify;
   }
   img{
      max-width: 100%;
   }
   a{
      text-decoration: none;
   }
   .logo {
       text-align: center;
       margin-bottom: 10px;
   }
   .logo img{
      width:30%;
      max-width: 200px;
   }
   .btn {
       padding: 10px 20px;
       background-color: #a78651;
       display: table;
       margin: 0 auto;
       color: #fff;
       width: auto;
       margin-bottom: 20px;
       border: none;
       border-radius: 5px;
       font-size: 17px;
       min-width: 200px;
       text-align: center;
   }
   p{
      color: #666;
      margin-top: 0;
      margin-bottom: 25px;
      line-height: 1.4;
   }
   .wrapper{
      width: 700px;
      max-width: 100%;
      background-color: #fff;
      margin: 20px auto;
      font-weight: 500;
   }
   .container{
      padding: 5% 10%;
   }
   .footer{
      width: 700px;
      max-width: 100%;
      margin: 0 auto;
      font-weight: 500;
   }
   body {
      background-color: #ceb26f;
      margin: 0;
      font-family: arial; 
      font-size: 14px;
   }
</style>
<meta name="viewport" content="width=device-width, initial-scale=1">
<body  style="">
   <div class="wrapper">
      <div class="header">
         <div class="container">
            <div class="logo">
               <img src="http://www.thinkbeauty.net/images/logo-email.png">
            </div>

            <div class="content">
               <img src="http://www.thinkbeauty.net/images/main-bg.png"><br>
               <p><b>Dear ${name},</b></p>
               <p style="">Thank you for making a booking with ThinkBeauty. Your appointment is confirmed..</p>
               <b>Booking Details:</b> <br>
               Reference/Booking ID: <b>${booking.bookingReference}</b><br>
               Appointment Date: ${date}<br>
               ${timeStr}<br>
               ${serviceData}<br>
               ${amount}<br>
               ${addressStr}<br><br>
               <p>
                  Please get in touch with us in case of any queries!
                  <br>
                  <br>Email us at info@thinkbeauty.net 
                  <br>Call us on +97339336690
                  <br>
                  Sincerely, 
                  <br>ThinkBeauty Team
              </p>
               
               
               <img src="http://www.thinkbeauty.net/images/footer.jpg">
               <p style="text-align: center; margin-top: 20px; margin-bottom: 0;"><strong><a style="color: #000;" href="http://www.thinkbeauty.net/">www.thinkbeauty.net</a></strong><br>Copyright 2018 Think Beauty. All right reserved</p>
            </div>
         </div>
      </div>
   </div>
   <div class="footer">
      <p style="text-align: center; color: #fff; font-size: 12px;">if you received this email because you're a valued Think Beauty customer. If you no longer wish  to receive  these cool and very infrequent email please <a style="color: #f00;" href="#">unsubscribe.</a> Copyright &copy; 2018 Think Beauty, Inc. All rights reserved.</p>
   </div>
</body>`; // eslint-disable-line
}
};
