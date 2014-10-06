var mysql = Npm.require("mysql");
var squel = Npm.require("squel");
var Fiber = Npm.require("fibers");

var MySQLConnections = {};

CreateMySQLConnection = function(connectionName, options) {
	var connection = mysql.createConnection(options);
	MySQLConnections[connectionName] = connection;
	return connection;
};

OpenMySQLConnection = function(connectionName, callback) {
	var connection = MySQLConnections[connectionName];
	if(!connection) {
		var err = new Meteor.Error(404, "Unknown connection \"" + connectionName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	connection.connect(function(err) {
		if(err) {
			if(callback) {
				callback(err);
				return;
			} else {
				throw err;
			}
		}

		if(callback) {
			callback();
		}
	});
};

CloseMySQLConnection = function(connectionName, callback) {
	var connection = MySQLConnections[connectionName];
	if(!connection) {
		var err = new Meteor.Error(404, "Unknown connection \"" + connectionName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	connection.end();
};


/*
	Shadow
*/

MySQLShadows = {};

CreateMySQLShadow = function(connectionName, options, callback) {
	var connection = MySQLConnections[connectionName];
	if(!connection) {
		var err = new Meteor.Error(404, "Unknown connection \"" + connectionName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	var schemaName = connection.config.database;
	var showTablesQuery = "SELECT k.TABLE_NAME, k.COLUMN_NAME as PRIMARY_KEY FROM information_schema.table_constraints t LEFT JOIN information_schema.key_column_usage k USING(constraint_name,table_schema,table_name) WHERE t.constraint_type='PRIMARY KEY' AND t.table_schema='" + schemaName + "';";

	var shadow = {
		tables: []
	};

	connection.query(showTablesQuery, function(e, rows) {
		if(e) {
			var err = new Meteor.Error(500, err.message);
			if(callback) {
				callback(err);
				return;
			} else {
				throw err;
			}
		}

		_.each(rows, function(row) {
			shadow.tables.push(row);
		});

		MySQLShadows[connectionName] = shadow;

		if(callback) {
			callback();
		}
	});
};

MySQLShadowSyncTable = function(connectionName, tableName, options, callback) {
	var connection = MySQLConnections[connectionName];
	if(!connection) {
		var err = new Meteor.Error(404, "Unknown connection \"" + connectionName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	var shadow = MySQLShadows[connectionName];
	if(!shadow) {
		var err = new Meteor.Error(404, "Unknown shadow \"" + connectionName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	var table = _.find(shadow.tables, function(table) { return table.TABLE_NAME == tableName; });
	if(!table) {
		var err = new Meteor.Error(404, "Unknown table \"" + tableName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	var tableDataQuery = "SELECT * FROM " + table.TABLE_NAME + ";";
	var tableData = [];
	connection.query(tableDataQuery, function(e, rows) {
		if(e) {
			var err = new Meteor.Error(500, err.message);
			if(callback) {
				callback(err);
				return;
			} else {
				throw err;
			}
		}

		var db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;
		var collection = db.collection(table.TABLE_NAME);

		// upsert complete table from mysql to mongo
		_.each(rows, function(mysqlRow) {
			var selector = {};
			selector[table.PRIMARY_KEY] = mysqlRow[table.PRIMARY_KEY];

			collection.findOne(selector, function(err, mongoRow) {
				if(err) {
					if(callback) {
						callback(err);
						return;
					} else {
						throw err;
					}
				}

				if(!mongoRow) {
					mysqlRow._id = Random.id();
					collection.insert(mysqlRow, function(err, inserted) {
						if(err) {
							if(callback) {
								callback(err);
								return;
							} else {
								throw err;
							}
						}
					});
				} else {
					collection.update(selector, mysqlRow, { upsert: false }, function(err) {
						if(err) {
							if(callback) {
								callback(err);
								return;
							} else {
								throw err;
							}
						}
					});				
				}
			});
		});

		// remove documents from mongo that not exists in mysql
		collection.find({}).each(function(e, doc) {
			if(doc) {
				var mysqlRow = _.find(rows, function(row) { return row[table.PRIMARY_KEY] == doc[table.PRIMARY_KEY]; });
				if(!mysqlRow) {
					var selector = {};
					selector[table.PRIMARY_KEY] = doc[table.PRIMARY_KEY];
					collection.remove(selector, function(err) {
						if(err) {
							if(callback) {
								callback(err);
								return;
							} else {
								throw err;
							}
						}
					});
				}
			} else {
				if(err) {

				}
			}
		});

		if(callback) {
			callback();
		}
	});
}

MySQLShadowSyncAll = function(connectionName, options, callback) {
	var shadow = MySQLShadows[connectionName];
	if(!shadow) {
		var err = new Meteor.Error(404, "Unknown shadow \"" + connectionName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	_.each(shadow.tables, function(table) {
		MySQLShadowSyncTable(connectionName, table.TABLE_NAME, options, function(err) {
			if(err) {
				if(callback) {
					callback(err);
					return;
				} else {
					throw err;
				}
			}
		});
	});

	if(callback) {
		callback();
	}
};


MySQLShadowCollection = function(collection, connectionName, options, callback) {
	var tableName = collection._name;

	var connection = MySQLConnections[connectionName];
	if(!connection) {
		var err = new Meteor.Error(404, "Unknown connection \"" + connectionName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	var shadow = MySQLShadows[connectionName];
	if(!shadow) {
		var err = new Meteor.Error(404, "Unknown shadow \"" + connectionName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	var table = _.find(shadow.tables, function(table) { return table.TABLE_NAME == tableName; });
	if(!table) {
		var err = new Meteor.Error(404, "Unknown table \"" + tableName + "\".");
		if(callback) {
			callback(err);
			return;
		} else {
			throw err;
		}
	}

	// after insert hook
	collection.after.insert(function(userId, doc) {
		var row = JSON.parse(JSON.stringify(doc));

		if(row._id) delete row._id;

		var sql = squel.insert()
			.into(table.TABLE_NAME)
			.setFieldsRows([row])
			.toString();

		// insert
		connection.query(sql, function(err, res) {
			if(err) {
				throw new Meteor.Error(500, err.message);				
			}

			// read new record (record is maybe changed by triggers)
			newRecordSql = "SELECT * FROM " + table.TABLE_NAME + " WHERE " + table.PRIMARY_KEY + " = '" + res.insertId + "';";
			connection.query(newRecordSql, function(err, rows) {
				if(err) {
					throw new Meteor.Error(500, err.message);				
				}

				if(rows.length) {
					var row = rows[0];
					Fiber(function() {
						// update newly inserted mongo doc
						collection.update({ _id: doc._id }, { $set: row });
					}).run();
				}

				// !!! refresh affected tables (by triggers) here

			});
		});
	});

	// befor eupdate - check $set operator
	collection.before.update(function(userId, doc, fieldNames, modifier, options) {
		if(!modifier.$set) {
			throw new Meteor.Error(500, "MySQL collection must be updated using $set operator!");
		}
	});

	// after update hook
	collection.after.update(function(userId, doc, fieldNames, modifier, options) {
		if(modifier.$set[table.PRIMARY_KEY]) {
			// after.insert hook will update entire record (including primary key). In this case we don't want to update record in mysql.
			// NOTE: this is not a best solution (you cannot modify primary key / if you modify primary key record will not be replicated to mysql)
			return;
		}

		var sql = squel.update()
			.table(table.TABLE_NAME)
			.setFields(modifier.$set)
			.toString();

		sql = sql + " WHERE " + table.PRIMARY_KEY + " = '" + doc[table.PRIMARY_KEY] + "';";

		connection.query(sql, function(err) {
			if(err) {
				throw new Meteor.Error(500, err.message);				
			}

			// !!! refresh affected tables (by triggers) here
		});
	});

	// after remove hook
	collection.after.remove(function(userId, doc) {
		var sql = "DELETE FROM " + table.TABLE_NAME + " WHERE " + table.PRIMARY_KEY + " = '" + doc[table.PRIMARY_KEY] + "';";
		connection.query(sql, function(err) {
			if(err) {
				throw new Meteor.Error(500, err.message);				
			}

			// !!! refresh affected tables (by triggers) here
		});
	});

};