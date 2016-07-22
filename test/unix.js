var test = require('tap').test;

var path = require('path');
var SIMPLE_APP = path.join(__dirname, 'fixtures', 'simple-app');
var app = require(path.join(SIMPLE_APP, 'server/server.js'));

test('loopback datasource timestamps', function(tap) {
  'use strict';

  var Book = app.models.Book;

  tap.test('createdAt', function(t) {

    t.test('should exist on create', function(tt) {
      Book.destroyAll(function() {
        Book.create({name: 'book 1', type: 'fiction'}, function(err, book) {
          tt.error(err);
          tt.type(book.createdAt, 'number');
          tt.end();
        });
      });
    });

    t.test('should not change on save', function(tt) {
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book) {
          tt.error(err);
          tt.type(book.createdAt, 'number');
          book.name = 'book inf';
          book.save(function(err, b) {
            tt.equal(book.createdAt, b.createdAt);
            tt.end();
          });
        });
      });
    });

    t.test('should not change on update', function(tt) {
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book) {
          tt.error(err);
          tt.type(book.createdAt, 'number');
          book.updateAttributes({ name:'book inf' }, function(err, b) {
            tt.error(err);
            tt.equal(book.createdAt, b.createdAt);
            tt.end();
          });
        });
      });
    });

    t.test('should not change on upsert', function(tt) {
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book) {
          tt.error(err);
          tt.type(book.createdAt, 'number');
          Book.upsert({id: book.id, name:'book inf'}, function(err, b) {
            tt.error(err);
            tt.equal(book.createdAt, b.createdAt);
            tt.end();
          });
        });
      });
    });

    t.test('should not change with bulk updates', function(tt) {
      var createdAt;
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book) {
          tt.error(err);
          tt.type(book.createdAt, 'number');
          Book.updateAll({ type:'fiction' }, { type:'non-fiction' }, function(err) {
            tt.error(err);
            Book.findById(book.id, function(err, b) {
              tt.error(err);
              tt.equal(book.createdAt, b.createdAt);
              tt.end();
            });
          });
        });
      });
    });

    t.end();

  });

  tap.test('updatedAt', function(t) {

    t.test('should exist on create', function(tt) {
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book) {
          tt.error(err);
          tt.type(book.updatedAt, 'number');
          tt.end();
        });
      });
    });

    t.test('should be updated via updateAttributes', function(tt) {
      var updatedAt;
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book) {
          tt.error(err);
          tt.type(book.createdAt, 'number');
          updatedAt = book.updatedAt;

          // ensure we give enough time for the updatedAt value to be different
          setTimeout(function pause() {
            book.updateAttributes({ type:'historical-fiction' }, function(err, b) {
              tt.error(err);
              tt.type(b.createdAt, 'number');
              tt.ok(b.updatedAt > updatedAt);
              tt.end();
            });
          }, 1);
        });
      });
    });

    t.test('should update bulk model updates at once', function(tt) {
      var createdAt1, createdAt2, updatedAt1, updatedAt2;
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book1) {
          tt.error(err);
          createdAt1 = book1.createdAt;
          updatedAt1 = book1.updatedAt;
          setTimeout(function pause1() {
            Book.create({name:'book 2', type:'fiction'}, function(err, book2) {
              tt.error(err);
              createdAt2 = book2.createdAt;
              updatedAt2 = book2.updatedAt;
              tt.ok(updatedAt2 > updatedAt1);
              setTimeout(function pause2() {
                Book.updateAll({ type:'fiction' }, { type:'romance' }, function(err, count) {
                  tt.error(err);
                  tt.equal(createdAt1, book1.createdAt);
                  tt.equal(createdAt2, book2.createdAt);
                  Book.find({ type:'romance' }, function(err, books) {
                    tt.error(err);
                    tt.equal(books.length, 2);
                    books.forEach(function(book) {
                      // because both books were updated in the updateAll call
                      // our updatedAt1 and updatedAt2 dates have to be less than the current
                      tt.ok(updatedAt1 < book.updatedAt);
                      tt.ok(updatedAt2 < book.updatedAt);
                    });
                    tt.end();
                  });
                });
              }, 1);
            });
          }, 1);
        });
      });
    });

    t.end();

  });

  tap.test('boot options', function(t) {

    var dataSource = app.models.Book.getDataSource();

    t.test('should use createdOn and updatedOn instead', function(tt) {

      var Book = dataSource.createModel('Book',
        { name: String, type: String },
        { mixins: {  TimeStamp: { createdAt:'createdOn', updatedAt:'updatedOn', type:'unix' } } }
      );
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book) {
          tt.error(err);

          tt.type(book.createdAt, 'undefined');
          tt.type(book.updatedAt, 'undefined');

          tt.type(book.createdOn, 'number');
          tt.type(book.updatedOn, 'number');

          tt.end();
        });
      });
    });

    t.test('should default required on createdAt and updatedAt ', function(tt) {
      var Book = dataSource.createModel('Book',
        { name: String, type: String },
        { mixins: {  TimeStamp: {type:'unix'} } }
      );
      tt.equal(Book.definition.properties.createdAt.required, true);
      tt.equal(Book.definition.properties.updatedAt.required, true);
      tt.end();
    });

    t.test('should have optional createdAt and updatedAt', function(tt) {
      var Book = dataSource.createModel('Book',
        { name: String, type: String },
        { mixins: {  TimeStamp: { required: false, type:'unix' } } }
      );
      tt.equal(Book.definition.properties.createdAt.required, false);
      tt.equal(Book.definition.properties.updatedAt.required, false);
      tt.end();
    });

    t.test('should turn on validation and upsert fails', function(tt) {

      var Book = dataSource.createModel('Book',
        { name: String, type: String },
        {
          validateUpsert: true,  // set this to true for the Model
          mixins: {  TimeStamp: { validateUpsert: true, type:'unix' } }
        }
      );
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book) {
          tt.error(err);
          // this upsert call should fail because we have turned on validation
          Book.updateOrCreate({id:book.id, type: 'historical-fiction'}, function(err) {
            tt.equal(err.name, 'ValidationError');
            tt.equal(err.details.context, 'Book');
            tt.ok(err.details.codes.createdAt.indexOf('presence') >= 0);
            tt.end();
          });
        });
      });
    });

    t.end();

  });

  tap.test('operation hook options', function(t) {

    t.test('should skip changing updatedAt when option passed', function(tt) {
      Book.destroyAll(function() {
        Book.create({name:'book 1', type:'fiction'}, function(err, book1) {
          tt.error(err);

          tt.type(book1.updatedAt, 'number');

          var book = {id: book1.id, name:'book 2'};

          Book.updateOrCreate(book, {skipUpdatedAt: true}, function(err, book2) {
            tt.error(err);

            console.log(book1.updatedAt, book2.updatedAt);

            tt.type(book2.updatedAt, 'number');
            tt.equal(book1.updatedAt, book2.updatedAt);
            tt.end();
          });

        });
      });
    });

    t.end();

  });

  tap.end();

});
