'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _debug2 = require('./debug');

var _debug3 = _interopRequireDefault(_debug2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug3.default)();
var warn = function warn(options, message) {
  if (!options.silenceWarnings) {
    console.warn(message);
  }
};
var types = {
  unix: 'number',
  date: Date
};

function defineModelProperty(Model, name, options) {
  var inputConfig = Model.definition.properties[name] || {};
  var inputPostgresConfig = inputConfig.postgresql || {};
  var postgresConfig = _extends({}, {
    // unix timestamp won't fit on an integer
    dataType: options.type === types.unix ? 'bigint' : undefined
  }, inputPostgresConfig);
  var config = _extends({
    type: options.type,
    required: options.required,
    defaultFn: options.type === types.unix ? undefined : 'now',
    default: options.type === types.unix ? Date.now : undefined
  }, inputConfig, { postgresql: postgresConfig, type: options.type });
  Model.defineProperty(name, config);
}

exports.default = function (Model) {
  var bootOptions = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  debug('TimeStamp mixin for Model %s', Model.modelName);

  var options = _extends({
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    required: true,
    type: 'date',
    validateUpsert: false, // default to turning validation off
    silenceWarnings: false
  }, bootOptions);
  options.type = types[options.type];

  debug('options', options);

  if (!options.validateUpsert && Model.settings.validateUpsert) {
    Model.settings.validateUpsert = false;
    warn(options, Model.pluralModelName + ' settings.validateUpsert was overriden to false');
  }

  if (Model.settings.validateUpsert && options.required) {
    warn(options, 'Upserts for ' + Model.pluralModelName + ' will fail when\n          validation is turned on and time stamps are required');
  }

  if (options.createdAt !== false) {
    defineModelProperty(Model, options.createdAt, options);
  }

  if (options.updatedAt !== false) {
    defineModelProperty(Model, options.updatedAt, options);

    Model.observe('before save', function (ctx, next) {
      debug('ctx.options', ctx.options);
      if (ctx.options && ctx.options.skipUpdatedAt) {
        return next();
      }
      if (ctx.instance) {
        debug('%s.%s before save: %s', ctx.Model.modelName, options.updatedAt, ctx.instance.id);
        ctx.instance[options.updatedAt] = options.type === types.unix ? Date.now() : new Date();
      } else {
        debug('%s.%s before update matching %j', ctx.Model.pluralModelName, options.updatedAt, ctx.where);
        ctx.data[options.updatedAt] = options.type === types.unix ? Date.now() : new Date();
      }
      return next();
    });
  }
};

module.exports = exports.default;
//# sourceMappingURL=time-stamp.js.map
