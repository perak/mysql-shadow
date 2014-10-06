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

	var databaseName = "some_database"; // Your database name

	CreateMySQLConnection(databaseName, {
		host     : 'localhost', // MySQL host address or IP
		user     : 'root', // Username
		password : 'password', // Password
		database : databaseName
	});

	OpenMySQLConnection(databaseName, function(e) {
		if(e) {
			console.log(e.reason);
			return;
		}

		console.log("Connected. Initializing shadow...");

		CreateMySQLShadow(databaseName, {}, function(e) {
			if(e) {
				console.log(e.reason);
				return;
			}

			console.log("Mirror initialized. Creating collections...");

			MySQLShadowSyncAll(databaseName, {}, function(e) {
				if(e) {
					console.log(e.reason);
					return;
				}

				// If you want changes to your collections to be automatically replicated back to MySQL do something like this:
				// MySQLShadowCollection(SomeCollection, databaseName);

				console.log("Success.");
			});
		});
	});

```
**That's it:** now your Mongo database contains collections with data from all tables found in MySQL database.

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
MySQLShadowCollection(SomeCollection, databaseName);
...
```

Now, when you do `SomeCollection.insert(...)`, `SomeCollection.update(...)` or `SomeCollection.remove(...)`, server will execute SQL `INSERT`, `UPDATE` or `DELETE` statement in your MySQL database.


TODO
====

- test it (!)

- inserts, updates and deletes can affect other tables in MySQL database (via triggers). In that case affected records should be cloned back to mongo.

- improve performance
