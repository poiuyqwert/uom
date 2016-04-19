function cacheObj(obj, cacheKey) {
	if (!(cacheKey in obj)) {
		obj[cacheKey] = {};
	}
	return obj[cacheKey];
}

var Value = function(value, unit) {
	this.value = value;
	this.unit = unit;
};
Value.prototype.in = function(toUnit) {
	if (typeof toUnit === 'string') {
		toUnit = this.unit.system.units.getUnit(toUnit);
	}
	if (toUnit.system === this.unit.system) {
		return new Value(this.value * (this.unit.value / toUnit.value), toUnit);
	} else {
		var conversions = this.unit.system.units.conversionSteps(this.unit, toUnit);
		if (conversions) {
			var value = this.value * this.unit.value;
			conversions.forEach(function(conversion) {
				value = conversion.convert(value);
			});
			value /= toUnit.value;
			return new Value(value, toUnit);
		}
		return undefined;
	}
};
Value.prototype.toString = function() {
	return this.value + ' ' + this.unit.toString();
};
Value.prototype.valueOf = function() {
	return this.value;
};
Value.prototype.dividedBy = function(value) {
	if (typeof value === 'number') {
		return new Value(this.value / value, this.unit);
	} else if (value instanceof Value) {
		var unit = CompoundUnit.divide(this.unit, value.unit);
		return new Value(this.value / value.value, unit);
	}
};
Value.prototype.per = function(unit) {
	if (typeof unit === 'string') {
		unit = this.unit.system.units.getUnit(unit);
	}
	unit = CompoundUnit.divide(this.unit, unit);
	return new Value(this.value, unit);
};
Value.prototype.multiplyBy = function(value) {
	if (typeof value === 'number') {
		return new Value(this.value * value, this.unit);
	} else if (value instanceof Value) {
		var leftIsDivide = (this.unit instanceof CompoundUnit && this.unit.operation === CompoundUnit.Operation.Divide);
		var rightIsDivide = (value.unit instanceof CompoundUnit && value.unit.operation === CompoundUnit.Operation.Divide);
		if (leftIsDivide && rightIsDivide) {
			var unit = CompoundUnit.divide(CompoundUnit.multiply(this.unit.leftUnit, value.unit.leftUnit),
									CompoundUnit.multiply(this.unit.rightUnit, value.unit.rightUnit));
		} else if (leftIsDivide || rightIsDivide) {
			if (leftIsDivide) {
				value = value.in(this.unit.rightUnit);
				return new Value(this.value * value.value, this.unit.leftUnit);
			} else if (value.unit instanceof CompoundUnit) {
				value = value.in(this.unit.rightUnit);
				return new Value(this.value * value.value, this.unit.leftUnit);
			}
		} else {
			return new Value(this.value * value.value, CompoundUnit.multiply(this.unit, value.unit));
		}
	}
};

var Unit = function(system, name, value, options) {
	options = options || {};
	console.log('%s %d %s', name, value, JSON.stringify(options));
	this.system = system;
	this.name = name;
	this.aliases = options.aliases || [];
	this.symbols = options.symbols || [];
	this.value = value;
};
Unit.prototype.toString = function() {
	return (this.symbols.length ? this.symbols[0] : this.name);
};
var CompoundUnit = function(leftUnit, operation, rightUnit) {
	this.operation = operation;
	this.leftUnit = leftUnit;
	this.rightUnit = rightUnit;
};
CompoundUnit.Operation = {
	Multiply: '*',
	Divide: '/'
};
CompoundUnit.multiply = function(leftUnit, rightUnit) {
	return new CompoundUnit(leftUnit, CompoundUnit.Operation.Multiply, rightUnit);
};
CompoundUnit.divide = function(leftUnit, rightUnit) {
	return new CompoundUnit(leftUnit, CompoundUnit.Operation.Divide, rightUnit);
};
CompoundUnit.prototype.toString = function() {
	return this.leftUnit.toString() + this.operation + this.rightUnit.toString();
};

