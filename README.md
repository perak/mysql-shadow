MySQL Shadow
============

This package allows you to clone MySQL database into your Mongo database. 
Then write your meteor application as you normally do - you are working with mongo database.
Collection inserts/updates/deletes can be automaticaly catched server side, transformed into SQL statements and executed on MySQL server.


Warning!
--------

This is super early prototype so be careful with your MySQL databases: **Don't use this with production database!**


Usage
=====

Do something like this in your server startup code:

```
Meteor.startup(function() {

	var connectionName = "my_connection"; // Name your connection as you wish

	CreateMySQLConnection(connectionName, {
		host     : "localhost", // MySQL host address or IP
		database : "database",   // MySQL database name
		user     : "root",      // MySQL username
		password : "password"  // MySQL password
	});

	OpenMySQLConnection(connectionName, function(e) {
		if(e) {
			console.log("Error: " + e.code + " " + e.reason);
			return;
		}

		console.log("Connected. Initializing shadow...");

		CreateMySQLShadow(connectionName, {}, function(e) {
			if(e) {
				console.log("Error: " + e.code + " " + e.reason);
				return;
			}

			console.log("Shadow initialized. Copying data to mongo...");

			MySQLShadowSyncAll(connectionName, {}, function(e) {
				if(e) {
					console.log("Error: " + e.code + " " + e.reason);
					return;
				}

				// If you want changes to your collections to be automatically replicated back to MySQL do something like this:
				// MySQLShadowCollection(SomeCollection, connectionName, {});

				console.log("Success.");
			});
		});
	});

```
**That's it:** now your Mongo database contains collections with data from all tables found in MySQL database. For each MySQL table you have collection with the same name in your Mongo database.


Declare collections as you normally do:

```
SomeCollection = new Meteor.Collection("customers");
```


Replicate changes back to MySQL
-------------------------------

All inserts/updates/deletes on imported collections can be automatically replicated back to MySQL database. 

To activate this, call `MySQLShadowCollection` for all collections that you want to replicate.
You can do this only after shadow is already created, so best place is to put it into `CreateMySQLShadow` callback:

```
...
MySQLShadowCollection(SomeCollection, connectionName, {});
...
```

Now, when you do `SomeCollection.insert(...)`, `SomeCollection.update(...)` or `SomeCollection.remove(...)`, server will execute SQL `INSERT`, `UPDATE` or `DELETE` statement in your MySQL database.


TODO
====

- test it (!)

- inserts, updates and deletes can affect other tables in MySQL database (via triggers). In that case affected records should be cloned back to mongo.

- improve performance


Version history
===============

1.0.10
------

- Fixed bug (crashing)


1.0.9
-----

- Fixed bug (crashing)


1.0.8
-----

- Fixed bug (crashing)


1.0.7
-----

- Fixed bug with time part in dates (if date object's hour, minute or second was zero, time part was not written)


1.0.6
-----

- If record exists in mongo but doesn't exists in mysql - it's not deleted anymore


1.0.5
-----

- Fixed some minor bugs


1.0.4
-----

- Fixed bug with call to MongoInternals.defaultRemoteCollectionDriver(). Thanks to <a href="https://github.com/xxronis" target="_blank">xxronis</a>.


1.0.3
-----

- Improved SQL statement creation (removed squel, and now it works with dates)
