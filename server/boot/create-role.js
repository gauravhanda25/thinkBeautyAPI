const debug = require('debug')('loopback:boot:roles');
var apn = require('apn');
debug.log = console.log.bind(console);
const app = require('../server.js');
const inlineCss = require('inline-css');
const landingRegistration = require('../templates/emails/landing-registration.js');
module.exports = async function(app)
{
  try
  {
    // used the models

    const {Role, RoleMapping, Member, DealerAddress, DealerContact, Fixedcharge, Oem, Brand, Center, MR, AdvertisingAgency, AutoGroup, AutoGroupContact, AgencyContact, Nails, Makeup, Hair, Artistservices, Artistavailability, Artistvacation, Artistcourses, Email, Artistgcc, FileStorage,Favorite, Booking, Voucher, CustomerPoint, BookingSlot, Update, bookingStatus, Artistgcclocation,  DeviceToken, push} = app.models;


    /* var options = {
      cert: '/var/www/html/thinkBeautyAPI/credentials/cert.pem',
      key: '/var/www/html/thinkBeautyAPI/credentials/key.pem',
      passphrase : '1234',
      production : true
    };
    var apnProvider =  new apn.Provider(options);

    let deviceToken = "1E4A12553D497F40ED1E444039AC50FD9902F12B1CE73AE793D33617141D8878";

    var note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.badge = 3;
    note.sound = "ping.aiff";
    note.alert = "\uD83D\uDCE7 \u2709 goo kha";
    note.payload = {'messageFrom': 'gaurav'};
    note.topic = 'com.ios.Think';
    apnProvider.send(note, deviceToken).then( (result) => {
      console.log(result);
      console.log(result.failed);
    });*/

    // conditional deletion
    /*BookingSlot.destroyAll({}, function(err, t){console.log('deleted')});
    bookingStatus.destroyAll({}, function(err, t){console.log('deleted')});
    Booking.destroyAll({}, function(err, t){console.log('deleted')});
    */

    /*var x = {where : {id : "5b264ef35fcf1f0a40359afb"}};
    console.log(x);
    Artistavailability.findOne(x, function(err, avail){
      console.log(avail);
      avail.date = new Date('2018-06-27');
      avail.save();
    });*/
    

        
      
    const AdminRole = await Role.findOne({where: {name: 'Admin'}});
    if (!AdminRole)
    {
      await Role.create({name: 'Admin', role_id : 1});
      debug('Created Admin role');
    }

    // create custom role Staff
    const orgStaffRole = await Role.findOne({where: {name: 'Artist'}});
    if (!orgStaffRole)
    {
      await Role.create({name: 'Artist', role_id : 2});
      debug('Created Staff role');
    }

    // create custom role Regional Manager
    const orgRegionalManager = await Role.findOne({where: {name: 'Salon'}});
    if (!orgRegionalManager)
    {
      await Role.create({name: 'Salon', role_id : 3});
      debug('Created Regional Manager role');
    }

    const Customer = await Role.findOne({where: {name: 'Customer'}});
    if (!Customer)
    {
      await Role.create({name: 'Customer', role_id : 4});
      debug('Customer created');
    }

// create custom role Account Manager
    


    // fix the mongo db object assignment
    const ObjectID = RoleMapping.getDataSource().connector.getDefaultIdType();

    // Because of this:
    // https://github.com/strongloop/loopback-connector-mongodb/issues/128
    RoleMapping.defineProperty('principalId', {
      type: ObjectID,
    });

    Member.defineProperty('country', {
          type: ObjectID,
        });


    Artistgcclocation.defineProperty('country', {
          type: ObjectID,
        });

    Member.defineProperty('city', {
          type: ObjectID,
        });
     Member.defineProperty('created_by', {
          type: ObjectID,
        });
    
    Nails.defineProperty('created_by', {
          type: ObjectID,
        });
    Makeup.defineProperty('created_by', {
              type: ObjectID,
            });
    Hair.defineProperty('created_by', {
              type: ObjectID,
            });
    Artistservices.defineProperty('memberId', {
              type: ObjectID,
            });

    DeviceToken.defineProperty('memberId', {
              type: ObjectID,
            });
    Artistservices.defineProperty('subserviceId', {
          type: ObjectID,
        });

    Artistavailability.defineProperty('memberId', {
        type: ObjectID,
      });
    

    Artistvacation.defineProperty('memberId', {
        type: ObjectID,
      });
    
    Artistcourses.defineProperty('memberId', {
        type: ObjectID,
      });
     Artistgcc.defineProperty('artistId', {
        type: ObjectID,
      });
       Artistgcc.defineProperty('gcclocation', {
        type: ObjectID,
      });

     FileStorage.defineProperty('memberId', {
          type: ObjectID,
        });
     FileStorage.defineProperty('created_by', {
          type: ObjectID,
        });
     FileStorage.defineProperty('courseId', {
          type: ObjectID,
        });

     Favorite.defineProperty('userId', {
          type: ObjectID,
        });

     Favorite.defineProperty('memberId', {
          type: ObjectID,
        });

     Booking.defineProperty('artistId', {
          type: ObjectID,
        });
     Booking.defineProperty('courseId', {
          type: ObjectID,
        });
     Booking.defineProperty('userId', {
          type: ObjectID,
        });
     Booking.defineProperty('artistServiceId', {
          type: ObjectID,
        });
     Booking.defineProperty('voucherId', {
          type: ObjectID,
        });
     Voucher.defineProperty('userId', {
          type: ObjectID,
        });
     Voucher.defineProperty('artistId', {
          type: ObjectID,
        }); 
     Voucher.defineProperty('bookingId', {
          type: ObjectID,
        });

     CustomerPoint.defineProperty('userId', {
          type: ObjectID,
        });
     CustomerPoint.defineProperty('artistId', {
          type: ObjectID,
        }); 

     BookingSlot.defineProperty('userId', {
          type: ObjectID,
        });
     BookingSlot.defineProperty('artistId', {
          type: ObjectID,
        }); 
     CustomerPoint.defineProperty('bookingId', {
          type: ObjectID,
        });

     BookingSlot.defineProperty('bookingId', {
          type: ObjectID,
        });
     Booking.defineProperty('cancelledBy', {
          type: ObjectID,
        });
    Fixedcharge.defineProperty('memberId', {
              type: ObjectID,
            });
     Fixedcharge.defineProperty('created_by', {
          type: ObjectID,
        });
FileStorage.defineProperty('memberId', {
          type: ObjectID,
        });
Update.defineProperty('artistId', {
          type: ObjectID,
        });
bookingStatus.defineProperty('artistId', {
          type: ObjectID,
        });


    // Helps to get the include relationship
    RoleMapping.belongsTo(Member);
    Member.hasMany(RoleMapping, {foreignKey: 'principalId'});
    Role.hasMany(Member, {through: RoleMapping, foreignKey: 'roleId'});
  }
  catch (roleCreationErr)
  {
    console.log(roleCreationErr);
    throw roleCreationErr;
  }
};
