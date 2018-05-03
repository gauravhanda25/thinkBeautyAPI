//'use strict';

var config = require('../../server/config.json');
var path = require('path');
var moment = require('moment');
const ejs = require('ejs');
const Fs = require('fs');
const app = require('../server.js');
const inlineCss = require('inline-css');
const verifyAccountEmail = require('../templates/emails/verify-account-email.js');
const landingRegistration = require('../templates/emails/landing-registration.js');
module.exports = function(Member) {
  

  //send verification email after registration

  Member.afterRemote('create', function(context, memberInstance, next) {
    console.log('> member.afterRemote triggered');
      const {Role, RoleMapping} = app.models;
      Role.findOne({where: {role_id: memberInstance.role_id}}, function(err, role){
          role.principals.create({
              principalType: RoleMapping.USER,
              principalId: memberInstance.id
          });
      });


      console.log(memberInstance);
      const template = landingRegistration(memberInstance);
      const {Email} = app.models;
      const subject = 'Welcome to Think Beauty!';
      inlineCss(template,  { url: 'http://example.com/mushroom'})
      .then(function(html) { 
          Email.send({
            to: memberInstance.email, from: app.get('email'), subject, html: html
          }, (err) =>
          {
            if (err)
            {
              console.log(err);
            }
            // email sent
            //return resolve();
            next();
            console.log('> Email Sent!!')
          });
      });

      if(memberInstance.role_id == 4) {
         Member.generateVerificationToken(memberInstance, null,  (errToken, token) =>
            {
              if (errToken)
              {
                console.log(errToken);
              } else {
                try
                {
                  // update verification token and organization id
                  memberInstance.verificationToken = token;
                  memberInstance.emailSent = true;
                  /*var randomstring = Math.random().toString(36).slice(-8);
                  memberInstance.password = randomstring;*/
                  memberInstance.save();
                  const url = 'http://www.thinkbeauty.net/panel/#/verify-email/' + memberInstance.id.toString() +
                    '/' + token;
                  //const pass = memberInstance.password;
                  const template = verifyAccountEmail(url, randomstring, memberInstance.email, memberInstance.name, 'http://www.thinkbeauty.net:3000/#/panel/artist');
                  const {Email} = app.models;
                  const subject = 'Verify your email to get started';
                  inlineCss(template,  { url: 'http://example.com/mushroom'})
                  .then(function(html) {
                      Email.send({
                        to: memberInstance.email, from: app.get('email'), subject, html: html
                      }, (err) =>
                      {
                        if (err)
                        {
                          console.log('ERROR sending account verification', err);
                        }
                        // email sent
                        //return resolve();
                        console.log('> Email Sent to !! >>'+memberInstance.email)
                        //next();
                      });
                    });
                  //next();
                  //return resolve();
                }
                catch (err)
                {

                  console.log('ERROR sending account verification', err);
                  //return reject(err);
                }
              }
            });
      }
      if((memberInstance.role_id == 2 || memberInstance.role_id == 3) && memberInstance.status == 'active') {
          Member.generateVerificationToken(memberInstance, null,  (errToken, token) =>
            {
              if (errToken)
              {
                console.log(errToken);
              } else {
                try
                {
                  // update verification token and organization id
                  memberInstance.verificationToken = token;
                  memberInstance.emailSent = true;
                  var randomstring = Math.random().toString(36).slice(-8);
                  memberInstance.password = randomstring;
                  memberInstance.save();
                  const url = 'http://www.thinkbeauty.net/panel/#/verify-email/' + memberInstance.id.toString() +
                    '/' + token;
                  //const pass = memberInstance.password;
                  const template = verifyAccountEmail(url, randomstring, memberInstance.email, memberInstance.name, 'http://www.thinkbeauty.net:3000/#/panel/artist');
                  const {Email} = app.models;
                  const subject = 'Verify your email to get started';
                  inlineCss(template,  { url: 'http://example.com/mushroom'})
                  .then(function(html) {
                      Email.send({
                        to: memberInstance.email, from: app.get('email'), subject, html: html
                      }, (err) =>
                      {
                        if (err)
                        {
                          console.log('ERROR sending account verification', err);
                        }
                        // email sent
                        //return resolve();
                        console.log('> Email Sent to !! >>'+memberInstance.email)
                        //next();
                      });
                    });
                  //next();
                  //return resolve();
                }
                catch (err)
                {

                  console.log('ERROR sending account verification', err);
                  //return reject(err);
                }
              }
            });

      }
   
    /*var options = {
      type: 'email',
      to: memberInstance.email,
      from: 'noreply@bullseye.com',
      subject: 'Thanks for registering.',
      template: verifyAccountEmail(url),
      redirect: '/verified',
      member: Member
    };

    memberInstance.verify(options, function(err, response) {
      if (err) return next(err);

      console.log('> verification email sent:', response);
      //next(response);
      //return response;
      next();

    });*/

    /*new Promise((resolve, reject) =>
      {
        Member.generateVerificationToken(memberInstance, null, async (errToken, token) =>
        {
          if (errToken)
          {
            return reject(errToken);
          }

          try
          {
            // update verification token and organization id
            memberInstance.verificationToken = token;
            memberInstance.save();
            const url = 'http://localhost:4200/#/verify-email/' + memberInstance.id.toString() +
              '/' + token;
            const pass = memberInstance.password;
            const template = verifyAccountEmail(url, pass);
            const {Email} = app.models;
            const subject = 'Verify your email to get started';
            Email.send({
              to: memberInstance.email, from: app.get('email'), subject, html: template
            }, (err) =>
            {
              if (err)
              {
                return reject(err);
              }
              // email sent
              //return resolve();
              console.log('> Email Sent!!')
              //next();
            });
            next();
            //return resolve();
          }
          catch (err)
          {
            debug('ERROR sending account verification', err);
            return reject(err);
          }
        }); // generate token
      });*/
  });

  Member.observe('after save', function(ctx, next) {
  const member = ctx.instance || ctx.data;
    Member.findOne({where: {email: member.email}}, function(err, memberInstance){
      
        if (!ctx.isNewInstance && (member.role_id==2 || member.role_id == 3)) {
          if(member.status == 'active' && member.emailVerified == false && !memberInstance.hasOwnProperty('emailSent')) {
              Member.generateVerificationToken(memberInstance, null,  (errToken, token) =>
            {
              if (errToken)
              {
                console.log(errToken);
              } else {
                try
                {
                  // update verification token and organization id
                  memberInstance.verificationToken = token;
                  memberInstance.emailSent = true;
                  var randomstring = Math.random().toString(36).slice(-8);
                  memberInstance.password = randomstring;
                  memberInstance.save();
                  const url = 'http://www.thinkbeauty.net/panel/#/verify-email/' + memberInstance.id.toString() +
                    '/' + token;
                  const pass = memberInstance.password;
                  const template = verifyAccountEmail(url, randomstring, memberInstance.email, memberInstance.name, 'http://www.thinkbeauty.net:3000/#/panel/artist');
                  const {Email} = app.models;
                  const subject = 'Verify your email to get started';
                  inlineCss(template,  { url: 'http://example.com/mushroom'})
                  .then(function(html) {
                      Email.send({
                        to: memberInstance.email, from: app.get('email'), subject, html: html
                      }, (err) =>
                      {
                        if (err)
                        {
                          console.log('ERROR sending account verification', err);
                        }
                        // email sent
                        //return resolve();
                        console.log('> Email Sent to !! >>'+memberInstance.email)
                        //next();
                      });
                    });
                  //next();
                  //return resolve();
                }
                catch (err)
                {

                  console.log('ERROR sending account verification', err);
                  //return reject(err);
                }
              }
            });
          }
        }
    });
  next();
});
  
  const passwordEmailTemplatePath = path.normalize(path.join(
    __dirname,
    '../',
    'templates', 'emails', 'reset-password.ejs'
  ));

  const passwordEmailTemplate = Fs.readFileSync(passwordEmailTemplatePath, 'utf8');

  Member.on('resetPasswordRequest', async function(info)
  {
    console.log(info);
    const userEmail = info.email;

    console.log('Finding customer with id', userEmail);
    const member = await Member.findOne({where: {email: userEmail}});

    const url = `http://www.thinkbeauty.com/#/resetpassword/${member.id}/${info.accessToken.id}`;
    const emailTemplateParams = {
      logoUrl: '',
      url,
      member
    };
    const emailHtml = ejs.render(passwordEmailTemplate, emailTemplateParams);

    const {Email} = app.models;
    Email.send(
      {
        to: info.email,
        from: {
          name: 'Bullseye',
          address: 'noreply@bullseye.com'
        },
        subject: 'Reset your Bullseye password',
        html: emailHtml
      },
      function(err)
      {
        if (err)
        {
          console.log('> error sending password reset email');
        }
        else
        {
          console.log('> sending password reset email to:', info.email);
        }
      }
    );
  });


  Member.getArtists = function(date, country, serviceType, cb) {
      let filterWithDate = {}
      if(date) {
        filterWithDate = {
          relation: 'artistavailabilities', // include the owner object
          scope: {
            where: {date: date}
          }
        };
      }
      Member.find({
        include: [{
          relation: 'artistservices', // include the owner object
          scope: { 
            where: {servicetype: serviceType} 
           
          }
        },
        filterWithDate
        ,
         {
          relation: 'countries', // include the owner object
          scope: { 
            where: {id: country}
          }
          },
         {
          relation: 'filestorages', // include the owner object
           scope: { 
            where: {uploadType: 'main', status : 'active'} 
           
          }
          }
        ],
        where : {
          role_id : 2
        }
      }, function(err, result) {

        let data =  JSON.stringify(result);
        let finalData = JSON.parse(data)
          
        var newArray = finalData.filter(function (el) {
          return el.artistservices.length > 0;  
        });
          
          cb(null, newArray);
      });


  }

  Member.getArtistWithServices = function(date, country, serviceType, cb) {
      if(serviceType == 'hair') {
        serviceType = 'hairs';
      } else if(serviceType == 'makeup') {
        serviceType = 'makeups'
      } else {
        serviceType = 'nails'
      }
      let filterWithDate = {}
      if(date) {
        filterWithDate = {
          relation: 'artistavailabilities', // include the owner object
          scope: {
            where: {date: date}
          }
        };
      }
      Member.find({
        include: [{
          relation: 'artistservices', // include the owner object
          scope: { 
            include : { "relation" : serviceType}
          }
        },
        filterWithDate
        ,
         {
          relation: 'countries', // include the owner object
          scope: { 
            where: {id: country}
          }
          },
         {
          relation: 'filestorages', // include the owner object
           scope: { 
            where: {uploadType: 'main', status : 'active'} 
           
          }
          }
        ],
        where : {
          role_id : 2
        }
      }, function(err, result) {

        let data =  JSON.stringify(result);
        let finalData = JSON.parse(data)
          
        var newArray = finalData.filter(function (el) {
          let elArtistServices =  JSON.stringify(el.artistservices);
          let finalDataServices = JSON.parse(elArtistServices)
          el.artistservices = finalDataServices.filter(function(elInner){
              if(elInner[serviceType]){
                return true;  
              } else {
                elInner[serviceType] = {}
              }           
          })
          return el.artistservices.length > 0;  
        });
          
          cb(null, newArray);
      });


  }
  
  function getMemberDetails(type, data, cb){
    let filterWithDate = {}
    if(data.date) {
      if(type == 'vacationFound') {

      } else if( type == 'specificDate') {
          filterWithDate = {
            relation: 'artistavailabilities', // include the owner object
            scope: {
              where: {date: data.date, days: "specificDate"}
            }
          };      
        } else if( type == 'otherDays') {
          let dayNumber = moment(data.date).day();
          let weekends = [4,5];
          let whereDate = {}
          if(weekends.indexOf(dayNumber) > -1) {
            whereDate = {where: {memberId:data.artistId, days: "weekend"}}
          } else {
            whereDate = {where: {memberId:data.artistId, days: "working"}}
          }
          console.log(whereDate);
          if(data.date) {
            filterWithDate = {
              relation: 'artistavailabilities', // include the owner object
              scope: whereDate
            };
          }
        }
      }    

    Member.find({
      include: [{
        relation: 'artistservices', // include the owner object
        scope: {
          where: {
            servicetype: data.serviceType
          },
          include : {"relation" : data.service}
        }
      },
      filterWithDate,
      {
        relation: 'countries', // include the owner object
      },
      {
        relation: 'filestorages', // include the owner object
        scope: {
          where: {
            uploadType: 'main',
            status: 'active'
          }
        }
      }
      ],
      where: {
          id: data.artistId
      }
    }, function(err, result) {

        if(result) {
          let resultData =  JSON.stringify(result);
          let finalData = JSON.parse(resultData);
          if(type != '') {
            var newArray = finalData;
            console.log(finalData);
            var newArray = finalData.filter(function (el) {
              let elArtistServices =  JSON.stringify(el.artistservices);
              let finalDataServices = JSON.parse(elArtistServices)
              el.artistservices = finalDataServices.filter(function(elInner){
                  if(elInner[data.service]){
                    return true;  
                  } else {
                    elInner[data.service] = {};
                    return true;
                  }        
              })
              return el.artistservices.length > 0;  
            });
          } else {
            var newArray = finalData;
          }
          if(type == 'vacationFound') {
              newArray[0].artistavailabilities = [{"message" : "Artist is on vacation on selected date. Please select other date.", status : 2}];  
              cb(null, newArray);
          } else if(type == 'specificDate' && newArray[0].artistavailabilities.length == 0) {
              getMemberDetails('otherDays', data, cb);
          } else {
            if(type != '' && newArray[0].artistavailabilities && newArray[0].artistavailabilities.length) {

              var startHour = moment(newArray[0].artistavailabilities[0].hoursfrom, ["h:mm A"]).format("HH"); 
              var startHourMinute = moment(newArray[0].artistavailabilities[0].hoursfrom, ["h:mm A"]).format("mm"); 
              
              var endHour = moment(newArray[0].artistavailabilities[0].hoursto, ["h:mm A"]).format("HH"); 
              var endHourMinute = moment(newArray[0].artistavailabilities[0].hoursto, ["h:mm A"]).format("mm"); 
              

              var startTime = moment().utc().set({hour:startHour,minute:startHourMinute});
              var endTime = moment().utc().set({hour:endHour,minute:endHourMinute});

              var timeStops = [];

              while(startTime <= endTime) {
                timeStops.push(new moment(startTime).format('HH:mm'));
                startTime.add(30, 'minutes');
              }
              newArray[0].artistavailabilities[0].availabilitySlots = timeStops;


              var breakStartHour = moment(newArray[0].artistavailabilities[0].breakfrom, ["h:mm A"]).format("HH"); 
              var breakStartHourMinute = moment(newArray[0].artistavailabilities[0].breakfrom, ["h:mm A"]).format("mm"); 
              var breakEndHour = moment(newArray[0].artistavailabilities[0].breakto, ["h:mm A"]).format("HH"); 
              var breakEndHourMinute = moment(newArray[0].artistavailabilities[0].breakto, ["h:mm A"]).format("mm"); 

              var startTime = moment().utc().set({hour:breakStartHour,minute:breakStartHourMinute});
              var endTime = moment().utc().set({hour:breakEndHour,minute:breakEndHourMinute});

              var breakTimeStops = [];

              while(startTime <= endTime) {
                breakTimeStops.push(new moment(startTime).format('HH:mm'));
                startTime.add(30, 'minutes');
              }

              newArray[0].artistavailabilities[0].breakSlots = breakTimeStops;
              newArray[0].artistavailabilities[0].status = 0;
            }

            if(typeof newArray[0]['artistavailabilities'] == 'undefined') {
              newArray[0]['artistavailabilities'] = [{"message" : "There is no availability for this servicetype.", status : 1}];
            }
            cb(null, newArray);
          }
          
          //console.log(newArray);
          
        } else {
          console.log("In else");
        }
    });
  }
  Member.getArtistById =  function(data, cb) {
      const {Role, Artistvacation} = app.models;
      if(data.service == 'hair') {
        data.service = 'hairs';
      } else if(data.service == 'makeup') {
        data.service = 'makeups'
      } else {
        data.service = 'nails'
      }
      if(data.date) {
        Artistvacation.find({where: {and: [{starton: {lt : new Date(data.date)}}, {endon: {gt : new Date(data.date)}}]}},  function(err, vacation){
          if(vacation.length) {
            getMemberDetails('vacationFound', data, cb);
            //resArr[0].status = 'vacationFound';
            //cb(null, resArr);
          } else {            
            getMemberDetails('specificDate', data, cb);
          }
        });
      } else {
        getMemberDetails('', data, cb);
        //resArr[0].status = 'specificDate';
        //cb(null, resArr);
      }
  
  }
  Member.remoteMethod('getArtists', {
          http: {path: '/getArtists', verb: 'get'},
          accepts: [
              {arg: 'date', type: 'string'},
              {arg: 'country', type: 'string'},
              {arg: 'serviceType', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });

  Member.remoteMethod('getArtistWithServices', {
          http: {path: '/getArtistWithServices', verb: 'get'},
          accepts: [
              {arg: 'date', type: 'string'},
              {arg: 'country', type: 'string'},
              {arg: 'serviceType', type: 'string'}],
          returns: {arg: 'data', type: 'json'}
    });

  Member.remoteMethod('getArtistById', {
          http: {path: '/getArtistById', verb: 'post'},
          accepts: [
              {arg: '', type: 'object', http: { source: 'body' }}],
          returns: {arg: 'data', type: 'json'}
    });
};
