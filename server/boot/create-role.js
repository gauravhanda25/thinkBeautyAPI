const debug = require('debug')('loopback:boot:roles');

debug.log = console.log.bind(console);
const app = require('../server.js');
module.exports = async function(app)
{
  try
  {
    // used the models

    const {Role, RoleMapping, Member, DealerAddress, DealerContact, Oem, Brand, Center, MR, AdvertisingAgency, AutoGroup, AutoGroupContact, AgencyContact, Nails, Makeup, Hair, Artistservices, Artistavailability, Artistvacation, Artistcourses, Email, Artistgcc, FileStorage,favorite, Booking, Voucher, CustomerPoint} = app.models;

    // Email.send({
    //           to: 'gaggy_handa@yahoo.com',
    //            from: app.get('email'),
    //            subject : 'Testing email',
    //             html: 'New text to test'
    //         }, (err) =>
    //         {
    //           if (err)
    //           {
    //             return reject(err);
    //           }
    //           // email sent
    //           //return resolve();
    //           console.log('> Email Sent!!')
    //           //next();
    //         });
    // create custom role Admin
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

     FileStorage.defineProperty('memberId', {
          type: ObjectID,
        });
     FileStorage.defineProperty('created_by', {
          type: ObjectID,
        });
     FileStorage.defineProperty('courseId', {
          type: ObjectID,
        });

     favorite.defineProperty('userId', {
          type: ObjectID,
        });

     favorite.defineProperty('memberId', {
          type: ObjectID,
        });

     Booking.defineProperty('artistId', {
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
     CustomerPoint.defineProperty('bookingId', {
          type: ObjectID,
        });
     Booking.defineProperty('cancelledBy', {
          type: ObjectID,
        });


FileStorage.defineProperty('memberId', {
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
