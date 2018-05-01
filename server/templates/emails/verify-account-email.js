module.exports = function(url, pass, email, username, loginUrl)
{
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
               <img src="http://www.thinkbeauty.net/images/main-bg.jpg">
               <p style="text-align: center; margin: 20px 0;">Please Click on confirm eamil button bellow so you can explore the available services among our platform and enjoy having your desired services done with ease & efficiency !</p>
               <p style="text-align: center; color: #ceb26f;"><strong style="color: #ceb26f;">Get started with a new beautiful experience now !</strong></p>
               <a class="btn" href="${url}">Confirm Email</a>
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
};
