'use strict';

var config = require('../../server/config.json');
var path = require('path');
var moment = require('moment');
const ejs = require('ejs');
const Fs = require('fs');
const app = require('../server.js');
const verifyAccountEmail = require('../templates/emails/verify-account-email.js');
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

    new Promise((resolve, reject) =>
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
      });
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
              }              
          })
          return el.artistservices.length > 0;  
        });
          
          cb(null, newArray);
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
        Artistvacation.find({where: {and: [{starton: {lt : new Date(data.date)}}, {endon: {gt : new Date(data.date)}}]}}, function(err, vacation){
          if(vacation.length) {
            console.log(vacation);
            cb(null, {'message' : 'Arist is on vacation on selected date. Please try other date.'});
          } else {            
              //console.log(date);
              let filterWithDate = {}
              if(data.date) {
                filterWithDate = {
                  relation: 'artistavailabilities', // include the owner object
                  scope: {
                    where: {date: data.date, days: "specificDate"}
                  }
                };
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
                console.log(result[0].artistavailabilities);
                let resultData =  JSON.stringify(result);
                let finalData = JSON.parse(resultData)
                    
                //console.log(finalData);
                if(finalData[0].artistavailabilities.length) {
                                           
                    var newArray = finalData.filter(function (el) {
                      let elArtistServices =  JSON.stringify(el.artistservices);
                      let finalDataServices = JSON.parse(elArtistServices)
                      el.artistservices = finalDataServices.filter(function(elInner){
                          if(elInner[data.service]){
                            return true;  
                          }              
                      })
                      return el.artistservices.length > 0;  
                    });
                      
                      cb(null, newArray);
                } else {

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
                          let finalData = JSON.parse(resultData)
                            
                          var newArray = finalData.filter(function (el) {
                            let elArtistServices =  JSON.stringify(el.artistservices);
                            let finalDataServices = JSON.parse(elArtistServices)
                            el.artistservices = finalDataServices.filter(function(elInner){
                                if(elInner[data.service]){
                                  return true;  
                                }              
                            })
                            return el.artistservices.length > 0;  
                          });
                            
                            cb(null, newArray);
                      } else {
                        
                      }
                      
                  });
                }
                
            });

          
          }
        })

      } else {
        console.log("I am in else");
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
                {relation : "artistavailabilities"},
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
                let finalData = JSON.parse(resultData)
                  
                var newArray = finalData.filter(function (el) {
                  let elArtistServices =  JSON.stringify(el.artistservices);
                  let finalDataServices = JSON.parse(elArtistServices)
                  el.artistservices = finalDataServices.filter(function(elInner){
                      if(elInner[data.service]){
                        return true;  
                      }              
                  })
                  return el.artistservices.length > 0;  
                });
                  
                  cb(null, newArray);
            } else {
              
            }
            
        });
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