var UnitSystem = function(units, name) {
	this.units = units;
	this.name = name;
	this.nameMap = {};
	this.symbolsMap = {};
	this.scales = [];
};
UnitSystem.MetricFactors = [
	{ name: 'yocto',	symbol: 'y',	value: Math.pow(10,-24) },
	{ name: 'zepto',	symbol: 'z',	value: Math.pow(10,-21) },
	{ name: 'atto',		symbol: 'a',	value: Math.pow(10,-18) },
	{ name: 'femto',	symbol: 'f',	value: Math.pow(10,-15) },
	{ name: 'pico',		symbol: 'p',	value: Math.pow(10,-12) },
	{ name: 'nano',		symbol: 'n',	value: Math.pow(10,-9) },
	{ name: 'micro',	symbol: 'μ',	value: Math.pow(10,-6) },
	{ name: 'mili',		symbol: 'm',	value: Math.pow(10,-3) },
	{ name: 'centi',	symbol: 'c',	value: Math.pow(10,-2) },
	{ name: 'deci',		symbol: 'd',	value: Math.pow(10,-1) },
	{ name: '',			symbol: '',		value: Math.pow(10,0) },
	{ name: 'deca',		symbol: 'da',	value: Math.pow(10,1) },
	{ name: 'hecto',	symbol: 'h',	value: Math.pow(10,2) },
	{ name: 'kilo',		symbol: 'k',	value: Math.pow(10,3) },
	{ name: 'mega',		symbol: 'M',	value: Math.pow(10,6) },
	{ name: 'giga',		symbol: 'G',	value: Math.pow(10,9) },
	{ name: 'tera',		symbol: 'T',	value: Math.pow(10,12) },
	{ name: 'peta',		symbol: 'P',	value: Math.pow(10,15) },
	{ name: 'exa',		symbol: 'E',	value: Math.pow(10,18) },
	{ name: 'zeta',		symbol: 'Z',	value: Math.pow(10,21) },
	{ name: 'yotta',	symbol: 'Y',	value: Math.pow(10,24) },
];
UnitSystem.BinaryFactors = [
	{ name: '',			symbol: '',		value: Math.pow(1024,0) },
	{ name: 'kibi',		symbol: 'Ki',	value: Math.pow(1024,1) },
	{ name: 'mebi',		symbol: 'Mi',	value: Math.pow(1024,2) },
	{ name: 'gibi',		symbol: 'Gi',	value: Math.pow(1024,3) },
	{ name: 'tebi',		symbol: 'Ti',	value: Math.pow(1024,4) },
	{ name: 'pebi',		symbol: 'Pi',	value: Math.pow(1024,5) },
	{ name: 'exbi',		symbol: 'Ei',	value: Math.pow(1024,6) },
	{ name: 'zebi',		symbol: 'Zi',	value: Math.pow(1024,7) },
	{ name: 'yobi',		symbol: 'Yi',	value: Math.pow(1024,8) },
];
UnitSystem.prototype.unit = function(name, value, options) {
	options = options || {};
	var unit = new Unit(this, name, value, options);
	this._lastUnit = unit;
	this.nameMap[name] = unit;
	var system = this;
	if (typeof options.aliases !== 'undefined') {
		options.aliases.forEach(function(alias) {
			system.nameMap[alias] = unit;
		});
	}
	if (typeof options.symbols !== 'undefined') {
		options.symbols.forEach(function(symbol) {
			system.symbolsMap[symbol] = unit;
		});
	}
	var i = 0;
	for (; i < this.scales.length; i++) {
		if (this.scales[i].value < value) {
			break;
		}
	}
	this.scales.splice(i, 0, unit);
	return this;
};
UnitSystem.prototype.factors = function(name, factors, options) {
	options = options || {};
	var system = this;
	factors.forEach(function(factor) {
		var opts = {};
		if (typeof options.aliases !== 'undefined') {
			opts.aliases = options.aliases.map(function(alias) {
				return factor.name + alias;
			});
		}
		if (typeof options.symbols !== 'undefined') {
			opts.symbols = options.symbols.map(function(symbol) {
				return factor.symbol + symbol;
			});
		}
		system.unit(factor.name + name, factor.value, opts);
	});
	return this;
};
UnitSystem.prototype.metric = function(name, options) {
	var factors = UnitSystem.MetricFactors;
	options = options || {};
	if (typeof options.minValue === 'undefined' || typeof options.maxValue === 'undefined') {
		if (typeof options.minValue === 'undefined') {
			options.minValue = UnitSystem.MetricFactors[0].value;
		}
		if (typeof options.maxValue === 'undefined') {
			options.maxValue = UnitSystem.MetricFactors[UnitSystem.MetricFactors.length-1].value;
		}
		factors = factors.filter(function(factor) {
			return (factor.value >= options.minValue && factor.value <= options.maxValue);
		});
	}
	this.factors(name, factors, {aliases:options.aliases, symbols:options.symbols});
	return this;
};
UnitSystem.prototype.binary = function(name, options) {
	var factors = UnitSystem.BinaryFactors;
	options = options || {};
	if (typeof options.minValue === 'undefined' || typeof options.maxValue === 'undefined') {
		if (typeof options.minValue === 'undefined') {
			options.minValue = UnitSystem.BinaryFactors[0].value;
		}
		if (typeof options.maxValue === 'undefined') {
			options.maxValue = UnitSystem.BinaryFactors[UnitSystem.BinaryFactors.length-1].value;
		}
		factors = factors.filter(function(factor) {
			return (factor.value >= options.minValue && factor.value <= options.maxValue);
		});
	}
	this.factors(name, factors, {aliases:options.aliases, symbols:options.symbols});
	return this;
};
UnitSystem.prototype.getUnit = function(lookup, nameOnly) {
	if (lookup in this.nameMap) {
		return this.nameMap[lookup];
	}
	if (!nameOnly && lookup in this.symbolsMap) {
		return this.symbolsMap[lookup];
	}
	return undefined;
};

var Conversion = function(units, fromSystem, toSystem, scale) {
	this.units = units;
	this.fromSystem = fromSystem;
	this.toSystem = toSystem;
	this.scale = scale || 1;
};
Conversion.prototype.convert = function(value) {
	if (typeof this.scale === 'function') {
		return this.scale(value);
	} else {
		return value * this.scale;
	}
};

