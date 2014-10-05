Package.describe({
	summary: "Clone MySQL database into Mongo and auto replicate collection changes back to MySQL",
	version: "1.0.0",
	git: "https://github.com/perak/mysql-shadow.git"
});

// Before Meteor 0.9?
if(!Package.onUse) Package.onUse = Package.on_use;

Npm.depends({
	mysql: "2.4.3",
	squel: "3.8.1"
});

Package.onUse(function(api) {
	// Meteor >= 0.9?
	if(api.versionsFrom) api.versionsFrom("METEOR@0.9.0");

	api.use("underscore");
	api.use("matb33:collection-hooks@0.7.6");

	api.add_files("mysql-shadow.js", "server");

	api.export("CreateMySQLConnection", "server");
	api.export("OpenMySQLConnection", "server");
	api.export("CloseMySQLConnection", "server");

	api.export("CreateMySQLShadow", "server");
	api.export("MySQLShadowSyncTable", "server");
	api.export("MySQLShadowSyncAll", "server");
	api.export("MySQLShadowCollection", "server");
});
