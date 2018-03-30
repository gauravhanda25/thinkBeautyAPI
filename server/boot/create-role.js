const debug = require('debug')('loopback:boot:roles');

debug.log = console.log.bind(console);
const app = require('../server.js');
module.exports = async function(app)
{
  try
  {
    // used the models

    const {Role, RoleMapping, Member, DealerAddress, DealerContact, Oem, Brand, Center, MR, AdvertisingAgency, AutoGroup, AutoGroupContact, AgencyContact, Nails, Makeup, Hair, Artistservices, Artistavailability, Artistvacation, Artistcourses, Email, Artistgcc, FileStorage} = app.models;

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

     Member.defineProperty('memberId', {
          type: ObjectID,
        });
     Member.defineProperty('created_by', {
          type: ObjectID,
        });

    DealerAddress.defineProperty('country', {
              type: ObjectID,
            });
    DealerAddress.defineProperty('province', {
              type: ObjectID,
            });
    DealerAddress.defineProperty('billcountry', {
              type: ObjectID,
            });
    DealerAddress.defineProperty('billprovince', {
              type: ObjectID,
            });
    DealerContact.defineProperty('dealerId', {
          type: ObjectID,
        });

    AutoGroupContact.defineProperty('autoGroupId', {
          type: ObjectID,
        });

    AgencyContact.defineProperty('advertisingAgencyId', {
          type: ObjectID,
        });
Brand.defineProperty('oemId', {
          type: ObjectID,
        });
Center.defineProperty('oemId', {
          type: ObjectID,
        });
Center.defineProperty('brandId', {
          type: ObjectID,
        });

MR.defineProperty('oemId', {
          type: ObjectID,
        });
MR.defineProperty('brandId', {
          type: ObjectID,
        });
MR.defineProperty('centerId', {
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