var Units = function() {
	this.systems = {};
	this.conversions = {};
};
Units.prototype.system = function(name) {
	if (!(name in this.systems)) {
		this.systems[name] = new UnitSystem(this, name);
	}
	return this.systems[name];
};
Units.prototype.getSystem = function(name) {
	return this.systems[name];
};
Units.prototype.getUnit = function(lookup, nameOnly) {
	var unit;
	for (var systemName in this.systems) {
		var system = this.systems[systemName];
		unit = system.getUnit(lookup, nameOnly);
		if (unit) {
			break;
		}
	}
	if (!unit && !nameOnly && /[sS]$/.test(lookup)) {
		unit = this.getUnit(lookup.slice(0,-1), true);
	}
	return unit;
};
Units.prototype.conversion = function(fromSystem, toSystem, scale) {
	if (typeof fromSystem === 'string') {
		fromSystem = this.systems[fromSystem];
	}
	if (typeof toSystem === 'string') {
		toSystem = this.systems[toSystem];
	}
	cacheObj(this.conversions, fromSystem.name)[toSystem.name] = new Conversion(this, fromSystem, toSystem, scale);
	cacheObj(this.conversions, toSystem.name)[fromSystem.name] = new Conversion(this, toSystem, fromSystem, 1/scale);
	return this;
};
Units.prototype.conversionSteps = function(fromUnit, toUnit) {
	if (typeof fromUnit === 'string') {
		fromUnit = this.getUnit(fromUnit);
	}
	if (typeof toUnit === 'string') {
		toUnit = this.getUnit(toUnit);
	}
	var units = this;
	var check = function(fromSystem, toSystem) {
		var conversions = units.conversions[fromSystem.name];
		if (conversions) {
			if (conversions[toSystem.name]) {
				return [conversions[toSystem.name]];
			}
			for (var name in conversions) {
				var conversion = conversions[name];
				var result = check(conversion.toSystem, toSystem);
				if (result) {
					return result.unshift(conversion);
				}
			}
		}
		return undefined;
	};
	return check(fromUnit.system, toUnit.system);
};
Units.prototype.isCompatible = function(unit, otherUnit) {
	return (typeof this.conversionSteps(unit, otherUnit) !== 'undefined');
};
Units.prototype.parse = function(value, unit) {
	if (typeof unit === 'undefined' && typeof value === 'string') {
		var match = value.match(/^\s*([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*([a-zA-Z\-\/]+)\s*$/);
		if (match) {
			if (/\.|[eE]-/.test(match[1])) {
				value = parseFloat(match[1]);
			} else {
				value = parseInt(match[1]);
			}
			unit = match[2];
		}
	}
	if (typeof unit === 'string') {
		var _this = this;
		var units = unit.split('/').map(function(name) {
			return _this.getUnit(name);
		});
		while (units.length > 1) {
			var rightUnit = units.pop();
			var leftUnit = units.pop();
			units.push(CompoundUnit.divide(leftUnit, rightUnit));
		}
		unit = units[0];
	}
	return new Value(value, unit);
};

var units = new Units();

units.system('binary bits')
	.binary('bit', {symbols: ['b']});

units.system('binary bytes')
	.binary('byte', {symbols: ['B']});

units.system('decimal bytes')
	.metric('byte', {symbols: ['b'], minValue: 1});

units.conversion('binary bytes', 'binary bits', 8);
units.conversion('binary bytes', 'decimal bytes');

units.system('time')
	.metric('second', {symbols: ['s']})
	.unit('minute'		,60,				 {symbols: ['m']})
	.unit('hour'		,60*60,				 {symbols: ['hr']})
	.unit('day'			,24*60*60,			 {symbols: ['d']})
	.unit('week'		,7*24*60*60,		 {symbols: ['w']})
	.unit('month'		,30*24*60*60,		 {symbols: ['M']})
	.unit('year'		,365*24*60*60,		 {symbols: ['y']})
	.unit('decade'		,3652*30*24*60*60,	 {symbols: ['D']})
	.unit('century'		,36525*30*24*60*60,	 {symbols: ['C']})
	.unit('millennium'	,365250*30*24*60*60, {symbols: ['Mi']});

units.system('length')
	.metric('meter', {symbols: ['m']});

var space = units.parse('10 MiB');
console.log(space.toString());
space = space.in('b');
console.log(space.toString());

var duration = units.parse('2 weeks');
console.log(duration.toString());
duration = duration.in('ms');
console.log(duration.toString());

var distance = units.parse('100 km');
console.log(distance.toString());
duration = units.parse('2 hours');
console.log(duration.toString());

var speed = distance.dividedBy(duration);
console.log(speed.toString());
var same = units.parse('50km').per('hr');
console.log(same.toString());
var simple = units.parse('50km/hr');
console.log(simple.toString());

duration = units.parse('10 hr');
console.log(duration.toString());
distance = speed.multiplyBy(duration);
console.log(distance.toString());

