import _debug from './debug';

const debug = _debug();
const warn = (options, message) => {
  if (!options.silenceWarnings) {
    console.warn(message);
  }
};
const types = {
  unix: 'number',
  date: Date,
};

export default (Model, bootOptions = {}) => {
  debug('TimeStamp mixin for Model %s', Model.modelName);

  const options = Object.assign({
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    required: true,
    type: 'date',
    validateUpsert: false, // default to turning validation off
    silenceWarnings: false,
  }, bootOptions);
  options.type = types[options.type];

  debug('options', options);

  if (!options.validateUpsert && Model.settings.validateUpsert) {
    Model.settings.validateUpsert = false;
    warn(options, `${Model.pluralModelName} settings.validateUpsert was overriden to false`);
  }

  if (Model.settings.validateUpsert && options.required) {
    warn(options, `Upserts for ${Model.pluralModelName} will fail when
          validation is turned on and time stamps are required`);
  }

  Model.defineProperty(options.createdAt, {
    type: options.type,
    required: options.required,
    defaultFn: options.type === types.unix ? undefined : 'now',
    default: options.type === types.unix ? Date.now : undefined,
    // unix timestamp won't fit on an integer
    postgresql: options.type === types.unix ? { dataType: 'bigint' } : undefined,
  });

  Model.defineProperty(options.updatedAt, {
    type: options.type,
    required: options.required,
    // unix timestamp won't fit on an integer
    postgresql: options.type === types.unix ? { dataType: 'bigint' } : undefined,
  });

  Model.observe('before save', (ctx, next) => {
    debug('ctx.options', ctx.options);
    if (ctx.options && ctx.options.skipUpdatedAt) { return next(); }
    if (ctx.instance) {
      debug('%s.%s before save: %s', ctx.Model.modelName, options.updatedAt, ctx.instance.id);
      ctx.instance[options.updatedAt] = options.type === types.unix ? Date.now() : new Date();
    } else {
      debug('%s.%s before update matching %j',
            ctx.Model.pluralModelName, options.updatedAt, ctx.where);
      ctx.data[options.updatedAt] = options.type === types.unix ? Date.now() : new Date();
    }
    return next();
  });
};

module.exports = exports.default;
