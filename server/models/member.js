//'use strict';
var config = require('../../server/config.json');
var path = require('path');
var moment = require('moment');
const ejs = require('ejs');
const Fs = require('fs');
const app = require('../server.js');
const inlineCss = require('inline-css');
const resetPasswordTemp = require('../templates/emails/reset-password.js');
const verifyAccountEmail = require('../templates/emails/verify-account-email.js');
const landingRegistration = require('../templates/emails/landing-registration.js');
module.exports = function(Member) {

    Member.afterRemote('login', async function(ctx, member, next) {
        var inputArgs = ctx.args.credentials;
        console.log(inputArgs);
        const {
            Member,
            CustomerPoint,
            DeviceToken
        } = app.models;
        let data = JSON.stringify(member);
        let finalData = JSON.parse(data);

       // console.log(finalData);
        let memberData = await Member.findOne({where:{id:finalData.userId}});
        //console.log(memberData);
        if(memberData && memberData.role_id !=1) {
            //console.log('here');
            var deviceToken = await DeviceToken.findOne({where : {memberId: memberData.id, osType : inputArgs.osType}});
            //console.log(memberData.id, deviceToken.memberId)
            //console.log(deviceToken)
            if(deviceToken) {
                deviceToken.deviceToken = inputArgs.deviceToken;
                deviceToken.osType = inputArgs.osType;
                deviceToken.memberId = memberData.id;
                deviceToken.save();
            } else {
                //console.log('in else');
                var deviceToken = await DeviceToken.findOne({where : {deviceToken: inputArgs.deviceToken}});
                if(deviceToken) {
                    deviceToken.memberId = memberData.id;
                    deviceToken.osType = inputArgs.osType;
                    deviceToken.save();    
                } else {
                    //console.log("i am here");
                    DeviceToken.create({"memberId": memberData.id,
                    "userType": (memberData.role_id == 2) ? "artist" : "user",
                    "deviceToken": inputArgs.deviceToken,
                    "osType" : inputArgs.osType
                })
                }
                
            }
        }

        if (finalData.user) {
            var cp = await CustomerPoint.find({
                where: {
                    userId: finalData.userId
                }
            })
            if (cp) {
                console.log(cp);
                var totalPoints = 0;
                var newArray = cp.filter(function(el) {
                    if (el.points > 0) {
                        totalPoints += parseInt(el.points);
                    }
                    return true;
                });
                finalData.user.pointsEarned = totalPoints;
                ctx.result = finalData;
            } else {
                finalData.user.pointsEarned = 0;
                ctx.result = finalData;
                return ctx.result;
            }            
        } else {
            return member;
        }
    })
    Member.afterRemote('create', function(context, memberInstance, next) {
        console.log('> member.afterRemote triggered');
        const {
            Role,
            RoleMapping
        } = app.models;
        Role.findOne({
            where: {
                role_id: memberInstance.role_id
            }
        }, function(err, role) {
            role.principals.create({
                principalType: RoleMapping.USER,
                principalId: memberInstance.id
            });
        });


        console.log(memberInstance);
        var username = '';
        if (memberInstance.username) {
            username = memberInstance.username
        } else {
            username = memberInstance.name;
        }

        const template = landingRegistration(username);
        const {
            Email
        } = app.models;
        const subject = 'Welcome to Think Beauty!';
        inlineCss(template, {
                url: 'http://example.com/mushroom'
            })
            .then(function(html) {
                Email.send({
                    to: memberInstance.email,
                    from: app.get('email'),
                    subject,
                    html: html
                }, (err) => {
                    if (err) {
                        console.log(err);
                    }
                    // email sent
                    //return resolve();
                    next();
                    console.log('> Email Sent!!')
                });
            });

        if (memberInstance.role_id == 4) {
            Member.generateVerificationToken(memberInstance, null, (errToken, token) => {
                if (errToken) {
                    console.log(errToken);
                } else {
                    try {
                        console.log(memberInstance);
                        // update verification token and organization id
                        memberInstance.verificationToken = token;
                        memberInstance.emailSent = true;
                        /*var randomstring = Math.random().toString(36).slice(-8);
                        memberInstance.password = randomstring;*/
                        memberInstance.save();
                        const url = 'https://www.thinkbeauty.net/panel/#/verify-email/' + memberInstance.id.toString() +
                            '/' + token+'/user';
                        //const pass = memberInstance.password;
                        const template = verifyAccountEmail(url, context.args.data.password, memberInstance.email, memberInstance.name, 'https://www.thinkbeauty.net/panel/#/artist');
                        const {
                            Email
                        } = app.models;
                        const subject = 'Verify your email to get started';
                        inlineCss(template, {
                                url: 'http://example.com/mushroom'
                            })
                            .then(function(html) {
                                Email.send({
                                    to: memberInstance.email,
                                    from: app.get('email'),
                                    subject,
                                    html: html
                                }, (err) => {
                                    if (err) {
                                        console.log('ERROR sending account verification', err);
                                    }
                                    // email sent
                                    //return resolve();
                                    console.log('> Email Sent to !! >>' + memberInstance.email)
                                    //next();
                                });
                            });
                        //next();
                        //return resolve();
                    } catch (err) {

                        console.log('ERROR sending account verification', err);
                        //return reject(err);
                    }
                }
            });
        }
        if ((memberInstance.role_id == 2 || memberInstance.role_id == 3) && memberInstance.status == 'active') {
            Member.generateVerificationToken(memberInstance, null, (errToken, token) => {
                if (errToken) {
                    console.log(errToken);
                } else {
                    try {
                        // update verification token and organization id
                        memberInstance.verificationToken = token;
                        memberInstance.emailSent = true;
                        var randomstring = '';
                        if (!memberInstance.password) {
                            randomstring = Math.random().toString(36).slice(-8);
                            memberInstance.password = randomstring;
                        } else {
                            randomstring = context.args.data.password;
                        }

                        memberInstance.save();
                        const url = 'https://www.thinkbeauty.net/panel/#/verify-email/' + memberInstance.id.toString() +
                            '/' + token;
                        //const pass = memberInstance.password;
                        const template = verifyAccountEmail(url, randomstring, memberInstance.email, memberInstance.name, 'https://www.thinkbeauty.net/panel/#/artist');
                        const {
                            Email
                        } = app.models;
                        const subject = 'Verify your email to get started';
                        inlineCss(template, {
                                url: 'http://example.com/mushroom'
                            })
                            .then(function(html) {
                                Email.send({
                                    to: memberInstance.email,
                                    from: app.get('email'),
                                    subject,
                                    html: html
                                }, (err) => {
                                    if (err) {
                                        console.log('ERROR sending account verification', err);
                                    }
                                    // email sent
                                    //return resolve();
                                    console.log('> Email Sent to !! >>' + memberInstance.email)
                                    //next();
                                });
                            });
                        //next();
                        //return resolve();
                    } catch (err) {

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

        if (!ctx.isNewInstance && ctx.where) {
            Member.findOne({
                where: {
                    id: ctx.where.id
                }
            }, function(err, memberInstance) {
                if (!ctx.isNewInstance && (memberInstance.role_id == 2 || memberInstance.role_id == 3)) {
                    if (member.status == 'active' && memberInstance.emailVerified == false) {
                        Member.generateVerificationToken(memberInstance, null, (errToken, token) => {
                            if (errToken) {
                                console.log(errToken);
                            } else {
                                try {
                                    // update verification token and organization id
                                    memberInstance.verificationToken = token;
                                    memberInstance.emailSent = true;
                                    var randomstring = Math.random().toString(36).slice(-8);
                                    memberInstance.password = randomstring;
                                    memberInstance.save();
                                    const url = 'https://www.thinkbeauty.net/panel/#/verify-email/' + memberInstance.id.toString() +
                                        '/' + token;
                                    const pass = memberInstance.password;
                                    const template = verifyAccountEmail(url, randomstring, memberInstance.email, memberInstance.name, 'https://www.thinkbeauty.net/panel/#/artist');
                                    const {
                                        Email
                                    } = app.models;
                                    const subject = 'Verify your email to get started';
                                    inlineCss(template, {
                                            url: 'http://example.com/mushroom'
                                        })
                                        .then(function(html) {
                                            Email.send({
                                                to: memberInstance.email,
                                                from: app.get('email'),
                                                subject,
                                                html: html
                                            }, (err) => {
                                                if (err) {
                                                    console.log('ERROR sending account verification', err);
                                                }
                                                // email sent
                                                //return resolve();
                                                console.log('> Email Sent to !! >>' + memberInstance.email)
                                                //next();
                                            });
                                        });
                                    //next();
                                    //return resolve();
                                } catch (err) {

                                    console.log('ERROR sending account verification', err);
                                    //return reject(err);
                                }
                            }
                        });
                    }
                }
            });
        }
        next();
    });

    const passwordEmailTemplatePath = path.normalize(path.join(
        __dirname,
        '../',
        'templates', 'emails', 'reset-password.ejs'
    ));

    const passwordEmailTemplate = Fs.readFileSync(passwordEmailTemplatePath, 'utf8');

    Member.on('resetPasswordRequest', async function(info, cb) {
        //console.log(info);
        const userEmail = info.email;

        //console.log('Finding customer with id', userEmail);
        const member = await Member.findOne({
            where: {
                email: userEmail
            }
        });
        var url = '';
        if(member.role_id != 4) {
             url = `https://www.thinkbeauty.net/panel/#/resetpassword/${member.id}/${info.accessToken.id}`;
        } else {
            url = `https://www.thinkbeauty.net/panel/#/resetpassword/${member.id}/${info.accessToken.id}/user`;
            //return {token : info.accessToken.id}
        }
            
            const emailTemplateParams = {
                logoUrl: '',
                url,
                member
            };
            console.log(member);
            const emailHtml = ejs.render(passwordEmailTemplate, emailTemplateParams);
            const template = resetPasswordTemp(url, member);
            const {
                Email
            } = app.models;
            inlineCss(template, {
                url: 'http://example.com/mushroom'
            })
            .then(function(html) {
                Email.send({
                        to: info.email,
                        from: app.get('email'),
                        subject: 'Reset your ThinkBeauty password',
                        html: html
                    },
                    function(err) {
                        if (err) {
                            console.log(err);
                            console.log('> error sending password reset email');
                        } else {
                            console.log('> sending password reset email to:', info.email);
                        }
                    }
                );
            })
        
        
    });


    Member.showProfile = function(memberId, cb) {
        if (memberId) {
            Member.findOne({
                where: {
                    id: memberId
                }
            }, function(err, member) {
                if (member) {
                    cb(null, member);
                }
            })
        } else {
            cb(null, {
                status: 0,
                message: "User Id is required"
            });
        }

    }

    Member.showArtistProfile = function(artistId, cb) {
        let currencyCodes = {
            "Kuwait": "KD",
            "Bahrain": "BHD",
            "UAE": "AED",
            "Oman": "OMR"
        }
        if (artistId) {
            Member.find({
                where: {
                    id: artistId
                },
                include : [
                {
                    relation: 'filestorages', // include the owner object
                    scope: {
                        where: {
                            uploadType: 'profile',
                            status: 'active'
                        }

                    }
                },
                {
                    relation : "countries"
                },
                {
                    relation : "provinces"
                },
                {
                    relation: 'artistservices', // include the owner object
                    scope: {
                        include: [{"relation": "hairs"},{"relation": "makeups"},{"relation": "microbladings"}]
                    }
                }
                ]
            }, function(err, member) {
                if (member) {
                    let data = JSON.stringify(member);
                    let finalData = JSON.parse(data)

                    var newArray = finalData.filter(function(el) {
                        let elArtistServices = JSON.stringify(el.artistservices);
                        let finalDataServices = JSON.parse(elArtistServices);
                        el.artistservices = finalDataServices.filter(function(elInner) {
                            if(elInner.hairs) {
                                elInner.service = 'hairs';
                            } else if(elInner.makeups) {
                                elInner.service = 'makeups';
                            } else if(elInner.microbladings) {
                                elInner.service = 'microbladings';
                            } 
                            if (el.countries.name == 'Saudi Arabia') {
                                elInner.currencyCode = 'SAR';
                            } else {
                                elInner.currencyCode = currencyCodes[el.countries.name];
                            }
                            if(elInner.service) {
                                elInner.subServiceName = elInner[elInner.service].name;
                                return true;
                            }
                        });
                        return true;
                    });
                    cb(null, newArray);
                }
            })
        } else {
            cb(null, {
                status: 0,
                message: "Artist Id is required"
            });
        }

    }



    Member.getArtists = function(date, country, serviceType, cb) {
        let filterWithDate = {}
        if (date) {
            filterWithDate = {
                relation: 'artistavailabilities', // include the owner object
                scope: {
                    where: {
                        date: date
                    }
                }
            };
        }
        Member.find({
            include: [{
                    relation: 'artistservices', // include the owner object
                    scope: {
                        where: {
                            servicetype: serviceType
                        }

                    }
                },
                filterWithDate,
                {
                    relation: 'countries', // include the owner object
                    scope: {
                        where: {
                            id: country
                        }
                    }
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
                role_id: 2
            }
        }, function(err, result) {

            let data = JSON.stringify(result);
            let finalData = JSON.parse(data)

            var newArray = finalData.filter(function(el) {
                return el.artistservices.length > 0;
            });

            cb(null, newArray);
        });


    }

    Member.getArtistWithServices = async function(date, country, serviceType, price, city, time, service, subserviceId, month, cb) {
        if (serviceType == 'hair') {
            serviceType = 'hairs';
        } else if (serviceType == 'makeup') {
            serviceType = 'makeups'
        } else if (serviceType == 'microblading') {
            serviceType = 'microbladings'
        } else {
            serviceType = 'nails'
        }
        let filterWithDate = {}
        var countryFilter = {},
            cityFilter = {},
            serviceFilter = {}
        if (country) {
            countryFilter = {
                country: country
            };
        }

        if (city) {
            cityFilter = {
                city: city
            };
        }
        if (service) {
            serviceFilter = {
                servicetype: service
            }
        }
        if (subserviceId) {
            serviceFilter.subserviceId = subserviceId;
        }

        const {Artistavailability} = app.models;

        if (date) {
            var artistAvailabilities = await Artistavailability.find({where: {date: new Date(date)}});
            if(artistAvailabilities) {
                whereDate = {where: {date: date}};
            } else {
                let dayNumber = moment(date).day();
                let weekends = [5,6];
                let whereDate = {}
                if (weekends.indexOf(dayNumber) > -1) {
                    whereDate = {
                        where: {
                            days: "weekend"
                        }
                    }
                } else {
                    whereDate = {
                        where: {
                            days: "working"
                        }
                    }
                }
            }
            //console.log(whereDate);
            

            filterWithDate = {
                relation: 'artistavailabilities',
                scope : whereDate
            };
            console.log(filterWithDate);
            var filteredDate = new Date(date);
            var result = await Member.find({
                include: [{
                        relation: 'artistservices', // include the owner object
                        scope: {
                            include: {
                                "relation": serviceType
                            },
                            where: serviceFilter
                        }
                    },{
                        relation: 'bookingslots', // include the owner object
                        scope: {
                            where: {
                                bookingDate: date
                            }
                        }
                    },{
                        relation: 'artistvacations', // include the owner object
                        scope: {
                            where: {
                                and: [{
                                    starton: {
                                        lte: filteredDate
                                    }
                                }, {
                                    endon: {
                                        gte: filteredDate
                                    }
                                }]
                            }
                        }
                    },
                    {
                        relation: 'updates', // include the owner object
                    },
                    {
                        relation: 'bookingstatuses', // include the owner object
                        scope: {
                            where: {
                                fullyBooked: true,
                                date : date
                            }
                        }
                    },
                    filterWithDate,
                    {
                        relation: 'countries', // include the owner object
                    }, {
                        relation: 'provinces', // include the owner object
                    },
                    {
                        relation: 'filestorages', // include the owner object
                        scope: {
                            where: {
                                status: 'active'
                            }
                        }
                    }
                ],
                where: {
                    and: [{
                        or: [{
                            role_id: 2
                        }, {
                            role_id: 3
                        }]
                    }, countryFilter, cityFilter]
                }
            });


            let data = JSON.stringify(result);
            let finalData = JSON.parse(data);
            //console.log(finalData);
           //return finalData;
                /*console.log(finalData);
                return false;*/
            let vacationsArr = [],
                bookingArr = []

            var newArray = finalData.filter(function(el) {
                let elArtistServices = JSON.stringify(el.artistservices);
                let finalDataServices = JSON.parse(elArtistServices)
                el.artistservices = finalDataServices.filter(function(elInner) {
                    //console.log(elInner);
                    if (price) {
                        console.log(elInner.price, parseInt(price));
                        if (elInner[serviceType] && elInner.price <= parseInt(price)) {
                            return true;
                        }
                    } else {
                        if (elInner[serviceType]) {
                            return true;
                        } else if (!subserviceId) {
                            elInner[serviceType] = {}
                        }
                    }
                })

                //console.log(el.artistservices);
                if (month) {
                    let vacations = JSON.stringify(el.artistvacations);
                    let finalVacations = JSON.parse(vacations)
                    var vacationsArr = new Array();

                    el.artistvacations = finalVacations.filter(function(elInner) {
                        if (elInner) {
                            var start = new Date(elInner.starton);
                            var end = new Date(elInner.endon);

                            var
                                arr = new Array(),
                                dt = new Date(start);

                            while (dt <= end) {                               
                                arr.push(moment(new Date(dt)).format("YYYY-MM-DD"));
                                dt.setDate(dt.getDate() + 1);
                            }
                            vacationsArr = vacationsArr.concat(arr);
                            return true;
                        }
                    })

                    if(vacationsArr) {
                        vacationsArr = vacationsArr.filter(function(elInner) {
                            if(moment(new Date(elInner)).month == month){
                                return true;
                            }
                        })
                    }

                    if(el.bookingslots.length) {
                        let bookings = JSON.stringify(el.bookingslots);
                        let finalBookings = JSON.parse(bookings)

                        el.finalBookings = finalBookings.filter(function(elInner) {
                            if(elInner && moment(new Date(elInner.bookingDate)).month == month) {
                                bookingArr.push(moment(new Date(elInner.bookingDate)).format("YYYY-MM-DD"))
                            }
                        })
                    }

                    var totalDays = vacationsArr.concat(bookingArr);
                    if(moment(moment().month(month).format("YYYY-MM"), 'YYYY-MM').daysInMonth() > totalDays.length) {
                        return true;
                    }

                }

                /*el.bookingslots.length*/
                //console.log(el.artistservices.length, el.artistvacations.length, el.bookingstatuses.length);
                if (el.artistservices.length > 0 && el.artistvacations.length == 0 && el.bookingstatuses.length == 0 && el.artistavailabilities.length > 0) {

                    return true;
                }
            });
            return newArray;
            //cb(null, newArray);

        } else {
            filterWithDate = {
                relation: 'artistavailabilities', // include the owner object
            };
            var result = await Member.find({
                include: [{
                        relation: 'artistservices', // include the owner object
                        scope: {
                            include: {
                                "relation": serviceType
                            },
                            where: serviceFilter
                        }
                    },
                    filterWithDate,
                    {
                        relation: 'bookingslots', // include the owner object
                    },
                    {
                        relation: 'artistvacations'
                    },
                    {
                        relation: 'countries', // include the owner object
                    }, {
                        relation: 'provinces', // include the owner object
                    },
                    {
                        relation: 'updates', // include the owner object
                    },
                    {
                        relation: 'filestorages', // include the owner object
                        scope: {
                            where: {
                                status: 'active'
                            }
                        }
                    }
                ],
                where: {
                    and: [{
                        or: [{
                            role_id: 2
                        }, {
                            role_id: 3
                        }]
                    }, countryFilter, cityFilter]
                }
            });
            console.log(countryFilter);
                let data = JSON.stringify(result);
                let finalData = JSON.parse(data);

                let vacationsArr = [],
                    bookingArr = []

                //console.log(finalData);
                var newArray = finalData.filter(function(el) {
                    let elArtistServices = JSON.stringify(el.artistservices);
                    let finalDataServices = JSON.parse(elArtistServices)

                    if(el.artistavailabilities.length == 0) {
                        return false;
                    }
                    el.artistservices = finalDataServices.filter(function(elInner) {
                        //console.log(elInner);
                        if (price) {
                            return elInner.price <= parseInt(price);
                        } else {
                            if (elInner[serviceType]) {
                                return true;
                            } else if (!subserviceId) {
                                elInner[serviceType] = {}
                            }
                        }
                    })

                    if (month && el.artistservices.length) {
                        let vacations = JSON.stringify(el.artistvacations);
                        let finalVacations = JSON.parse(vacations)
                        var vacationsArr = new Array();

                        el.artistvacations = finalVacations.filter(function(elInner) {
                            if (elInner) {
                                var start = new Date(elInner.starton);
                                var end = new Date(elInner.endon);

                                var
                                    arr = new Array(),
                                    dt = new Date(start);

                                while (dt <= end) {                               
                                    arr.push(moment(new Date(dt)).format("YYYY-MM-DD"));
                                    dt.setDate(dt.getDate() + 1);
                                }
                                vacationsArr = vacationsArr.concat(arr);
                                return true;
                            }
                        })

                        if(vacationsArr) {
                            vacationsArr = vacationsArr.filter(function(elInner) {
                                if(moment(new Date(elInner)).month() == month){
                                    return true;
                                }
                            })
                        }

                        if(el.bookingslots.length) {
                            let bookings = JSON.stringify(el.bookingslots);
                            let finalBookings = JSON.parse(bookings)

                            el.finalBookings = finalBookings.filter(function(elInner) {
                                if(elInner && moment(new Date(elInner.bookingDate)).month == month) {
                                    bookingArr.push(moment(new Date(elInner.bookingDate)).format("YYYY-MM-DD"))
                                }
                            })
                        }

                        var totalDays = vacationsArr.concat(bookingArr);
                        console.log(moment(moment().month(month).format("YYYY-MM"), 'YYYY-MM').daysInMonth(), totalDays.length);
                        if(moment(moment().month(month).format("YYYY-MM"), 'YYYY-MM').daysInMonth() > totalDays.length) {
                            return true;
                        }

                    }
                    else if (el.artistservices.length > 0) {
                        //delete el['artistservices'];
                        return true;
                    }
                });
                return newArray;            
        }
    }

    function getMemberDetails(type, data, cb) {
        //console.log(data);
        let filterWithDate = {};
        const {
            Commissions,
            Booking,
            BookingSlot,
            bookingStatus
        } = app.models;
        let currencyCodes = {
            "Kuwait": "KD",
            "Bahrain": "BHD",
            "UAE": "AED",
            "Oman": "OMR"
        }


        if (data.date) {
            if (type == 'vacationFound') {

            } else if (type == 'specificDate') {
                filterWithDate = {
                    relation: 'artistavailabilities', // include the owner object
                    scope: {
                        where: {
                            date: new Date(data.date),
                            days: "specificDate"
                        }
                    }
                };
            } else if (type == 'otherDays') {
                let dayNumber = moment(data.date).day();
                let weekends = [5,6];
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
                filterWithDate = {
                        relation: 'artistavailabilities', // include the owner object
                    };
                if (data.date) {
                    filterWithDate.scope = whereDate;
                }
            }
        }

        var whereFavorite = {}
        var fixedCharge = {}
        var favoriteRelation = {}
        if (data.userId) {
            var whereFavorite = {
                where: {
                    userId: data.userId
                }
            }
            favoriteRelation = {
                relation: "favourites",
                scope: whereFavorite
            }

        }

        if (data.country) {
            fixedCharge = {
                relation: 'fixedcharges',
                scope: {
                    where: {
                        country: data.country
                    }
                }
            }
        }
        var bookingSlotsFilter = {}

        if(data.serviceType == 'gcc') {
            filterWithDate.relation = 'artistgccs',
            filterWithDate.scope = {include : [{relation: 'artistgcclocations',scope : {where : {country : data.country}}}]}
            bookingSlotsFilter.relation = 'bookingslots'
        } 
        
        Member.find({
            include: [{
                    relation: 'artistservices', // include the owner object
                    scope: {
                        where: {
                            servicetype: data.serviceType
                        },
                        include: {
                            "relation": data.service
                        }
                    }
                },
                filterWithDate,
                bookingSlotsFilter,
                fixedCharge,
                {
                    relation: 'countries', // include the owner object
                },
                {
                    relation: 'provinces', // include the owner object
                },
                {
                    relation: 'updates', // include the owner object
                },
                {
                    relation: 'artistvacations', // include the owner object
                },
                {
                    relation: 'bookingstatuses', // include the owner object
                    scope: {
                        where: {
                            fullyBooked: true
                        }
                    }
                },
                {
                    relation: 'filestorages', // include the owner object
                    scope: {
                        where: {
                            uploadType: 'main',
                            status: 'active'
                        }
                    }
                },
                favoriteRelation
            ],
            where: {
                id: data.artistId
            }
        }, function(err, result) {
            if (result) {
                let resultData = JSON.stringify(result);
                let finalData = JSON.parse(resultData);
                //finalData.commission = Commission;
                console.log(finalData);
                if (type != '') {
                    var newArray = finalData;
                    newArray = finalData.filter(function(el) {
                        if(el.artistservices) {
                            let elArtistServices = JSON.stringify(el.artistservices);
                            let finalDataServices = JSON.parse(elArtistServices)
                            el.artistservices = finalDataServices.filter(function(elInner) {
                                if (elInner[data.service]) {
                                    elInner.subServiceName = elInner[data.service].name;
                                    if (el.countries.name == 'Saudi Arabia') {
                                        elInner.currencyCode = 'SAR';
                                    } else {
                                        elInner.currencyCode = currencyCodes[el.countries.name];
                                    }

                                    return true;
                                } else {}
                            })
                        }
                       

                        let vac = [];
                            if(el.artistvacations){
                                let vacations = JSON.stringify(el.artistvacations);
                                let finalVacations = JSON.parse(vacations)
                                var vacationsArr = new Array();
                                var gccArr = new Array();
                                var bookingArr = new Array();
                                el.artistvacations = finalVacations.filter(function(elInner) {
                                    if (elInner) {
                                        var start = new Date(elInner.starton);
                                        var end = new Date(elInner.endon);

                                        var
                                            arr = new Array(),
                                            dt = new Date(start);

                                        while (dt <= end) {                               
                                            arr.push(moment(new Date(dt)).format("YYYY-MM-DD"));
                                            dt.setDate(dt.getDate() + 1);
                                        }
                                        vacationsArr = vacationsArr.concat(arr);
                                        return true;
                                    }
                                })
                                el.artistvacations = vacationsArr;
                            }
                            

                        if(data.serviceType == 'gcc') {
                            let gcc = JSON.stringify(el.artistgccs);
                            let finalGcc = JSON.parse(gcc)
                            if(el.bookingslots.length) {
                                let bookings = JSON.stringify(el.bookingslots);
                                let finalBookings = JSON.parse(bookings)

                                el.finalBookings = finalBookings.filter(function(elInner) {
                                    if(elInner) {
                                        bookingArr.push(moment(new Date(elInner.bookingDate)).format("YYYY-MM-DD"))
                                    }
                                })
                            }
                            var gccAllLocations = false;
                            el.artistgccs = finalGcc.filter(function(elInner) {
                                if (elInner && elInner.artistgcclocations) {
                                    
                                    console.log(elInner.artistgcclocations.name, data.city);
                                    if(elInner.artistgcclocations.name ==  data.city || elInner.artistgcclocations.name ==  data.countryName) {
                                        var start = new Date(elInner.starton);
                                        var end = new Date(elInner.endon);

                                        var
                                            arr = new Array(),
                                            dt = new Date(start);

                                        while (dt <= end) {
                                            arr.push(moment(new Date(dt)).format("YYYY-MM-DD"));
                                            dt.setDate(dt.getDate() + 1);
                                        }
                                        gccArr = gccArr.concat(arr);
                                        return true;
                                    }
                                } else if(elInner.gcclocation == 'All Locations') {
                                    gccAllLocations = true;
                                }
                            })

                            if(gccAllLocations && gccArr.length == 0) {
                                el.artistgccs = finalGcc.filter(function(elInner) {
                                    if (elInner.gcclocation == 'All Locations') {
                                        var start = new Date(elInner.starton);
                                        var end = new Date(elInner.endon);

                                        var
                                            arr = new Array(),
                                            dt = new Date(start);

                                        while (dt <= end) {
                                            arr.push(moment(new Date(dt)).format("YYYY-MM-DD"));
                                            dt.setDate(dt.getDate() + 1);
                                        }
                                        gccArr = gccArr.concat(arr);
                                        return true;
                                    }                                    
                                })
                            }

                            if(bookingArr.length) {
                                gccArr = gccArr.filter( function( el ) {
                                    return bookingArr.indexOf( el ) < 0;
                                } );    
                            }
                            
                            el.artistgccs = gccArr;
                            el.bookingslots = bookingArr;
                        }
                        if (el.favourites && el.favourites.length) {
                            el.favoriteFlag = el.favourites[0].flag;
                            delete el['favourites'];
                        } else if (el.favourites && el.favourites.length == 0 || !el.favourites) {
                            el.favoriteFlag = false;
                        }
                        return (el.artistservices) ? true : false;
                    });
                    /*newArray = newArray.filter(function (el) {
                      return el.artistavailabilities.length > 0;  
                    });*/
                    //console.log(newArray);
                    //console.log('###################');
                } else {
                    var newArray = finalData;
                }
                if (type == 'vacationFound' && newArray.length) {
                    newArray[0].artistavailabilities = [{
                        "message": "Artist is on vacation on selected date. Please select other date.",
                        status: 2
                    }];
                    cb(null, newArray);
                } else if (type == 'specificDate' && newArray.length == 0) {
                    getMemberDetails('otherDays', data, cb);
                } else if (newArray.length) {

                  if(data.serviceType != 'gcc') {  
                    if (type != '' && newArray[0].artistavailabilities && newArray[0].artistavailabilities.length) {
                        console.log('I am in this if');
                        var startHour = moment(newArray[0].artistavailabilities[0].hoursfrom, ["h:mm A"]).format("HH");
                        var startHourMinute = moment(newArray[0].artistavailabilities[0].hoursfrom, ["h:mm A"]).format("mm");

                        var endHour = moment(newArray[0].artistavailabilities[0].hoursto, ["h:mm A"]).format("HH");
                        var endHourMinute = moment(newArray[0].artistavailabilities[0].hoursto, ["h:mm A"]).format("mm");


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

                        timeStops.splice(-1,1);

                        var breakStartHour = moment(newArray[0].artistavailabilities[0].breakfrom, ["h:mm A"]).format("HH");
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
                        var inputDate = new Date(data.date);
                        var todaysDate = new Date();
                        if(inputDate.setHours(0,0,0,0) == todaysDate.setHours(0,0,0,0)) {
                            
                            //console.log(n);
                            timeStops = timeStops.filter(function(el) {
                                
                                return parseInt(el) > parseInt(data.currentHour);
                            });

                        }

                        var breakTimeStops = [];

                        while (startTime <= endTime) {
                            breakTimeStops.push(new moment(startTime).format('HH:mm'));
                            startTime.add(60, 'minutes');
                        }
                        breakTimeStops.splice(-1,1);
                        timeStops = timeStops.filter(function(el) {
                            return breakTimeStops.indexOf(el) < 0;
                        });
                        BookingSlot.find({
                            where: {
                                bookingDate: data.date,
                                artistId: data.artistId
                            }
                        }, function(err, slotData) {


                            if (slotData) {
                                var finalSlots = [];
                                slotData = slotData.filter(function(el) {
                                    finalSlots = finalSlots.concat(el.slots);
                                    return true;
                                })
                                timeStops = timeStops.filter(function(el) {
                                    return finalSlots.indexOf(el) < 0;
                                });
                                newArray[0].artistavailabilities[0].availabilitySlots = timeStops;
                                newArray[0].artistavailabilities[0].breakSlots = breakTimeStops;
                                newArray[0].artistavailabilities[0].status = 0;
                            } else {
                                newArray[0].artistavailabilities[0].availabilitySlots = timeStops;
                                newArray[0].artistavailabilities[0].breakSlots = breakTimeStops;
                                newArray[0].artistavailabilities[0].status = 0;
                                console.log(newArray[0].artistavailabilities[0]);
                            }
                            Commissions.findOne({
                                where: {
                                    type: "all"
                                }
                            }, function(err, commission) {
                                newArray[0].commission = commission;
                                if(timeStops.length == 0) {
                                    if(data.date && data.date != '') {
                                        Booking.findOne({where: {
                                                date: moment(new Date(data.date)).format('YYYY-MM-DD'),
                                                artistId: data.artistId
                                            }}, function(err, bookingAvail){
                                                if(bookingAvail) {
                                                    bookingStatus.findOne({
                                                        where: {
                                                            date: moment(new Date(data.date)).format('YYYY-MM-DD'),
                                                            artistId: data.artistId
                                                        }
                                                    }, function(err, bookedStatus) {
                                                        if (bookedStatus && bookedStatus.fullyBooked == false) {
                                                            bookedStatus.fullyBooked = true;
                                                            bookedStatus.save();
                                                            newArray[0].bookingstatuses.push(bookedStatus);
                                                            cb(null, newArray);
                                                        } else {
                                                            bookingStatus.create({
                                                                date: moment(new Date(data.date)).format('YYYY-MM-DD'),
                                                                artistId: data.artistId,
                                                                fullyBooked: true
                                                            }, function(err, savedBookingStatus){
                                                                newArray[0].bookingstatuses.push(savedBookingStatus);
                                                                cb(null, newArray);
                                                            });
                                                        }
                                                    });
                                                } else {
                                                    cb(null, newArray);
                                                }

                                        })
                                        
                                    }                                    
                                } else {
                                    cb(null, newArray);    
                                }
                            });

                        });
                    } else if (typeof newArray[0]['artistavailabilities'] == 'undefined' || newArray[0]['artistavailabilities'].length == 0) {
                        if (type == 'specificDate') {
                            getMemberDetails('otherDays', data, cb);
                        } else {
                            newArray[0]['artistavailabilities'] = [{
                                "message": "There is no availability for this servicetype.",
                                status: 1
                            }];
                            Commissions.findOne({
                                where: {
                                    type: "all"
                                }
                            }, function(err, commission) {
                                newArray[0].commission = commission;

                                //console.log(newArray)
                                cb(null, newArray);
                            });
                        }


                    }
                } else {
                    Commissions.findOne({
                                where: {
                                    type: "all"
                                }
                    }, function(err, commission) {
                        newArray[0].commission = commission;

                        //console.log(newArray)
                        cb(null, newArray);
                    });
                }
                } else {
                    //newArray[0]['artistavailabilities'] = [{"message" : "There is no availability for this servicetype.", status : 1}];
                    console.log('here1');
                    cb(null, newArray);
                }

                //console.log(newArray);

            } else {
                console.log("In else");
                cb(null, result);
            }
        });
    }
   /* Member.changePassword = function(userId, oldPassword, newPassword, cb) {

    }*/

    Member.getArtistById = function(data, cb) {
        const {
            Role,
            Artistvacation
        } = app.models;
        if (data.service == 'hair') {
            data.service = 'hairs';
        } else if (data.service == 'makeup') {
            data.service = 'makeups'
        } else if (data.service == 'microblading') {
            data.service = 'microbladings'
        } else {
            data.service = 'nails'
        }
        if (data.date) {
            Artistvacation.find({
                where: {
                    and: [{
                        starton: {
                            lt: new Date(data.date)
                        }
                    }, {
                        endon: {
                            gt: new Date(data.date)
                        }
                    }, {memberId : data.artistId}]
                }
            }, function(err, vacation) {
                console.log(vacation);
                if (vacation.length) {
                    getMemberDetails('vacationFound', data, cb);
                    //resArr[0].status = 'vacationFound';
                    //cb(null, resArr);
                } else {
                    getMemberDetails('specificDate', data, cb);
                }
            });
        } else {
            getMemberDetails('otherDays', data, cb);
            //resArr[0].status = 'specificDate';
            //cb(null, resArr);
        }

    }
    Member.remoteMethod('getArtists', {
        http: {
            path: '/getArtists',
            verb: 'get'
        },
        accepts: [{
                arg: 'date',
                type: 'string'
            },
            {
                arg: 'country',
                type: 'string'
            },
            {
                arg: 'serviceType',
                type: 'string'
            }
        ],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });

    Member.remoteMethod('showProfile', {
        http: {
            path: '/showProfile',
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

    Member.remoteMethod('getArtistWithServices', {
        http: {
            path: '/getArtistWithServices',
            verb: 'get'
        },
        accepts: [{
                arg: 'date',
                type: 'string'
            },
            {
                arg: 'country',
                type: 'string'
            },
            {
                arg: 'serviceType',
                type: 'string'
            },
            {
                arg: 'price',
                type: 'string'
            },
            {
                arg: 'city',
                type: 'string'
            },
            {
                arg: 'time',
                type: 'string'
            },
            {
                arg: 'service',
                type: 'string'
            },
            {
                arg: 'subserviceId',
                type: 'string'
            },
            {
                arg: 'month',
                type: 'string'
            }
        ],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });

    Member.remoteMethod('getArtistById', {
        http: {
            path: '/getArtistById',
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


    Member.remoteMethod('showArtistProfile', {
        http: {
            path: '/showArtistProfile',
            verb: 'get'
        },
        accepts: [{
            arg: 'artistId',
            type: 'string'
        }],
        returns: {
            arg: 'data',
            type: 'json'
        }
    });

    /*Member.remoteMethod('changePassword', {
        accepts: [
          {arg: 'id', type: 'any', http: getUserIdFromRequestContext},
          {arg: 'oldPassword', type: 'string', required: true, http: {source: 'form'}},
          {arg: 'newPassword', type: 'string', required: true, http: {source: 'form'}},
          {arg: 'options', type: 'object', http: 'optionsFromRequest'},
        ],
        http: {verb: 'POST', path: '/changePassword'},
        returns: {
            arg: 'data',
            type: 'json'
        }
    });*/
};