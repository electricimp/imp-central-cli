// MIT License
//
// Copyright 2017 Electric Imp
//
// SPDX-License-Identifier: MIT
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
// OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
// ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
// OTHER DEALINGS IN THE SOFTWARE.

'use strict';

const Util = require('util');
const ImpCentralApiHelper = require('./ImpCentralApiHelper');
const Identifier = require('./Identifier');
const Utils = require('./Utils');

// Helper class for impt list commands.
class ListHelper {

    constructor(entity) {
        this._entity = entity;
        this._nativeFilters = [];
        this._artificialFilters = [];
        this._apiEntities = null;
        this._helper = ImpCentralApiHelper.getEntity();
    }

    processList(filters = null) {
        this._filters = filters === null ? [] : filters;
        return this._initFilters().
            then(() => this._applyNativeFilters()).
            then(() => this._applyAirificialFilters()).
            then(() => this._apiEntities.map(apiEntity => new this._entity._Entity().initByApiEntity(apiEntity)));
    }

    _initFilters() {
        return Promise.all(this._filters.map(filter => filter.init(this._entity))).
            then(() => {
                for (let filter of this._filters) {
                    if (filter._isNative) {
                        this._nativeFilters.push(filter);
                    }
                    else {
                        this._artificialFilters.push(filter);
                    }
                }
            });
    }

    // Returns all possible combinations of native filters
    _getNativeFiltersCombinations(filtersCombinations, filterType, filterValues) {
        if (filterValues.length > 0) {
            const result = [];
            for (let value of filterValues) {
                if (filtersCombinations.length > 0) {
                    for (let filter of filtersCombinations) {
                        const _filter = {};
                        Object.assign(_filter, filter);
                        _filter[filterType] = value;
                        result.push(_filter);
                    }
                }
                else {
                    const _filter = {};
                    _filter[filterType] = value;
                    result.push(_filter);
                }
            }
            return result;
        }
        else {
            return filtersCombinations;
        }
    }

    _applyNativeFilters() {
        if (this._nativeFilters.length > 0) {
            let filtersCombinations = [];
            for (let filter of this._nativeFilters) {
                filtersCombinations = this._getNativeFiltersCombinations(filtersCombinations, filter._filterName, filter._values);
            }
            this._apiEntities = [];
            return Promise.all(filtersCombinations.map(filters => {
                    return this._helper.listEntities(this._entity.entityType, filters);
                })).
                then(results => {
                    this._apiEntities = [].concat.apply([], results);
                });
        }
        else {
            return this._helper.listEntities(this._entity.entityType, null).then(entities => {
                this._apiEntities = entities;
            });
        }
    }

    _applyAirificialFilters() {
        if (this._artificialFilters.length > 0 && this._apiEntities.length > 0) {
            return this._artificialFilters.reduce((filterAcc, filter) => filterAcc.then(() => {
                const filteredEntities = [];
                return this._apiEntities.reduce(
                    (acc, entity) => acc.then(() => {
                        return filter._handler(entity).then((result) => {
                            if (result) {
                                filteredEntities.push(entity);
                            }
                            return Promise.resolve();
                        });
                    }), Promise.resolve()).
                    then(() => {
                        this._apiEntities = filteredEntities
                        return Promise.resolve();
                    });
            }), Promise.resolve());
        }
        else {
            return Promise.resolve();
        }
    }
}

class Filter {
    constructor(isNative, filterName, values = null) {
        this._isNative = isNative;
        this._filterName = filterName;
        this.setValues(values);
    }

    init(entity) {
        return Promise.resolve();
    }

    getValues() {
        return this._values;
    }

    setValues(values) {
        this._values = this._getUniqueValues(values);
    }

    addValues(values) {
        this._values = this._getUniqueValues(this._values, values);
    }

    _getUniqueValues(values1, values2 = null) {
        let values = values1;
        if (values2 !== null) {
            values = values.concat(values2);
        }
        return [...new Set(values)];
    }
}

class DeviceGroupIdFilter extends Filter {
    constructor(filterName, deviceGroupIds, deviceGroupNames) {
        super(true, filterName, deviceGroupIds);
        this._deviceGroupNames = deviceGroupNames;
    }

    init() {
        if (this._deviceGroupNames) {
            return ImpCentralApiHelper.getEntity()._getEntitiesByAttrsValues(Identifier.ENTITY_TYPE.TYPE_DEVICE_GROUP, ['name'], this._deviceGroupNames).
                then(entities => {
                    this.addValues(entities.map(entity => entity.id));
                    return Promise.resolve();
                });
        }
        return Promise.resolve();
    }
}

class DeviceGroupTypeFilter extends Filter {
    constructor(filterName, deviceGroupTypes) {
        super(true, filterName, deviceGroupTypes);
    }
}

class ProductIdFilter extends Filter {
    constructor(filterName, productIds, productNames) {
        super(true, filterName, productIds);
        this._productNames = productNames;
    }

    init() {
        if (this._productNames) {
            return ImpCentralApiHelper.getEntity()._getEntitiesByAttrsValues(Identifier.ENTITY_TYPE.TYPE_PRODUCT, ['name'], this._productNames).
                then(entities => {
                    this.addValues(entities.map(entity => entity.id));
                    return Promise.resolve();
                });
        }
        return Promise.resolve();
    }
}

class OwnerIdFilter extends Filter {
    constructor(filterName, ownerIds, isMy) {
        super(true, filterName, ownerIds);
        this._isMy = isMy;
    }

    init() {
        if (this._isMy) {
            return ImpCentralApiHelper.getEntity().getCurrentAccount().
                then((account) => {
                    this.addValues([account.id]);
                    return Promise.resolve();
                });
        }
        return Promise.resolve();
    }
}

class BuildShaFilter extends Filter {
    constructor(filterName, sha) {
        super(true, filterName, sha);
    }
}

class BuildTagsFilter extends Filter {
    constructor(filterName, tags) {
        super(true, filterName, tags);
    }
}

class BuildFlaggedFilter extends Filter {
    constructor(filterName, flagged) {
        super(true, filterName, [flagged]);
    }
}

class ArtificialFilter extends Filter {
    constructor(handler) {
        super(false);
        this._handler = handler;
    }
}

module.exports = ListHelper;
module.exports.OwnerIdFilter = OwnerIdFilter;
module.exports.ProductIdFilter = ProductIdFilter;
module.exports.DeviceGroupIdFilter = DeviceGroupIdFilter;
module.exports.DeviceGroupTypeFilter = DeviceGroupTypeFilter;
module.exports.ArtificialFilter = ArtificialFilter;
module.exports.BuildShaFilter = BuildShaFilter;
module.exports.BuildTagsFilter = BuildTagsFilter;
module.exports.BuildFlaggedFilter = BuildFlaggedFilter;